package com.grupo.retail.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PedidoConfirmado(
        Long idPedido,
        String estado,
        BigDecimal total,
        OffsetDateTime creadoEn,
        String metodoPago,
        String estadoPago,
        String referenciaPago,
        List<DetallePedido> productos) {
}
