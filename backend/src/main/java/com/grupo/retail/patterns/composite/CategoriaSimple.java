package com.grupo.retail.patterns.composite;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Patrón Composite (GoF) - Nodo Hoja (Leaf).
 * Representa una categoría terminal sin subcategorías o una subcategoría individual.
 */
public class CategoriaSimple implements CategoriaComponente {

    private final Long id;
    private final String nombre;
    private final int totalProductos;

    public CategoriaSimple(Long id, String nombre, int totalProductos) {
        this.id = id;
        this.nombre = Objects.requireNonNull(nombre, "El nombre de la categoría no puede ser nulo");
        this.totalProductos = Math.max(0, totalProductos);
    }

    @Override
    public Long getId() {
        return id;
    }

    @Override
    public String getNombre() {
        return nombre;
    }

    @Override
    public int getTotalProductos() {
        return totalProductos;
    }

    @Override
    public boolean esCompuesta() {
        return false;
    }

    @Override
    public List<Long> obtenerIdsAsociados() {
        return id != null ? List.of(id) : Collections.emptyList();
    }

    @Override
    public List<CategoriaComponente> getSubcategorias() {
        return Collections.emptyList();
    }
}
