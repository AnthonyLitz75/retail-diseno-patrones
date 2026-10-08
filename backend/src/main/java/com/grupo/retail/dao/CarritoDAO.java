package com.grupo.retail.dao;

import com.grupo.retail.model.Carrito;
import com.grupo.retail.model.LineaCarrito;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Repository
public class CarritoDAO {

    private final DataSource dataSource;

    public CarritoDAO(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Carrito obtener(Long usuarioId) {
        try (Connection conexion = dataSource.getConnection()) {
            long carritoId = obtenerOCrearCarrito(conexion, usuarioId);
            return leerCarrito(conexion, carritoId);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo consultar el carrito", error);
        }
    }

    public Carrito agregar(Long usuarioId, Long productoId, int cantidad) {
        try (Connection conexion = dataSource.getConnection()) {
            conexion.setAutoCommit(false);
            try {
                long carritoId = obtenerOCrearCarrito(conexion, usuarioId);
                int stock = bloquearYLeerStock(conexion, productoId);
                int cantidadActual = leerCantidad(conexion, carritoId, productoId);
                int cantidadNueva = Math.addExact(cantidadActual, cantidad);
                validarStock(cantidadNueva, stock);

                String sql = """
                        INSERT INTO carrito_detalle (carrito_id, producto_id, cantidad)
                        VALUES (?, ?, ?)
                        ON CONFLICT (carrito_id, producto_id)
                        DO UPDATE SET cantidad = EXCLUDED.cantidad
                        """;
                try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
                    consulta.setLong(1, carritoId);
                    consulta.setLong(2, productoId);
                    consulta.setInt(3, cantidadNueva);
                    consulta.executeUpdate();
                }
                actualizarFecha(conexion, carritoId);
                conexion.commit();
                return leerCarrito(conexion, carritoId);
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo agregar el producto al carrito", error);
        }
    }

    public Carrito actualizarCantidad(Long usuarioId, Long productoId, int cantidad) {
        try (Connection conexion = dataSource.getConnection()) {
            conexion.setAutoCommit(false);
            try {
                long carritoId = buscarCarritoActivo(conexion, usuarioId);
                int stock = bloquearYLeerStock(conexion, productoId);
                validarStock(cantidad, stock);

                String sql = """
                        UPDATE carrito_detalle
                        SET cantidad = ?
                        WHERE carrito_id = ? AND producto_id = ?
                        """;
                try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
                    consulta.setInt(1, cantidad);
                    consulta.setLong(2, carritoId);
                    consulta.setLong(3, productoId);
                    if (consulta.executeUpdate() == 0) {
                        throw new NoSuchElementException("El producto no está en tu carrito");
                    }
                }
                actualizarFecha(conexion, carritoId);
                conexion.commit();
                return leerCarrito(conexion, carritoId);
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo actualizar el carrito", error);
        }
    }

    public void quitar(Long usuarioId, Long productoId) {
        try (Connection conexion = dataSource.getConnection()) {
            conexion.setAutoCommit(false);
            try {
                long carritoId = buscarCarritoActivo(conexion, usuarioId);
                try (PreparedStatement consulta = conexion.prepareStatement(
                        "DELETE FROM carrito_detalle WHERE carrito_id = ? AND producto_id = ?")) {
                    consulta.setLong(1, carritoId);
                    consulta.setLong(2, productoId);
                    if (consulta.executeUpdate() == 0) {
                        throw new NoSuchElementException("El producto no está en tu carrito");
                    }
                }
                actualizarFecha(conexion, carritoId);
                conexion.commit();
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo quitar el producto del carrito", error);
        }
    }

    private long obtenerOCrearCarrito(Connection conexion, Long usuarioId) throws SQLException {
        String sql = """
                INSERT INTO carrito (usuario_id)
                VALUES (?)
                ON CONFLICT (usuario_id) WHERE estado = 'ACTIVO'
                DO UPDATE SET actualizado_en = CURRENT_TIMESTAMP
                RETURNING id_carrito
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("PostgreSQL no devolvió el carrito");
                }
                return resultado.getLong("id_carrito");
            }
        }
    }

    private long buscarCarritoActivo(Connection conexion, Long usuarioId) throws SQLException {
        String sql = "SELECT id_carrito FROM carrito WHERE usuario_id = ? AND estado = 'ACTIVO' FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException("No tienes un carrito activo");
                }
                return resultado.getLong("id_carrito");
            }
        }
    }

    private int bloquearYLeerStock(Connection conexion, Long productoId) throws SQLException {
        String sql = "SELECT stock FROM producto WHERE id = ? AND activo = TRUE FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException("El producto no existe o está inactivo");
                }
                return resultado.getInt("stock");
            }
        }
    }

    private int leerCantidad(Connection conexion, long carritoId, long productoId)
            throws SQLException {
        String sql = "SELECT cantidad FROM carrito_detalle WHERE carrito_id = ? AND producto_id = ? FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            consulta.setLong(2, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? resultado.getInt("cantidad") : 0;
            }
        }
    }

    private void validarStock(int cantidad, int stock) {
        if (cantidad > stock) {
            throw new IllegalArgumentException(
                    "La cantidad solicitada supera el stock disponible (" + stock + ")");
        }
    }

    private void actualizarFecha(Connection conexion, long carritoId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "UPDATE carrito SET actualizado_en = CURRENT_TIMESTAMP WHERE id_carrito = ?")) {
            consulta.setLong(1, carritoId);
            consulta.executeUpdate();
        }
    }

    private Carrito leerCarrito(Connection conexion, long carritoId) throws SQLException {
        String sql = """
                SELECT p.id AS producto_id, p.nombre, c.nombre AS categoria,
                       p.precio, cd.cantidad, p.precio * cd.cantidad AS subtotal, p.stock
                FROM carrito_detalle cd
                JOIN producto p ON p.id = cd.producto_id
                JOIN categoria c ON c.id_categoria = p.categoria_id
                WHERE cd.carrito_id = ?
                ORDER BY p.nombre
                """;
        List<LineaCarrito> productos = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    BigDecimal subtotal = resultado.getBigDecimal("subtotal");
                    productos.add(new LineaCarrito(
                            resultado.getLong("producto_id"),
                            resultado.getString("nombre"),
                            resultado.getString("categoria"),
                            resultado.getBigDecimal("precio"),
                            resultado.getInt("cantidad"),
                            subtotal,
                            resultado.getInt("stock")));
                    total = total.add(subtotal);
                }
            }
        }
        return new Carrito(carritoId, List.copyOf(productos), total);
    }
}