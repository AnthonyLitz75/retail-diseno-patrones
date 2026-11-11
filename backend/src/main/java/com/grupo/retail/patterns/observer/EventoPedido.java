package com.grupo.retail.patterns.observer;

import java.time.OffsetDateTime;
import java.util.Objects;

/**
 * Patrón Observer (GoF): el evento que el sujeto ({@link PublicadorEventosPedido}) entrega a
 * sus observadores cuando un pedido se crea o cambia de estado.
 *
 * @param estadoAnterior {@code null} cuando el pedido se acaba de crear
 */
public record EventoPedido(
        long pedidoId,
        long clienteId,
        String estadoAnterior,
        String estadoNuevo,
        OffsetDateTime fecha,
        String motivo) {

    public EventoPedido {
        Objects.requireNonNull(estadoNuevo, "estadoNuevo es obligatorio");
        Objects.requireNonNull(fecha, "fecha es obligatoria");
        Objects.requireNonNull(motivo, "motivo es obligatorio");
    }
}
