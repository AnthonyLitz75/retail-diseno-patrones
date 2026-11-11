package com.grupo.retail.model;

import java.math.BigDecimal;

/** Cobro APROBADO de un pedido, bloqueado para acumular un reembolso (spec 006, RF26). */
public record PagoReembolsable(long id, BigDecimal monto, BigDecimal montoReembolsado, String referencia) {

    public BigDecimal disponible() {
        return monto.subtract(montoReembolsado);
    }
}
