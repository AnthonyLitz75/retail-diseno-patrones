package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * RF24: respuesta de Soporte. Con estado RESUELTO cierra el reclamo; con EN_ATENCION es una
 * respuesta parcial y el reclamo sigue abierto para el agente.
 */
public record ResponderReclamo(
        @NotBlank(message = "La respuesta es obligatoria")
        @Size(max = 2000, message = "La respuesta no puede superar 2000 caracteres")
        String respuesta,
        @NotBlank(message = "Indica el estado")
        @Pattern(regexp = "RESUELTO|EN_ATENCION", message = "Usa RESUELTO o EN_ATENCION")
        String estado) {
}
