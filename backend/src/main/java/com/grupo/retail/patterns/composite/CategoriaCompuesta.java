package com.grupo.retail.patterns.composite;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Patrón Composite (GoF) - Nodo Compuesto (Composite).
 * Agrupa una categoría contenedora y sus subcategorías descendientes.
 * Delega y agrega operaciones como el cálculo del total de productos
 * y la recolección de identificadores asociados para consultas de base de datos.
 */
public class CategoriaCompuesta implements CategoriaComponente {

    private final Long id;
    private final String nombre;
    private final int productosPropios;
    private final List<CategoriaComponente> subcategorias;

    public CategoriaCompuesta(Long id, String nombre, int productosPropios) {
        this.id = id;
        this.nombre = Objects.requireNonNull(nombre, "El nombre de la categoría no puede ser nulo");
        this.productosPropios = Math.max(0, productosPropios);
        this.subcategorias = new ArrayList<>();
    }

    public CategoriaCompuesta(Long id, String nombre) {
        this(id, nombre, 0);
    }

    public void agregarSubcategoria(CategoriaComponente componente) {
        Objects.requireNonNull(componente, "El componente a agregar no puede ser nulo");
        subcategorias.add(componente);
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
        int sumaHijos = subcategorias.stream()
                .mapToInt(CategoriaComponente::getTotalProductos)
                .sum();
        return productosPropios + sumaHijos;
    }

    @Override
    public boolean esCompuesta() {
        return true;
    }

    @Override
    public List<Long> obtenerIdsAsociados() {
        List<Long> ids = new ArrayList<>();
        if (id != null) {
            ids.add(id);
        }
        for (CategoriaComponente hijo : subcategorias) {
            ids.addAll(hijo.obtenerIdsAsociados());
        }
        return Collections.unmodifiableList(ids);
    }

    @Override
    public List<CategoriaComponente> getSubcategorias() {
        return Collections.unmodifiableList(subcategorias);
    }
}
