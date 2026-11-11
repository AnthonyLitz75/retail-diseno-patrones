package com.grupo.retail.model;

import java.util.List;

/**
 * Vista agregada de un pedido para Soporte (spec 006, US7, RF27): pedido con líneas, envío
 * e historial, resumen del pago y las atenciones previas. No incluye la clave de
 * confirmación, la referencia del cobro ni la dirección de envío.
 */
public record ContextoPedidoSoporte(
        PedidoVista pedido,
        ResumenPago pago,
        List<Reclamo> reclamos,
        List<Devolucion> devoluciones) {
}
