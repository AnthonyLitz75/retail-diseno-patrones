package com.grupo.retail.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record VentaReporte(
        long pedidoId,
        OffsetDateTime fecha,
        String estado,
        String cliente,
        BigDecimal total) {
}
