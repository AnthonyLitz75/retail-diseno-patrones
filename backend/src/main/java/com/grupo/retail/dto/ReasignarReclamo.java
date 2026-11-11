package com.grupo.retail.dto;

import jakarta.validation.constraints.NotNull;

/** Spec 006, T013: agente de soporte activo que pasa a atender el reclamo. */
public record ReasignarReclamo(
        @NotNull(message = "Indica el agente de soporte")
        Long soporteId) {
}
