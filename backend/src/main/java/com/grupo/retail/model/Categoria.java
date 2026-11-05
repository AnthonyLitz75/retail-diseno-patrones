package com.grupo.retail.model;

/**
 * Entidad de dominio inmutable para las categorías de la tienda.
 * Soporta jerarquías mediante categoriaPadreId.
 */
public record Categoria(
        Long idCategoria,
        String nombre,
        boolean activa,
        Long categoriaPadreId) {

    public Categoria(Long idCategoria, String nombre, boolean activa) {
        this(idCategoria, nombre, activa, null);
    }
}
