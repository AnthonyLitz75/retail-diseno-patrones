package com.grupo.retail.patterns.composite;

import java.util.List;

/**
 * Patrón Estructural Composite (GoF).
 * Interfaz base que define la firma común para nodos hoja (CategoriaSimple)
 * y nodos compuestos (CategoriaCompuesta). Permite tratar a categorías simples
 * y jerarquías completas de manera uniforme.
 */
public interface CategoriaComponente {

    Long getId();

    String getNombre();

    int getTotalProductos();

    boolean esCompuesta();

    List<Long> obtenerIdsAsociados();

    List<CategoriaComponente> getSubcategorias();
}
