package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudRespuestaPregunta(
        @NotBlank(message = "La respuesta es obligatoria")
        @Size(max = 1000, message = "La respuesta no puede superar 1000 caracteres")
        String respuesta) {
}
