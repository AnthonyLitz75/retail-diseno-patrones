package com.grupo.retail.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** RF14: devolución de unidades de un pedido propio ENTREGADO. */
public record SolicitarDevolucion(
        @NotBlank(message = "El motivo es obligatorio")
        @Size(max = 120, message = "El motivo no puede superar 120 caracteres")
        String motivo,
        @NotEmpty(message = "Indica al menos una línea a devolver")
        @Size(max = 100, message = "Demasiadas líneas en la solicitud")
        List<@Valid @NotNull LineaSolicitudDevolucion> lineas) {
}
