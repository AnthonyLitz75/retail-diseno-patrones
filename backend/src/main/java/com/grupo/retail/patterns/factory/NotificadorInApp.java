package com.grupo.retail.patterns.factory;

import com.grupo.retail.model.EventoNotificacion;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Objects;

/**
 * Patrón Factory Method (GoF) - Producto Concreto (Concrete Product).
 * Persiste la notificación en la base de datos participando dentro de la
 * transacción JDBC de la operación de pedido.
 */
public class NotificadorInApp implements Notificador {
    private static final String INSERTAR = """
            INSERT INTO notificacion (usuario_id, pedido_id, estado, mensaje)
            VALUES (?, ?, ?, ?)
            """;

    @Override
    public void notificar(EventoNotificacion evento) {
        throw new UnsupportedOperationException(
                "NotificadorInApp requiere una conexión transaccional activa mediante notificar(conexion, evento)");
    }

    @Override
    public void notificar(Connection conexion, EventoNotificacion evento) throws SQLException {
        Objects.requireNonNull(conexion, "La conexión transaccional no puede ser nula");
        Objects.requireNonNull(evento, "El evento de notificación no puede ser nulo");
        try (PreparedStatement consulta = conexion.prepareStatement(INSERTAR)) {
            consulta.setLong(1, evento.usuarioId());
            consulta.setLong(2, evento.pedidoId());
            consulta.setString(3, evento.estado());
            consulta.setString(4, evento.mensaje());
            consulta.executeUpdate();
        }
    }
}
