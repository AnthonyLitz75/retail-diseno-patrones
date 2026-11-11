package com.grupo.retail.model;

import java.math.BigDecimal;

/**
 * Línea de un pedido. {@code idDetalle} identifica la línea para solicitar una devolución
 * (spec 006, RF14); es nulo cuando la línea aún no se ha leído de la base.
 */
public record DetallePedido(
                Long productoId,
                String nombreProducto,
                BigDecimal precioUnitario,
                int cantidad,
                BigDecimal subtotal,
                Long idDetalle) {

        public DetallePedido(Long productoId, String nombreProducto, BigDecimal precioUnitario,
                        int cantidad, BigDecimal subtotal) {
                this(productoId, nombreProducto, precioUnitario, cantidad, subtotal, null);
        }
}
