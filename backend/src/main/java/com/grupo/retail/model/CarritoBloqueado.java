package com.grupo.retail.model;

/**
 * Carrito ACTIVO leído bajo bloqueo dentro de una transacción, con su revisión actual.
 * La revisión aumenta con cada cambio y permite rechazar un deshacer sobre datos viejos.
 */
public record CarritoBloqueado(long id, long revision) {
}
