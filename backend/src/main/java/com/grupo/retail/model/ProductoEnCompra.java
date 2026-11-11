package com.grupo.retail.model;

import java.math.BigDecimal;

/**
 * Línea del carrito leída y bloqueada dentro de la transacción de compra, con el precio,
 * el stock y el estado vigentes del producto en ese momento.
 *
 * <p>GRASP Experto en información: la línea conoce su precio y su cantidad, por eso
 * calcula su propio subtotal.</p>
 */
public record ProductoEnCompra(
        long id, String nombre, BigDecimal precio, int stock, boolean activo, int cantidad) {

    public BigDecimal subtotal() {
        return precio.multiply(BigDecimal.valueOf(cantidad));
    }
}
