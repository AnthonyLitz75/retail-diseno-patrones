package com.grupo.retail.dao;

import com.grupo.retail.dto.LineaEntradaInventario;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;

@Repository
public class InventarioDAO {
    private static final String BLOQUEAR_PRODUCTO = """
            SELECT id, stock
            FROM producto
            WHERE id = ? AND activo = TRUE
            FOR UPDATE
            """;
    private static final String ACTUALIZAR_STOCK = """
            UPDATE producto
            SET stock = stock + ?
            WHERE id = ? AND activo = TRUE
            """;
    private static final String INSERTAR_MOVIMIENTO = """
            INSERT INTO movimiento_inventario
                (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id)
            VALUES (?, 'ENTRADA', ?, ?, ?)
            RETURNING id, fecha
            """;

    private final ProveedorConexiones proveedorConexiones;

    public InventarioDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public List<MovimientoInventario> registrarEntradas(
            List<LineaEntradaInventario> productos, String motivo, Long responsableId) {
        List<LineaEntradaInventario> ordenadas = productos.stream()
                .sorted(Comparator.comparing(LineaEntradaInventario::productoId))
                .toList();
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                for (LineaEntradaInventario linea : ordenadas) {
                    int stockActual = bloquearProducto(conexion, linea.productoId());
                    try {
                        Math.addExact(stockActual, linea.cantidad());
                    } catch (ArithmeticException error) {
                        throw new IllegalArgumentException(
                                "La entrada supera el stock máximo permitido", error);
                    }
                }

                List<MovimientoInventario> movimientos = new ArrayList<>();
                for (LineaEntradaInventario linea : ordenadas) {
                    actualizarStock(conexion, linea);
                    movimientos.add(insertarMovimiento(conexion, linea, motivo, responsableId));
                }
                conexion.commit();
                return List.copyOf(movimientos);
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudieron registrar las entradas de inventario", error);
        }
    }

    public List<MovimientoInventario> listarMovimientos(
            Long productoId, OffsetDateTime desde, OffsetDateTime hasta) {
        StringBuilder sql = new StringBuilder("""
                SELECT id, producto_id, tipo, cantidad_firmada, motivo,
                       usuario_responsable_id, fecha
                FROM movimiento_inventario
                WHERE 1 = 1
                """);
        List<Object> parametros = new ArrayList<>();
        if (productoId != null) {
            sql.append(" AND producto_id = ?");
            parametros.add(productoId);
        }
        if (desde != null) {
            sql.append(" AND fecha >= ?");
            parametros.add(desde);
        }
        if (hasta != null) {
            sql.append(" AND fecha <= ?");
            parametros.add(hasta);
        }
        sql.append(" ORDER BY fecha, id");

        List<MovimientoInventario> movimientos = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql.toString())) {
            for (int i = 0; i < parametros.size(); i++) {
                Object parametro = parametros.get(i);
                if (parametro instanceof Long id) {
                    consulta.setLong(i + 1, id);
                } else {
                    consulta.setObject(i + 1, parametro);
                }
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    movimientos.add(mapearMovimiento(resultado));
                }
            }
            return List.copyOf(movimientos);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo consultar el kardex", error);
        }
    }

    private int bloquearProducto(Connection conexion, Long productoId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_PRODUCTO)) {
            consulta.setLong(1, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException(
                            "No existe un producto activo con ID " + productoId);
                }
                return resultado.getInt("stock");
            }
        }
    }

    private void actualizarStock(Connection conexion, LineaEntradaInventario linea)
            throws SQLException {
        try (PreparedStatement actualizacion = conexion.prepareStatement(ACTUALIZAR_STOCK)) {
            actualizacion.setInt(1, linea.cantidad());
            actualizacion.setLong(2, linea.productoId());
            if (actualizacion.executeUpdate() != 1) {
                throw new NoSuchElementException(
                        "No existe un producto activo con ID " + linea.productoId());
            }
        }
    }

    private MovimientoInventario insertarMovimiento(
            Connection conexion, LineaEntradaInventario linea, String motivo, Long responsableId)
            throws SQLException {
        try (PreparedStatement insercion = conexion.prepareStatement(INSERTAR_MOVIMIENTO)) {
            insercion.setLong(1, linea.productoId());
            insercion.setInt(2, linea.cantidad());
            insercion.setString(3, motivo.strip());
            insercion.setLong(4, responsableId);
            try (ResultSet resultado = insercion.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("No se devolvieron los datos del movimiento creado");
                }
                return new MovimientoInventario(
                        resultado.getLong("id"), linea.productoId(), "ENTRADA",
                        linea.cantidad(), motivo.strip(), responsableId,
                        resultado.getObject("fecha", OffsetDateTime.class));
            }
        }
    }

    private MovimientoInventario mapearMovimiento(ResultSet resultado) throws SQLException {
        return new MovimientoInventario(
                resultado.getLong("id"),
                resultado.getLong("producto_id"),
                resultado.getString("tipo"),
                resultado.getInt("cantidad_firmada"),
                resultado.getString("motivo"),
                resultado.getObject("usuario_responsable_id", Long.class),
                resultado.getObject("fecha", OffsetDateTime.class));
    }
}