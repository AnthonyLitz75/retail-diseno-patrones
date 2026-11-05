package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudPreguntaProducto(
        @NotBlank(message = "La pregunta es obligatoria")
        @Size(max = 1000, message = "La pregunta no puede superar 1000 caracteres")
        String pregunta) {
}
