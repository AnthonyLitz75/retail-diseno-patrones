package com.grupo.retail.model;

/** Línea de un pedido cuyas unidades vuelven al stock (por ejemplo, al cancelarlo). */
public record LineaReposicion(long productoId, int cantidad) {
}
