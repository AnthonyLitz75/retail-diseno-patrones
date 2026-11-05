package com.grupo.retail.patterns.factory;

import com.grupo.retail.model.EventoNotificacion;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class NotificadorInApp implements Notificador {
    private static final String INSERTAR = """
            INSERT INTO notificacion (usuario_id, pedido_id, estado, mensaje)
            VALUES (?, ?, ?, ?)
            """;

    @Override
    public void notificar(Connection conexion, EventoNotificacion evento) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(INSERTAR)) {
            consulta.setLong(1, evento.usuarioId());
            consulta.setLong(2, evento.pedidoId());
            consulta.setString(3, evento.estado());
            consulta.setString(4, evento.mensaje());
            consulta.executeUpdate();
        }
    }
}
