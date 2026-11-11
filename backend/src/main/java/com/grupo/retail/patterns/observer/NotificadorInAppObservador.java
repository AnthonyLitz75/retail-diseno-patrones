package com.grupo.retail.patterns.observer;

import com.grupo.retail.model.EventoNotificacion;
import com.grupo.retail.patterns.factory.FabricaNotificadorInApp;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Observer (GoF) - Observador concreto transaccional.
 *
 * <p>Guarda la alerta de la campana del cliente en la misma transacción del pedido.
 * Combina dos patrones: es un observador y obtiene su canal mediante el Factory Method
 * existente ({@link FabricaNotificadorInApp}). Si la alerta no se puede guardar, el
 * cambio del pedido se revierte.</p>
 */
@Component
public class NotificadorInAppObservador implements ObservadorPedidoTransaccional {

    private final FabricaNotificadorInApp fabrica;

    public NotificadorInAppObservador(FabricaNotificadorInApp fabrica) {
        this.fabrica = fabrica;
    }

    @Override
    public void alCambiarEstado(Connection conexion, EventoPedido evento) throws SQLException {
        fabrica.crearNotificador().notificar(conexion, new EventoNotificacion(
                evento.clienteId(), evento.pedidoId(), evento.estadoNuevo(), evento.motivo()));
    }
}
