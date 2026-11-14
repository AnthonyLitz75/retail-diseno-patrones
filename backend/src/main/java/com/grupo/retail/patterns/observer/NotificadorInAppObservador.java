package com.grupo.retail.patterns.observer;

import com.grupo.retail.model.EventoNotificacion;
import com.grupo.retail.patterns.factory.FabricaNotificador;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Observer (GoF) - Observador concreto transaccional.
 *
 * <p>Guarda la alerta de la campana del cliente en la misma transacción del pedido.
 * Cumple con el Principio de Inversión de Dependencias (DIP) al depender de la abstracción
 * {@link FabricaNotificador} en lugar de la implementación concreta.</p>
 */
@Component
public class NotificadorInAppObservador implements ObservadorPedidoTransaccional {

    private final FabricaNotificador fabrica;

    public NotificadorInAppObservador(@Qualifier("fabricaNotificadorInApp") FabricaNotificador fabrica) {
        this.fabrica = fabrica;
    }

    @Override
    public void alCambiarEstado(Connection conexion, EventoPedido evento) throws SQLException {
        fabrica.crearNotificador().notificar(conexion, new EventoNotificacion(
                evento.clienteId(), evento.pedidoId(), evento.estadoNuevo(), evento.motivo()));
    }
}
