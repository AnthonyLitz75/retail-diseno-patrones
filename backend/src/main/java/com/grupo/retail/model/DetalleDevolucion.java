package com.grupo.retail.model;

import java.math.BigDecimal;

/** Línea de una devolución con el precio histórico del pedido (spec 006, RF14 y RF26). */
public record DetalleDevolucion(
        long id,
        long pedidoDetalleId,
        long productoId,
        String nombreProducto,
        int cantidad,
        boolean reintegrarStock,
        BigDecimal precioUnitarioHistorico,
        BigDecimal subtotalReembolso) {
}
