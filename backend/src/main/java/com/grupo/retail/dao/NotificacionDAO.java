package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.Notificacion;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class NotificacionDAO {
    private final ProveedorConexiones proveedorConexiones;

    public NotificacionDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public List<Notificacion> listarDelUsuario(Long usuarioId, Long antesDeId, int limite) {
        StringBuilder sql = new StringBuilder("""
                SELECT id_notificacion, usuario_id, pedido_id, estado, mensaje, leida, creada_en
                FROM notificacion
                WHERE usuario_id = ?
                """);
        if (antesDeId != null) sql.append(" AND id_notificacion < ?");
        sql.append(" ORDER BY id_notificacion DESC LIMIT ?");
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql.toString())) {
            int indice = 1;
            consulta.setLong(indice++, usuarioId);
            if (antesDeId != null) consulta.setLong(indice++, antesDeId);
            consulta.setInt(indice, limite);
            try (ResultSet filas = consulta.executeQuery()) {
                List<Notificacion> notificaciones = new ArrayList<>();
                while (filas.next()) {
                    notificaciones.add(new Notificacion(filas.getLong("id_notificacion"),
                            filas.getLong("usuario_id"), filas.getLong("pedido_id"),
                            filas.getString("estado"), filas.getString("mensaje"),
                            filas.getBoolean("leida"),
                            filas.getObject("creada_en", OffsetDateTime.class)));
                }
                return List.copyOf(notificaciones);
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar las notificaciones", error);
        }
    }

    /**
     * Marca como leída una notificación del usuario. El filtro por {@code usuario_id} hace
     * que una notificación ajena se comporte como inexistente (vacío, luego 404).
     */
    public Optional<Notificacion> marcarLeida(Long usuarioId, Long idNotificacion) {
        String sql = """
                UPDATE notificacion
                SET leida = TRUE
                WHERE id_notificacion = ? AND usuario_id = ?
                RETURNING id_notificacion, usuario_id, pedido_id, estado, mensaje, leida, creada_en
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, idNotificacion);
            consulta.setLong(2, usuarioId);
            try (ResultSet fila = consulta.executeQuery()) {
                if (!fila.next()) {
                    return Optional.empty();
                }
                return Optional.of(new Notificacion(fila.getLong("id_notificacion"),
                        fila.getLong("usuario_id"), fila.getLong("pedido_id"),
                        fila.getString("estado"), fila.getString("mensaje"),
                        fila.getBoolean("leida"),
                        fila.getObject("creada_en", OffsetDateTime.class)));
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo marcar la notificación como leída", error);
        }
    }
}
