package com.grupo.retail.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/** Devolución de un pedido entregado con sus líneas (spec 006, RF14, RF25 y RF26). */
public record Devolucion(
        long id,
        long pedidoId,
        long clienteId,
        Long soporteId,
        String motivo,
        EstadoDevolucion estado,
        String observacion,
        BigDecimal importeReembolso,
        OffsetDateTime creadoEn,
        OffsetDateTime actualizadoEn,
        OffsetDateTime fechaCierre,
        List<DetalleDevolucion> lineas) {

    public Devolucion {
        lineas = lineas == null ? List.of() : List.copyOf(lineas);
    }

    public Devolucion conLineas(List<DetalleDevolucion> nuevasLineas) {
        return new Devolucion(id, pedidoId, clienteId, soporteId, motivo, estado, observacion,
                importeReembolso, creadoEn, actualizadoEn, fechaCierre, nuevasLineas);
    }
}
