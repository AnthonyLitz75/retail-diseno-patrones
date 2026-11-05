package com.grupo.retail.model;

import java.math.BigDecimal;

/**
 * Entidad de dominio inmutable para los productos del catálogo.
 * Soporta información extendida para retail tecnológico (SKU, marca, precios, novedades y multimedia).
 */
public record Producto(
        Long id,
        String sku,
        String nombre,
        String marca,
        String categoria,
        Long categoriaId,
        String descripcion,
        BigDecimal precio,
        BigDecimal precioAnterior,
        int stock,
        boolean nuevo,
        String imagen,
        boolean activo) {

    public Producto(
            Long id,
            String nombre,
            String categoria,
            BigDecimal precio,
            int stock,
            boolean activo) {
        this(id, null, nombre, null, categoria, null, null, precio, null, stock, false, null, activo);
    }
}
