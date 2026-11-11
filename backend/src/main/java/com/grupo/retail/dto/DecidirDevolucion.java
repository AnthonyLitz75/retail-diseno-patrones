package com.grupo.retail.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** RF25: Soporte aprueba o rechaza una devolución SOLICITADA. */
public record DecidirDevolucion(
        @NotNull(message = "Indica si la devolución se aprueba")
        Boolean aprobada,
        @Size(max = 2000, message = "La observación no puede superar 2000 caracteres")
        String observacion) {
}
