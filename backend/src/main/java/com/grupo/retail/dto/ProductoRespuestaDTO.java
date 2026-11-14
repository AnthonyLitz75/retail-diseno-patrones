package com.grupo.retail.dto;

import com.grupo.retail.model.Producto;

import java.math.BigDecimal;

/**
 * DTO de respuesta para desacoplar la entidad de dominio {@link Producto} de los endpoints REST públicos.
 */
public record ProductoRespuestaDTO(
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

    public static ProductoRespuestaDTO desde(Producto producto) {
        if (producto == null) {
            return null;
        }
        return new ProductoRespuestaDTO(
                producto.id(),
                producto.sku(),
                producto.nombre(),
                producto.marca(),
                producto.categoria(),
                producto.categoriaId(),
                producto.descripcion(),
                producto.precio(),
                producto.precioAnterior(),
                producto.stock(),
                producto.nuevo(),
                producto.imagen(),
                producto.activo());
    }
}
