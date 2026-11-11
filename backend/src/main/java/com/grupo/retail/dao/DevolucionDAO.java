package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.DetalleDevolucion;
import com.grupo.retail.model.Devolucion;
import com.grupo.retail.model.EstadoDevolucion;
import com.grupo.retail.model.LineaDevolvible;
import com.grupo.retail.model.PagoReembolsable;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Persistencia de devoluciones (spec 006, RF14, RF25 y RF26). Las escrituras reciben la
 * conexión de la transacción de {@code DevolucionService} y nunca la confirman ni la
 * cierran; las bandejas abren su propia conexión de solo lectura.
 */
@Repository
public class DevolucionDAO {

    private static final int MAX_FILAS_BANDEJA = 200;

    private static final String COLUMNAS = """
            id_devolucion, pedido_id, cliente_id, soporte_id, motivo, estado, observacion,
            importe_reembolso, creado_en, actualizado_en, fecha_cierre
            """;

    private static final String DETALLES_SQL = """
            SELECT dd.id_detalle_devolucion, dd.devolucion_id, dd.pedido_detalle_id, dd.producto_id,
                   pd.nombre_producto, dd.cantidad, dd.reintegrar_stock,
                   dd.precio_unitario_historico, dd.subtotal_reembolso
            FROM detalle_devolucion dd
            JOIN pedido_detalle pd ON pd.id_detalle = dd.pedido_detalle_id
            WHERE dd.devolucion_id = ANY (?)
            ORDER BY dd.devolucion_id, dd.id_detalle_devolucion
            """;

    private final ProveedorConexiones proveedorConexiones;

    public DevolucionDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    /**
     * Líneas del pedido con lo comprometido en devoluciones que no fueron rechazadas. El
     * llamador ya bloqueó el pedido, de modo que dos solicitudes simultáneas se serializan
     * y la segunda lee lo que la primera confirmó (FR-003).
     */
    public Map<Long, LineaDevolvible> lineasDevolvibles(Connection conexion, long pedidoId) throws SQLException {
        String sql = """
                SELECT pd.id_detalle, pd.producto_id, pd.cantidad, pd.precio_unitario,
                       COALESCE((SELECT SUM(dd.cantidad)
                                 FROM detalle_devolucion dd
                                 JOIN devolucion d ON d.id_devolucion = dd.devolucion_id
                                 WHERE dd.pedido_detalle_id = pd.id_detalle
                                   AND d.estado <> 'RECHAZADA'), 0) AS comprometida
                FROM pedido_detalle pd
                WHERE pd.pedido_id = ?
                ORDER BY pd.id_detalle
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet filas = consulta.executeQuery()) {
                Map<Long, LineaDevolvible> lineas = new LinkedHashMap<>();
                while (filas.next()) {
                    LineaDevolvible linea = new LineaDevolvible(
                            filas.getLong("id_detalle"),
                            filas.getLong("producto_id"),
                            filas.getInt("cantidad"),
                            filas.getInt("comprometida"),
                            filas.getBigDecimal("precio_unitario"));
                    lineas.put(linea.pedidoDetalleId(), linea);
                }
                return lineas;
            }
        }
    }

    public long insertar(Connection conexion, long pedidoId, long clienteId, String motivo, BigDecimal importe)
            throws SQLException {
        String sql = """
                INSERT INTO devolucion (pedido_id, cliente_id, motivo, importe_reembolso)
                VALUES (?, ?, ?, ?)
                RETURNING id_devolucion
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            consulta.setLong(2, clienteId);
            consulta.setString(3, motivo);
            consulta.setBigDecimal(4, importe);
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return fila.getLong(1);
            }
        }
    }

    public void insertarDetalle(Connection conexion, long devolucionId, LineaDevolvible linea, int cantidad)
            throws SQLException {
        String sql = """
                INSERT INTO detalle_devolucion
                    (devolucion_id, pedido_detalle_id, producto_id, cantidad, precio_unitario_historico)
                VALUES (?, ?, ?, ?, ?)
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, devolucionId);
            consulta.setLong(2, linea.pedidoDetalleId());
            consulta.setLong(3, linea.productoId());
            consulta.setInt(4, cantidad);
            consulta.setBigDecimal(5, linea.precioUnitario());
            consulta.executeUpdate();
        }
    }

    /** Bloquea la devolución (FOR UPDATE) y devuelve sus líneas, para validar una transición. */
    public Optional<Devolucion> bloquear(Connection conexion, long devolucionId) throws SQLException {
        String sql = "SELECT " + COLUMNAS + " FROM devolucion WHERE id_devolucion = ? FOR UPDATE";
        Devolucion devolucion;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, devolucionId);
            try (ResultSet fila = consulta.executeQuery()) {
                if (!fila.next()) {
                    return Optional.empty();
                }
                devolucion = mapear(fila);
            }
        }
        return Optional.of(conLineas(conexion, List.of(devolucion)).getFirst());
    }

    public Devolucion buscar(Connection conexion, long devolucionId) throws SQLException {
        String sql = "SELECT " + COLUMNAS + " FROM devolucion WHERE id_devolucion = ?";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, devolucionId);
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return conLineas(conexion, List.of(mapear(fila))).getFirst();
            }
        }
    }

    /** RF25: guarda la decisión de Soporte (APROBADA o RECHAZADA) y su responsable. */
    public void registrarDecision(Connection conexion, long devolucionId, EstadoDevolucion estado,
            long soporteId, String observacion) throws SQLException {
        String sql = """
                UPDATE devolucion
                SET estado = ?, soporte_id = ?, observacion = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_devolucion = ?
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, estado.name());
            consulta.setLong(2, soporteId);
            consulta.setString(3, observacion);
            consulta.setLong(4, devolucionId);
            consulta.executeUpdate();
        }
    }

    public void marcarReintegro(Connection conexion, long detalleDevolucionId, boolean reintegrar)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "UPDATE detalle_devolucion SET reintegrar_stock = ? WHERE id_detalle_devolucion = ?")) {
            consulta.setBoolean(1, reintegrar);
            consulta.setLong(2, detalleDevolucionId);
            consulta.executeUpdate();
        }
    }

    /**
     * Repone las unidades aptas y deja el movimiento DEVOLUCION con su trazabilidad. El
     * servicio llama en orden ascendente de producto para no cruzar bloqueos con compras.
     */
    public void reponerStock(Connection conexion, long productoId, int cantidad, long responsableId,
            long pedidoId, long devolucionId) throws SQLException {
        try (PreparedStatement reponer = conexion.prepareStatement(
                "UPDATE producto SET stock = stock + ? WHERE id = ?")) {
            reponer.setInt(1, cantidad);
            reponer.setLong(2, productoId);
            reponer.executeUpdate();
        }
        String movimientoSql = """
                INSERT INTO movimiento_inventario
                    (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id, pedido_id, devolucion_id)
                VALUES (?, 'DEVOLUCION', ?, ?, ?, ?, ?)
                """;
        try (PreparedStatement movimiento = conexion.prepareStatement(movimientoSql)) {
            movimiento.setLong(1, productoId);
            movimiento.setInt(2, cantidad);
            movimiento.setString(3, "Devolución #" + devolucionId + " del pedido #" + pedidoId);
            movimiento.setLong(4, responsableId);
            movimiento.setLong(5, pedidoId);
            movimiento.setLong(6, devolucionId);
            movimiento.executeUpdate();
        }
    }

    /** Bloquea el cobro APROBADO del pedido para acumular el reembolso sin carreras. */
    public Optional<PagoReembolsable> bloquearPagoAprobado(Connection conexion, long pedidoId) throws SQLException {
        String sql = """
                SELECT id_pago, monto, monto_reembolsado, referencia
                FROM pago
                WHERE pedido_id = ? AND estado = 'APROBADO'
                FOR UPDATE
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet fila = consulta.executeQuery()) {
                if (!fila.next()) {
                    return Optional.empty();
                }
                return Optional.of(new PagoReembolsable(fila.getLong("id_pago"), fila.getBigDecimal("monto"),
                        fila.getBigDecimal("monto_reembolsado"), fila.getString("referencia")));
            }
        }
    }

    public void acumularReembolso(Connection conexion, long pagoId, BigDecimal importe) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "UPDATE pago SET monto_reembolsado = monto_reembolsado + ? WHERE id_pago = ?")) {
            consulta.setBigDecimal(1, importe);
            consulta.setLong(2, pagoId);
            consulta.executeUpdate();
        }
    }

    public void cerrar(Connection conexion, long devolucionId, long soporteId, BigDecimal importe)
            throws SQLException {
        String sql = """
                UPDATE devolucion
                SET estado = 'CERRADA', soporte_id = ?, importe_reembolso = ?,
                    fecha_cierre = CURRENT_TIMESTAMP, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_devolucion = ?
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, soporteId);
            consulta.setBigDecimal(2, importe);
            consulta.setLong(3, devolucionId);
            consulta.executeUpdate();
        }
    }

    public List<Devolucion> listarPorCliente(long clienteId) {
        return listar("SELECT " + COLUMNAS + " FROM devolucion WHERE cliente_id = ? "
                + "ORDER BY id_devolucion DESC LIMIT ?", clienteId);
    }

    /** Bandeja de Soporte; sin filtro devuelve las devoluciones por decidir o recibir. */
    public List<Devolucion> listarPorEstado(EstadoDevolucion estado) {
        if (estado == null) {
            return listar("SELECT " + COLUMNAS + " FROM devolucion WHERE estado IN ('SOLICITADA', 'APROBADA') "
                    + "ORDER BY creado_en LIMIT ?");
        }
        return listar("SELECT " + COLUMNAS + " FROM devolucion WHERE estado = ? ORDER BY creado_en LIMIT ?",
                estado.name());
    }

    private List<Devolucion> listar(String sql, Object... parametros) {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            int indice = 1;
            for (Object parametro : parametros) {
                consulta.setObject(indice++, parametro);
            }
            consulta.setInt(indice, MAX_FILAS_BANDEJA);
            List<Devolucion> devoluciones = new ArrayList<>();
            try (ResultSet filas = consulta.executeQuery()) {
                while (filas.next()) {
                    devoluciones.add(mapear(filas));
                }
            }
            return conLineas(conexion, devoluciones);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar las devoluciones", error);
        }
    }

    /** Carga las líneas de varias devoluciones en una sola consulta. */
    private static List<Devolucion> conLineas(Connection conexion, List<Devolucion> devoluciones)
            throws SQLException {
        if (devoluciones.isEmpty()) {
            return List.of();
        }
        Long[] ids = devoluciones.stream().map(Devolucion::id).toArray(Long[]::new);
        Map<Long, List<DetalleDevolucion>> porDevolucion = new LinkedHashMap<>();
        try (PreparedStatement consulta = conexion.prepareStatement(DETALLES_SQL)) {
            Array arreglo = conexion.createArrayOf("bigint", ids);
            consulta.setArray(1, arreglo);
            try (ResultSet filas = consulta.executeQuery()) {
                while (filas.next()) {
                    porDevolucion.computeIfAbsent(filas.getLong("devolucion_id"), id -> new ArrayList<>())
                            .add(new DetalleDevolucion(
                                    filas.getLong("id_detalle_devolucion"),
                                    filas.getLong("pedido_detalle_id"),
                                    filas.getLong("producto_id"),
                                    filas.getString("nombre_producto"),
                                    filas.getInt("cantidad"),
                                    filas.getBoolean("reintegrar_stock"),
                                    filas.getBigDecimal("precio_unitario_historico"),
                                    filas.getBigDecimal("subtotal_reembolso")));
                }
            } finally {
                arreglo.free();
            }
        }
        return devoluciones.stream()
                .map(d -> d.conLineas(porDevolucion.getOrDefault(d.id(), List.of())))
                .toList();
    }

    private static Devolucion mapear(ResultSet fila) throws SQLException {
        return new Devolucion(
                fila.getLong("id_devolucion"),
                fila.getLong("pedido_id"),
                fila.getLong("cliente_id"),
                fila.getObject("soporte_id", Long.class),
                fila.getString("motivo"),
                EstadoDevolucion.valueOf(fila.getString("estado")),
                fila.getString("observacion"),
                fila.getBigDecimal("importe_reembolso"),
                fila.getObject("creado_en", OffsetDateTime.class),
                fila.getObject("actualizado_en", OffsetDateTime.class),
                fila.getObject("fecha_cierre", OffsetDateTime.class),
                List.of());
    }
}
