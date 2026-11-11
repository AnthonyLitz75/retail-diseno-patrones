package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.Carrito;
import com.grupo.retail.model.CarritoBloqueado;
import com.grupo.retail.model.LineaCarrito;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

/**
 * Acceso a datos del carrito. Las modificaciones las coordina {@code CarritoService} con
 * comandos (patrón Command) dentro de una transacción de {@code EjecutorTransaccion}: estos
 * métodos reciben esa conexión y nunca la confirman ni la cierran.
 */
@Repository
public class CarritoDAO {

    private final ProveedorConexiones proveedorConexiones;

    public CarritoDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    /** Lectura del carrito del cliente; lo crea vacío si todavía no tiene uno activo. */
    public Carrito obtener(Long usuarioId) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            CarritoBloqueado carrito = obtenerOCrearYBloquear(conexion, usuarioId);
            return leerCarrito(conexion, carrito.id(), carrito.revision());
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo consultar el carrito", error);
        }
    }

    /** Devuelve el carrito ACTIVO del cliente (creándolo si hace falta) y bloquea su fila. */
    public CarritoBloqueado obtenerOCrearYBloquear(Connection conexion, Long usuarioId) throws SQLException {
        String sql = """
                INSERT INTO carrito (usuario_id)
                VALUES (?)
                ON CONFLICT (usuario_id) WHERE estado = 'ACTIVO'
                DO UPDATE SET actualizado_en = CURRENT_TIMESTAMP
                RETURNING id_carrito, revision
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("PostgreSQL no devolvió el carrito");
                }
                return new CarritoBloqueado(resultado.getLong("id_carrito"), resultado.getLong("revision"));
            }
        }
    }

    /** Bloquea el carrito ACTIVO existente del cliente (404 si no tiene). */
    public CarritoBloqueado bloquearActivo(Connection conexion, Long usuarioId) throws SQLException {
        String sql = """
                SELECT id_carrito, revision FROM carrito
                WHERE usuario_id = ? AND estado = 'ACTIVO'
                FOR UPDATE
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException("No tienes un carrito activo");
                }
                return new CarritoBloqueado(resultado.getLong("id_carrito"), resultado.getLong("revision"));
            }
        }
    }

    public int leerCantidad(Connection conexion, long carritoId, long productoId) throws SQLException {
        String sql = "SELECT cantidad FROM carrito_detalle WHERE carrito_id = ? AND producto_id = ? FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            consulta.setLong(2, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? resultado.getInt("cantidad") : 0;
            }
        }
    }

    /** Bloquea el producto y devuelve su stock, o vacío si no existe o está inactivo. */
    public Optional<Integer> stockSiActivo(Connection conexion, long productoId) throws SQLException {
        String sql = "SELECT stock FROM producto WHERE id = ? AND activo = TRUE FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(resultado.getInt("stock")) : Optional.empty();
            }
        }
    }

    /** Deja la línea con esa cantidad; 0 la retira del carrito. */
    public void fijarCantidad(Connection conexion, long carritoId, long productoId, int cantidad)
            throws SQLException {
        if (cantidad == 0) {
            try (PreparedStatement consulta = conexion.prepareStatement(
                    "DELETE FROM carrito_detalle WHERE carrito_id = ? AND producto_id = ?")) {
                consulta.setLong(1, carritoId);
                consulta.setLong(2, productoId);
                consulta.executeUpdate();
            }
            return;
        }
        String sql = """
                INSERT INTO carrito_detalle (carrito_id, producto_id, cantidad)
                VALUES (?, ?, ?)
                ON CONFLICT (carrito_id, producto_id)
                DO UPDATE SET cantidad = EXCLUDED.cantidad
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            consulta.setLong(2, productoId);
            consulta.setInt(3, cantidad);
            consulta.executeUpdate();
        }
    }

    /** Cada cambio del carrito, incluido deshacer, incrementa su revisión. */
    public long incrementarRevision(Connection conexion, long carritoId) throws SQLException {
        String sql = """
                UPDATE carrito
                SET revision = revision + 1, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_carrito = ?
                RETURNING revision
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException("No tienes un carrito activo");
                }
                return resultado.getLong("revision");
            }
        }
    }

    public Carrito leerCarrito(Connection conexion, long carritoId, long revision) throws SQLException {
        String sql = """
                SELECT p.id AS producto_id, p.nombre, COALESCE(c.nombre, p.categoria, 'Otros') AS categoria,
                       p.precio, cd.cantidad, p.precio * cd.cantidad AS subtotal, p.stock
                FROM carrito_detalle cd
                JOIN producto p ON p.id = cd.producto_id
                LEFT JOIN categoria c ON c.id_categoria = p.categoria_id
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
        return new Carrito(carritoId, List.copyOf(productos), total, revision);
    }
}
