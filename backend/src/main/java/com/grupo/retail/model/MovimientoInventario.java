package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record MovimientoInventario(
                Long id,
                Long productoId,
                String tipo,
                int cantidadFirmada,
                String motivo,
                OffsetDateTime fecha) {
}