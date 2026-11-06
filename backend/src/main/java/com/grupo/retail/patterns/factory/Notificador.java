package com.grupo.retail.patterns.factory;

import com.grupo.retail.model.EventoNotificacion;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Creacional Factory Method (GoF) - Producto (Product).
 * Define el contrato común para la emisión de notificaciones de eventos en el sistema.
 */
public interface Notificador {

    /**
     * Emite una notificación para el evento dado de forma desacoplada de la infraestructura de persistencia.
     * Permite que canales sin persistencia SQL (como NotificadorConsola, Email, SMS, Webhooks) operen
     * limpiamente sin requerir una conexión JDBC.
     *
     * @param evento datos del evento a notificar.
     */
    void notificar(EventoNotificacion evento);

    /**
     * Emite una notificación participando dentro de una transacción JDBC activa.
     * Por defecto delega a {@link #notificar(EventoNotificacion)} para canales que no requieren base de datos.
     *
     * @param conexion conexión transaccional activa.
     * @param evento datos del evento a notificar.
     * @throws SQLException si ocurre un error durante la persistencia en base de datos.
     */
    default void notificar(Connection conexion, EventoNotificacion evento) throws SQLException {
        notificar(evento);
    }
}
