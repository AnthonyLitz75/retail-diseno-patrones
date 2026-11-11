package com.grupo.retail.model;

import java.math.BigDecimal;

/**
 * Línea de un pedido con lo ya comprometido en devoluciones SOLICITADAS, APROBADAS o
 * CERRADAS (spec 006, FR-003). El saldo devolvible es comprada - comprometida.
 */
public record LineaDevolvible(
        long pedidoDetalleId,
        long productoId,
        int comprada,
        int comprometida,
        BigDecimal precioUnitario) {

    public int saldo() {
        return comprada - comprometida;
    }
}
