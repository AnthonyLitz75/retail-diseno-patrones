package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.RangoFechas;
import com.grupo.retail.model.RegistroAuditoria;
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

/**
 * Registro de auditoría (tabla {@code registro_auditoria}, migración V4). Todo el SQL es
 * constante; los filtros opcionales van como parámetros y un parámetro nulo desactiva su
 * condición.
 */
@Repository
public class AuditoriaDAO {

    /**
     * Si el evento no trae correo o rol, se copian de la cuenta en este momento: el registro
     * conserva quién era el actor aunque después cambie su rol o se desactive.
     */
    private static final String INSERTAR_SQL = """
            INSERT INTO registro_auditoria
                (usuario_id, usuario_correo, rol, accion, entidad, entidad_id, detalle)
            VALUES (?,
                    COALESCE(?, (SELECT correo FROM usuario WHERE id_usuario = ?)),
                    COALESCE(?, (SELECT rol FROM usuario WHERE id_usuario = ?)),
                    ?, ?, ?, ?)
            """;

    private static final String FILTROS = """
            FROM registro_auditoria ra
            LEFT JOIN usuario u ON u.id_usuario = ra.usuario_id
            WHERE ra.fecha >= COALESCE(CAST(? AS timestamptz), '-infinity'::timestamptz)
              AND ra.fecha <= COALESCE(CAST(? AS timestamptz), 'infinity'::timestamptz)
              AND (CAST(? AS varchar) IS NULL OR ra.accion = CAST(? AS varchar))
              AND (CAST(? AS varchar) IS NULL
                   OR ra.usuario_correo ILIKE CAST(? AS varchar) ESCAPE '\\'
                   OR u.nombre ILIKE CAST(? AS varchar) ESCAPE '\\')
            """;

    private static final String BUSCAR_SQL = """
            SELECT ra.id_auditoria, ra.fecha, ra.usuario_id, u.nombre AS usuario_nombre,
                   ra.usuario_correo, ra.rol, ra.accion, ra.entidad, ra.entidad_id, ra.detalle
            """ + FILTROS + """
            ORDER BY ra.fecha DESC, ra.id_auditoria DESC
            LIMIT ? OFFSET ?
            """;

    private static final String CONTAR_SQL = "SELECT COUNT(*) " + FILTROS;

    private final ProveedorConexiones proveedorConexiones;

    public AuditoriaDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    /** Escribe el registro con la conexión del caso de uso (misma transacción). */
    public void insertar(Connection conexion, EventoAuditoria evento) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(INSERTAR_SQL)) {
            consulta.setObject(1, evento.usuarioId(), Types.BIGINT);
            consulta.setString(2, evento.usuarioCorreo());
            consulta.setObject(3, evento.usuarioId(), Types.BIGINT);
            consulta.setString(4, evento.rol());
            consulta.setObject(5, evento.usuarioId(), Types.BIGINT);
            consulta.setString(6, evento.accion().name());
            consulta.setString(7, evento.entidad());
            consulta.setObject(8, evento.entidadId(), Types.BIGINT);
            consulta.setString(9, evento.detalle());
            consulta.executeUpdate();
        }
    }

    public List<RegistroAuditoria> buscar(RangoFechas rango, AccionAuditoria accion, String usuario,
            int limite, int desplazamiento) {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(BUSCAR_SQL)) {
            int siguiente = asignarFiltros(consulta, rango, accion, usuario);
            consulta.setInt(siguiente, limite);
            consulta.setInt(siguiente + 1, desplazamiento);
            List<RegistroAuditoria> registros = new ArrayList<>();
            try (ResultSet fila = consulta.executeQuery()) {
                while (fila.next()) {
                    registros.add(mapear(fila));
                }
            }
            return registros;
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo consultar la auditoría", error);
        }
    }

    public long contar(RangoFechas rango, AccionAuditoria accion, String usuario) {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(CONTAR_SQL)) {
            asignarFiltros(consulta, rango, accion, usuario);
            try (ResultSet fila = consulta.executeQuery()) {
                fila.next();
                return fila.getLong(1);
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo contar la auditoría", error);
        }
    }

    /** Asigna los 7 parámetros de {@link #FILTROS} y devuelve el índice del siguiente. */
    private static int asignarFiltros(PreparedStatement consulta, RangoFechas rango, AccionAuditoria accion,
            String usuario) throws SQLException {
        consulta.setObject(1, rango.desde(), Types.TIMESTAMP_WITH_TIMEZONE);
        consulta.setObject(2, rango.hasta(), Types.TIMESTAMP_WITH_TIMEZONE);
        String nombreAccion = accion == null ? null : accion.name();
        consulta.setString(3, nombreAccion);
        consulta.setString(4, nombreAccion);
        String patron = usuario == null ? null : "%" + escaparLike(usuario) + "%";
        consulta.setString(5, patron);
        consulta.setString(6, patron);
        consulta.setString(7, patron);
        return 8;
    }

    /** Los comodines que escribe el usuario se buscan literalmente. */
    static String escaparLike(String texto) {
        return texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static RegistroAuditoria mapear(ResultSet fila) throws SQLException {
        String accion = fila.getString("accion");
        return new RegistroAuditoria(
                fila.getLong("id_auditoria"),
                fila.getObject("fecha", OffsetDateTime.class),
                fila.getObject("usuario_id", Long.class),
                fila.getString("usuario_nombre"),
                fila.getString("usuario_correo"),
                fila.getString("rol"),
                accion,
                AccionAuditoria.valueOf(accion).etiqueta(),
                fila.getString("entidad"),
                fila.getObject("entidad_id", Long.class),
                fila.getString("detalle"));
    }
}
