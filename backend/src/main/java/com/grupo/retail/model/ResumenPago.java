package com.grupo.retail.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Cobro de un pedido visto por Soporte: sin la referencia del proveedor (RF27). */
public record ResumenPago(String estado, BigDecimal monto, BigDecimal montoReembolsado, OffsetDateTime creadoEn) {
}
