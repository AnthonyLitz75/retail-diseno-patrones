package com.grupo.retail.patterns.composite;

import com.grupo.retail.model.Categoria;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Patrón Estructural Composite (GoF) - Constructor de Jerarquía.
 *
 * Responsable de ensamblar estructuras jerárquicas polimórficas (árbol de CategoriaComponente)
 * a partir de datos relacionales planos (categorías, conteos de productos y productos huérfanos).
 *
 * Encapsula las siguientes reglas de dominio sobre la jerarquía:
 * 1. Separación de categorías raíz y sus respectivas subcategorías.
 * 2. Omisión de subcategorías y categorías hoja o compuestas con 0 productos asociados.
 * 3. Generación automática del nodo virtual "Otros" cuando existen productos sin categoría asignada.
 */
public final class ArbolCategoriaBuilder {

    private ArbolCategoriaBuilder() {
        // Clase de utilidad y ensamblado de dominio inmutable
    }

    public static List<CategoriaComponente> construirArbol(
            List<Categoria> categorias,
            Map<Long, Integer> conteoPorCategoria,
            int productosSinCategoria) {
        if (categorias == null || categorias.isEmpty()) {
            return productosSinCategoria > 0
                    ? List.of(new CategoriaSimple(null, "Otros", productosSinCategoria))
                    : Collections.emptyList();
        }

        Map<Long, Integer> conteos = conteoPorCategoria != null ? conteoPorCategoria : Collections.emptyMap();
        Map<Long, List<Categoria>> subcategoriasPorPadre = new HashMap<>();
        List<Categoria> principales = clasificarCategorias(categorias, subcategoriasPorPadre);

        List<CategoriaComponente> resultado = new ArrayList<>();
        for (Categoria principal : principales) {
            List<Categoria> hijas = subcategoriasPorPadre.getOrDefault(
                    principal.idCategoria(), Collections.emptyList());
            construirNodo(principal, hijas, conteos).ifPresent(resultado::add);
        }
        if (productosSinCategoria > 0) {
            resultado.add(new CategoriaSimple(null, "Otros", productosSinCategoria));
        }
        return List.copyOf(resultado);
    }

    private static List<Categoria> clasificarCategorias(
            List<Categoria> categorias,
            Map<Long, List<Categoria>> subcategoriasPorPadre) {
        List<Categoria> principales = new ArrayList<>();
        for (Categoria cat : categorias) {
            if (cat.categoriaPadreId() == null) {
                principales.add(cat);
            } else {
                subcategoriasPorPadre
                        .computeIfAbsent(cat.categoriaPadreId(), k -> new ArrayList<>())
                        .add(cat);
            }
        }
        return principales;
    }

    private static java.util.Optional<CategoriaComponente> construirNodo(
            Categoria principal,
            List<Categoria> hijas,
            Map<Long, Integer> conteos) {
        int conteoPropio = conteos.getOrDefault(principal.idCategoria(), 0);
        if (hijas.isEmpty()) {
            return conteoPropio > 0
                    ? java.util.Optional.of(new CategoriaSimple(principal.idCategoria(), principal.nombre(), conteoPropio))
                    : java.util.Optional.empty();
        }
        CategoriaCompuesta compuesta = new CategoriaCompuesta(
                principal.idCategoria(), principal.nombre(), conteoPropio);
        for (Categoria hija : hijas) {
            int conteoHija = conteos.getOrDefault(hija.idCategoria(), 0);
            if (conteoHija > 0) {
                compuesta.agregarSubcategoria(new CategoriaSimple(hija.idCategoria(), hija.nombre(), conteoHija));
            }
        }
        return compuesta.getTotalProductos() > 0
                ? java.util.Optional.of(compuesta)
                : java.util.Optional.empty();
    }
}
