package com.grupo.retail.dto;

import com.grupo.retail.model.MovimientoInventario;

import java.time.OffsetDateTime;

/**
 * DTO de respuesta para el historial de movimientos de inventario de un producto.
 */
public record MovimientoInventarioRespuestaDTO(
        Long id,
        Long productoId,
        String tipo,
        int cantidadFirmada,
        String motivo,
        Long responsableId,
        OffsetDateTime fecha) {

    public static MovimientoInventarioRespuestaDTO desde(MovimientoInventario movimiento) {
        if (movimiento == null) {
            return null;
        }
        return new MovimientoInventarioRespuestaDTO(
                movimiento.id(),
                movimiento.productoId(),
                movimiento.tipo(),
                movimiento.cantidadFirmada(),
                movimiento.motivo(),
                movimiento.responsableId(),
                movimiento.fecha());
    }
}
