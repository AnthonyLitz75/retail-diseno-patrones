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
        List<DetallePedido> productos,
        String claveConfirmacion,
        String destinatario,
        String direccionEnvio) {

    public PedidoConfirmado(
            Long idPedido,
            String estado,
            BigDecimal total,
            OffsetDateTime creadoEn,
            String metodoPago,
            String estadoPago,
            String referenciaPago,
            List<DetallePedido> productos) {
        this(idPedido, estado, total, creadoEn, metodoPago, estadoPago, referenciaPago, productos, null, null, null);
    }
}
