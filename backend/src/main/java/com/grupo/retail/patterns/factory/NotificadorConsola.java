package com.grupo.retail.patterns.factory;

import com.grupo.retail.model.EventoNotificacion;
import java.sql.Connection;
import java.sql.SQLException;

public class NotificadorConsola implements Notificador {
    private static final System.Logger LOGGER = System.getLogger(NotificadorConsola.class.getName());

    @Override
    public void notificar(Connection conexion, EventoNotificacion evento) throws SQLException {
        LOGGER.log(System.Logger.Level.INFO,
                "Pedido {0}: estado {1} comunicado al usuario {2}",
                evento.pedidoId(), evento.estado(), evento.usuarioId());
    }
}
