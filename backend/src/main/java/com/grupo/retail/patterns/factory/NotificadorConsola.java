package com.grupo.retail.patterns.factory;

import com.grupo.retail.model.EventoNotificacion;

/**
 * Patrón Factory Method (GoF) - Producto Concreto (Concrete Product).
 * Emite notificaciones hacia el log/consola del sistema de manera desacoplada,
 * sin dependencias a nivel de API hacia conexiones de base de datos ni SQLException.
 */
public class NotificadorConsola implements Notificador {
    private static final System.Logger LOGGER = System.getLogger(NotificadorConsola.class.getName());

    @Override
    public void notificar(EventoNotificacion evento) {
        LOGGER.log(System.Logger.Level.INFO,
                "Pedido {0}: estado {1} comunicado al usuario {2}",
                evento.pedidoId(), evento.estado(), evento.usuarioId());
    }
}
