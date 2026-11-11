package com.grupo.retail.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/** Unidades de una línea del pedido que el cliente quiere devolver. */
public record LineaSolicitudDevolucion(
        @NotNull(message = "Indica la línea del pedido")
        Long pedidoDetalleId,
        @NotNull(message = "Indica la cantidad a devolver")
        @Min(value = 1, message = "La cantidad debe ser al menos 1")
        @Max(value = 999, message = "La cantidad no puede superar 999")
        Integer cantidad) {
}
