package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** RF13: reclamo del cliente sobre un pedido propio entregado. */
public record RegistrarReclamo(
        @NotBlank(message = "El motivo es obligatorio")
        @Size(max = 100, message = "El motivo no puede superar 100 caracteres")
        String motivo,
        @NotBlank(message = "La descripción es obligatoria")
        @Size(max = 2000, message = "La descripción no puede superar 2000 caracteres")
        String descripcion) {
}
