package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** RF28: Soporte escala el reclamo al administrador con un motivo. */
public record EscalarReclamo(
        @NotBlank(message = "El motivo del escalamiento es obligatorio")
        @Size(max = 250, message = "El motivo no puede superar 250 caracteres")
        String motivoEscalamiento) {
}
