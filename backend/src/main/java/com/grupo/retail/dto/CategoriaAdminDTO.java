package com.grupo.retail.dto;

import com.grupo.retail.model.Categoria;

/**
 * DTO de respuesta administrativa para categorías con el conteo de productos activos asociados.
 */
public record CategoriaAdminDTO(
        Long idCategoria,
        String nombre,
        boolean activa,
        Long categoriaPadreId,
        int totalProductos) {

    public static CategoriaAdminDTO desde(Categoria categoria, int totalProductos) {
        if (categoria == null) {
            return null;
        }
        return new CategoriaAdminDTO(
                categoria.idCategoria(),
                categoria.nombre(),
                categoria.activa(),
                categoria.categoriaPadreId(),
                totalProductos);
    }
}
