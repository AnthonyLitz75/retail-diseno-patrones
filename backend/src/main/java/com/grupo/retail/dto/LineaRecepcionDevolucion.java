package com.grupo.retail.dto;

import jakarta.validation.constraints.NotNull;

/** Resultado de la inspección de una línea recibida: apta (se repone) o no. */
public record LineaRecepcionDevolucion(
        @NotNull(message = "Indica la línea de la devolución")
        Long detalleDevolucionId,
        @NotNull(message = "Indica si la unidad vuelve al stock")
        Boolean reintegrarStock) {
}
