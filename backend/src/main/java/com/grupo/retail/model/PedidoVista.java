package com.grupo.retail.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

public record PedidoVista(
        Long idPedido,
        String clienteNombre,
        String clienteCorreo,
        String estado,
        BigDecimal total,
        OffsetDateTime creadoEn,
        List<DetallePedido> productos,
        List<EventoEstadoPedido> historial) {
}
