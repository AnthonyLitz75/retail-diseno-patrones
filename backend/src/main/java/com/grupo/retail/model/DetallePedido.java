package com.grupo.retail.model;

import java.math.BigDecimal;

public record DetallePedido(
        Long productoId,
        String nombreProducto,
        BigDecimal precioUnitario,
        int cantidad,
        BigDecimal subtotal) {
}
