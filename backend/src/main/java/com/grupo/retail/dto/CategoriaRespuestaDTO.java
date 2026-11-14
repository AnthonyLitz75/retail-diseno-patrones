package com.grupo.retail.dto;

import com.grupo.retail.model.Categoria;

/**
 * DTO de respuesta para categorías en endpoints REST públicos.
 */
public record CategoriaRespuestaDTO(
        Long idCategoria,
        String nombre,
        boolean activa,
        Long categoriaPadreId) {

    public static CategoriaRespuestaDTO desde(Categoria categoria) {
        if (categoria == null) {
            return null;
        }
        return new CategoriaRespuestaDTO(
                categoria.idCategoria(),
                categoria.nombre(),
                categoria.activa(),
                categoria.categoriaPadreId());
    }
}
