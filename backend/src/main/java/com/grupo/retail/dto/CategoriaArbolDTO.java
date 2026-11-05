package com.grupo.retail.dto;

import com.grupo.retail.patterns.composite.CategoriaComponente;
import java.util.List;

/**
 * DTO para la transferencia del árbol de categorías hacia el frontend.
 * Refleja la jerarquía construida mediante el patrón Composite.
 */
public record CategoriaArbolDTO(
        Long id,
        String nombre,
        int totalProductos,
        boolean compuesta,
        List<CategoriaArbolDTO> subcategorias) {

    public static CategoriaArbolDTO desdeComponente(CategoriaComponente componente) {
        List<CategoriaArbolDTO> hijos = componente.getSubcategorias().stream()
                .map(CategoriaArbolDTO::desdeComponente)
                .toList();
        return new CategoriaArbolDTO(
                componente.getId(),
                componente.getNombre(),
                componente.getTotalProductos(),
                componente.esCompuesta(),
                hijos);
    }
}
