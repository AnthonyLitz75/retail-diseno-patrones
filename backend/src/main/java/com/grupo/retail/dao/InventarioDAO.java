package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class InventarioDAO {
    private static final String BLOQUEAR_PRODUCTO_ACTIVO = """
            SELECT stock
            FROM producto
            WHERE id = ? AND activo = TRUE
            FOR UPDATE
            """;
    private static final String SUMAR_STOCK = "UPDATE producto SET stock = stock + ? WHERE id = ?";
    private static final String DESCONTAR_STOCK = """
            UPDATE producto
            SET stock = stock - ?
            WHERE id = ? AND activo = TRUE AND stock >= ?
            """;
    private static final String INSERTAR_MOVIMIENTO = """
            INSERT INTO movimiento_inventario
                (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id, pedido_id, devolucion_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id, fecha
            """;

    private final ProveedorConexiones proveedorConexiones;

    public InventarioDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    /** Bloquea un producto activo y devuelve su stock; vacío si no existe o está inactivo. */
    public Optional<Integer> bloquearStockActivo(Connection conexion, long productoId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_PRODUCTO_ACTIVO)) {
            consulta.setLong(1, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(resultado.getInt("stock")) : Optional.empty();
            }
        }
    }

    /** Suma unidades (entrada, reposición o ajuste positivo); {@code false} si el producto no existe. */
    public boolean sumarStock(Connection conexion, long productoId, int cantidad) throws SQLException {
        try (PreparedStatement actualizacion = conexion.prepareStatement(SUMAR_STOCK)) {
            actualizacion.setInt(1, cantidad);
            actualizacion.setLong(2, productoId);
            return actualizacion.executeUpdate() == 1;
        }
    }

    /**
     * Descuenta unidades de un producto activo solo si alcanza el stock; {@code false} si no
     * alcanza o el producto ya no está activo.
     */
    public boolean descontarStock(Connection conexion, long productoId, int cantidad) throws SQLException {
        try (PreparedStatement actualizacion = conexion.prepareStatement(DESCONTAR_STOCK)) {
            actualizacion.setInt(1, cantidad);
            actualizacion.setLong(2, productoId);
            actualizacion.setInt(3, cantidad);
            return actualizacion.executeUpdate() == 1;
        }
    }

    /** Único punto del sistema que escribe en el kardex ({@code movimiento_inventario}). */
    public MovimientoInventario registrarMovimiento(Connection conexion, RegistroMovimiento movimiento)
            throws SQLException {
        try (PreparedStatement insercion = conexion.prepareStatement(INSERTAR_MOVIMIENTO)) {
            insercion.setLong(1, movimiento.productoId());
            insercion.setString(2, movimiento.tipo().name());
            insercion.setInt(3, movimiento.cantidadFirmada());
            insercion.setString(4, movimiento.motivo());
            insercion.setObject(5, movimiento.responsableId(), Types.BIGINT);
            insercion.setObject(6, movimiento.pedidoId(), Types.BIGINT);
            insercion.setObject(7, movimiento.devolucionId(), Types.BIGINT);
            try (ResultSet resultado = insercion.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("No se devolvieron los datos del movimiento creado");
                }
                return new MovimientoInventario(
                        resultado.getLong("id"), movimiento.productoId(), movimiento.tipo().name(),
                        movimiento.cantidadFirmada(), movimiento.motivo(), movimiento.responsableId(),
                        resultado.getObject("fecha", OffsetDateTime.class));
            }
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
            throw new ErrorAccesoDatosException("No se pudo consultar el kardex", error);
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