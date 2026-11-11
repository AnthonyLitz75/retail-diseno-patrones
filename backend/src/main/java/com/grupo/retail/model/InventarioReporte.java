package com.grupo.retail.model;

/** Existencias de un producto para el CSV de inventario (spec 007, US7). */
public record InventarioReporte(
        String sku,
        String nombre,
        String categoria,
        int stock,
        boolean activo) {
}
