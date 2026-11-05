package com.grupo.retail.dao;

import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.Producto;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ProductoDAO {

    private static final String SELECT_PRODUCTOS = """
            SELECT p.id, p.sku, p.nombre, p.marca, COALESCE(c.nombre, p.categoria, 'Otros') AS categoria,
                   p.categoria_id, p.descripcion, p.precio, p.precio_anterior, p.stock,
                   p.nuevo, p.imagen, p.activo
            FROM producto p
            LEFT JOIN categoria c ON c.id_categoria = p.categoria_id
            """;

    private final ProveedorConexiones proveedorConexiones;

    public ProductoDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public List<Producto> listarTodos(
            String nombre,
            String categoria,
            BigDecimal precioMin,
            BigDecimal precioMax) {
        StringBuilder sql = new StringBuilder(SELECT_PRODUCTOS)
                .append(" WHERE p.activo = TRUE AND (c.activa IS NULL OR c.activa = TRUE)");
        List<Object> parametros = new ArrayList<>();

        if (nombre != null && !nombre.isBlank()) {
            sql.append(" AND (p.nombre ILIKE ? OR p.marca ILIKE ? OR p.sku ILIKE ?)");
            String patron = "%" + nombre.trim() + "%";
            parametros.add(patron);
            parametros.add(patron);
            parametros.add(patron);
        }
        if (categoria != null && !categoria.isBlank()) {
            String categoriaLimpia = categoria.trim();
            if ("Otros".equalsIgnoreCase(categoriaLimpia) || "Sin categoría".equalsIgnoreCase(categoriaLimpia)) {
                sql.append(" AND p.categoria_id IS NULL");
            } else {
                sql.append(" AND (c.nombre = ? OR c.categoria_padre_id = (SELECT id_categoria FROM categoria WHERE nombre = ?))");
                parametros.add(categoriaLimpia);
                parametros.add(categoriaLimpia);
            }
        }
        if (precioMin != null) {
            sql.append(" AND p.precio >= ?");
            parametros.add(precioMin);
        }
        if (precioMax != null) {
            sql.append(" AND p.precio <= ?");
            parametros.add(precioMax);
        }
        sql.append(" ORDER BY p.id");

        List<Producto> productos = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql.toString())) {
            for (int i = 0; i < parametros.size(); i++) {
                Object parametro = parametros.get(i);
                if (parametro instanceof BigDecimal decimal) {
                    consulta.setBigDecimal(i + 1, decimal);
                } else {
                    consulta.setString(i + 1, (String) parametro);
                }
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    productos.add(mapearProducto(resultado));
                }
            }
            return productos;
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudieron consultar los productos", error);
        }
    }

    public List<Categoria> listarCategorias() {
        String sql = """
                SELECT id_categoria, nombre, activa, categoria_padre_id
                FROM categoria
                WHERE activa = TRUE
                ORDER BY nombre
                """;
        List<Categoria> categorias = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql);
                ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                categorias.add(new Categoria(
                        resultado.getLong("id_categoria"),
                        resultado.getString("nombre"),
                        resultado.getBoolean("activa"),
                        resultado.getObject("categoria_padre_id", Long.class)));
            }
            return categorias;
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudieron consultar las categorías", error);
        }
    }

    public Optional<Producto> buscarPorId(Long id) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            return buscarPorId(conexion, id);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo buscar el producto", error);
        }
    }

    private Optional<Producto> buscarPorId(Connection conexion, Long id) throws SQLException {
        String sql = SELECT_PRODUCTOS + " WHERE p.id = ? AND p.activo = TRUE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, id);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next()
                        ? Optional.of(mapearProducto(resultado))
                        : Optional.empty();
            }
        }
    }

    public Producto crear(NuevoProducto datos, Long responsableId) {
        String productoSql = """
                INSERT INTO producto (nombre, categoria, categoria_id, precio, stock, activo)
                SELECT ?, c.nombre, c.id_categoria, ?, ?, TRUE
                FROM categoria c
                WHERE c.nombre = ? AND c.activa = TRUE
                RETURNING id, sku, nombre, marca, categoria, categoria_id, descripcion, precio, precio_anterior, stock, nuevo, imagen, activo
                """;
        String movimientoSql = """
                INSERT INTO movimiento_inventario
                    (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id)
                VALUES (?, 'ENTRADA', ?, 'Stock inicial al crear producto', ?)
                """;

        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                Producto creado;
                try (PreparedStatement consulta = conexion.prepareStatement(productoSql)) {
                    consulta.setString(1, datos.nombre().trim());
                    consulta.setBigDecimal(2, datos.precio());
                    consulta.setInt(3, datos.stock());
                    consulta.setString(4, datos.categoria());
                    try (ResultSet resultado = consulta.executeQuery()) {
                        if (!resultado.next()) {
                            throw new IllegalArgumentException(
                                     "La categoría seleccionada no existe o está inactiva");
                        }
                        creado = mapearProducto(resultado);
                    }
                }

                if (datos.stock() > 0) {
                    try (PreparedStatement movimiento = conexion.prepareStatement(movimientoSql)) {
                        movimiento.setLong(1, creado.id());
                        movimiento.setInt(2, datos.stock());
                        movimiento.setLong(3, responsableId);
                        movimiento.executeUpdate();
                    }
                }
                conexion.commit();
                return creado;
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException(
                    "No se pudo crear el producto y registrar su stock inicial", error);
        }
    }

    public Optional<Producto> actualizarPrecio(Long id, BigDecimal precio) {
        String sql = "UPDATE producto SET precio = ? WHERE id = ? AND activo = TRUE";
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setBigDecimal(1, precio);
            consulta.setLong(2, id);
            if (consulta.executeUpdate() == 0) {
                return Optional.empty();
            }
            return buscarPorId(conexion, id);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo actualizar el precio", error);
        }
    }

    public Optional<Producto> actualizarStock(Long id, int nuevoStock, String motivo, Long responsableId) {
        String buscarSql = SELECT_PRODUCTOS
                + " WHERE p.id = ? AND p.activo = TRUE FOR UPDATE OF p";
        String actualizarSql = "UPDATE producto SET stock = ? WHERE id = ?";
        String movimientoSql = """
                INSERT INTO movimiento_inventario
                    (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id)
                VALUES (?, 'AJUSTE', ?, ?, ?)
                """;

        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                Producto actual;
                try (PreparedStatement consulta = conexion.prepareStatement(buscarSql)) {
                    consulta.setLong(1, id);
                    try (ResultSet resultado = consulta.executeQuery()) {
                        if (!resultado.next()) {
                            conexion.rollback();
                            return Optional.empty();
                        }
                        actual = mapearProducto(resultado);
                    }
                }

                int diferencia = nuevoStock - actual.stock();
                if (diferencia == 0) {
                    conexion.commit();
                    return Optional.of(actual);
                }

                try (PreparedStatement actualizacion = conexion.prepareStatement(actualizarSql)) {
                    actualizacion.setInt(1, nuevoStock);
                    actualizacion.setLong(2, id);
                    actualizacion.executeUpdate();
                }
                try (PreparedStatement movimiento = conexion.prepareStatement(movimientoSql)) {
                    movimiento.setLong(1, id);
                    movimiento.setInt(2, diferencia);
                    movimiento.setString(3, motivo);
                    movimiento.setLong(4, responsableId);
                    movimiento.executeUpdate();
                }
                conexion.commit();
                return Optional.of(new Producto(
                        actual.id(), actual.sku(), actual.nombre(), actual.marca(),
                        actual.categoria(), actual.categoriaId(), actual.descripcion(),
                        actual.precio(), actual.precioAnterior(), nuevoStock,
                        actual.nuevo(), actual.imagen(), actual.activo()));
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo ajustar el inventario", error);
        }
    }

    public List<MovimientoInventario> listarMovimientos(Long productoId) {
        String sql = """
                SELECT id, producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id, fecha
                FROM movimiento_inventario
                WHERE producto_id = ?
                ORDER BY id
                """;
        List<MovimientoInventario> movimientos = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    movimientos.add(new MovimientoInventario(
                            resultado.getLong("id"),
                            resultado.getLong("producto_id"),
                            resultado.getString("tipo"),
                            resultado.getInt("cantidad_firmada"),
                            resultado.getString("motivo"),
                            resultado.getObject("usuario_responsable_id", Long.class),
                            resultado.getObject("fecha", OffsetDateTime.class)));
                }
            }
            return movimientos;
        } catch (SQLException error) {
            throw new IllegalStateException(
                    "No se pudo consultar el historial de inventario", error);
        }
    }

    private Producto mapearProducto(ResultSet resultado) throws SQLException {
        return new Producto(
                resultado.getLong("id"),
                resultado.getString("sku"),
                resultado.getString("nombre"),
                resultado.getString("marca"),
                resultado.getString("categoria"),
                resultado.getObject("categoria_id", Long.class),
                resultado.getString("descripcion"),
                resultado.getBigDecimal("precio"),
                resultado.getBigDecimal("precio_anterior"),
                resultado.getInt("stock"),
                resultado.getBoolean("nuevo"),
                resultado.getString("imagen"),
                resultado.getBoolean("activo"));
    }
}
