package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.EstadoReclamo;
import com.grupo.retail.model.Reclamo;
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

/**
 * Persistencia de reclamos (spec 006). Las lecturas de bandeja abren su conexión; las
 * escrituras reciben la conexión de la transacción de {@code ReclamoService} y nunca la
 * confirman ni la cierran.
 */
@Repository
public class ReclamoDAO {

    /** Tope de filas de una bandeja; evita respuestas sin límite. */
    private static final int MAX_FILAS_BANDEJA = 200;

    private static final String COLUMNAS = """
            id_reclamo, pedido_id, cliente_id, soporte_id, admin_id, motivo, descripcion, estado,
            respuesta, motivo_escalamiento, resolucion_admin, creado_en, actualizado_en
            """;

    private final ProveedorConexiones proveedorConexiones;

    public ReclamoDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public Reclamo insertar(Connection conexion, long pedidoId, long clienteId, String motivo, String descripcion)
            throws SQLException {
        String sql = "INSERT INTO reclamo (pedido_id, cliente_id, motivo, descripcion) VALUES (?, ?, ?, ?) RETURNING "
                + COLUMNAS;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            consulta.setLong(2, clienteId);
            consulta.setString(3, motivo);
            consulta.setString(4, descripcion);
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return mapear(fila);
            }
        }
    }

    /** Bloquea el reclamo (FOR UPDATE) para validar y aplicar una transición. */
    public Optional<Reclamo> bloquear(Connection conexion, long idReclamo) throws SQLException {
        String sql = "SELECT " + COLUMNAS + " FROM reclamo WHERE id_reclamo = ? FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, idReclamo);
            try (ResultSet fila = consulta.executeQuery()) {
                return fila.next() ? Optional.of(mapear(fila)) : Optional.empty();
            }
        }
    }

    /** Guarda el estado y los responsables y textos del reclamo ya validado por el servicio. */
    public Reclamo guardar(Connection conexion, Reclamo reclamo) throws SQLException {
        String sql = """
                UPDATE reclamo
                SET estado = ?, soporte_id = ?, admin_id = ?, respuesta = ?, motivo_escalamiento = ?,
                    resolucion_admin = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_reclamo = ?
                RETURNING
                """ + COLUMNAS;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, reclamo.estado().name());
            asignarLong(consulta, 2, reclamo.soporteId());
            asignarLong(consulta, 3, reclamo.adminId());
            consulta.setString(4, reclamo.respuesta());
            consulta.setString(5, reclamo.motivoEscalamiento());
            consulta.setString(6, reclamo.resolucionAdmin());
            consulta.setLong(7, reclamo.id());
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return mapear(fila);
            }
        }
    }

    public List<Reclamo> listarPorCliente(long clienteId) {
        String sql = "SELECT " + COLUMNAS + " FROM reclamo WHERE cliente_id = ? ORDER BY id_reclamo DESC LIMIT ?";
        return listar(sql, clienteId);
    }

    /** Bandeja de Soporte; sin filtro devuelve los reclamos pendientes de cerrar. */
    public List<Reclamo> listarPorEstado(EstadoReclamo estado) {
        if (estado == null) {
            return listar("SELECT " + COLUMNAS + " FROM reclamo WHERE estado <> 'RESUELTO' "
                    + "ORDER BY creado_en LIMIT ?");
        }
        return listar("SELECT " + COLUMNAS + " FROM reclamo WHERE estado = ? ORDER BY creado_en LIMIT ?",
                estado.name());
    }

    private List<Reclamo> listar(String sql, Object... parametros) {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            int indice = 1;
            for (Object parametro : parametros) {
                consulta.setObject(indice++, parametro);
            }
            consulta.setInt(indice, MAX_FILAS_BANDEJA);
            try (ResultSet filas = consulta.executeQuery()) {
                List<Reclamo> reclamos = new ArrayList<>();
                while (filas.next()) {
                    reclamos.add(mapear(filas));
                }
                return List.copyOf(reclamos);
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar los reclamos", error);
        }
    }

    private static void asignarLong(PreparedStatement consulta, int indice, Long valor) throws SQLException {
        if (valor == null) {
            consulta.setNull(indice, Types.BIGINT);
        } else {
            consulta.setLong(indice, valor);
        }
    }

    private static Reclamo mapear(ResultSet fila) throws SQLException {
        return new Reclamo(
                fila.getLong("id_reclamo"),
                fila.getLong("pedido_id"),
                fila.getLong("cliente_id"),
                fila.getObject("soporte_id", Long.class),
                fila.getObject("admin_id", Long.class),
                fila.getString("motivo"),
                fila.getString("descripcion"),
                EstadoReclamo.valueOf(fila.getString("estado")),
                fila.getString("respuesta"),
                fila.getString("motivo_escalamiento"),
                fila.getString("resolucion_admin"),
                fila.getObject("creado_en", OffsetDateTime.class),
                fila.getObject("actualizado_en", OffsetDateTime.class));
    }
}
