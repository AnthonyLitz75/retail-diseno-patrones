package com.grupo.retail.model;

/**
 * Estado y cliente de un pedido leídos bajo bloqueo (FOR UPDATE) dentro de la transacción
 * de un cambio de estado. El estado alimenta al patrón State y el cliente al evento del
 * patrón Observer.
 */
public record PedidoBloqueado(String estado, long clienteId) {
}
