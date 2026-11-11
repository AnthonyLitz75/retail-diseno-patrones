package com.grupo.retail.model;

import java.time.OffsetDateTime;

/** Movimiento de inventario para reportes: solo el nombre del responsable, sin correo (FR-003). */
public record MovimientoReporte(
        OffsetDateTime fecha,
        String sku,
        String tipo,
        int cantidad,
        String motivo,
        String responsable) {
}
