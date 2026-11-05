package com.grupo.retail.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SolicitudEntradaInventario(
        @NotBlank(message = "El motivo es obligatorio")
        @Size(max = 250, message = "El motivo no puede superar 250 caracteres")
        String motivo,
        @NotEmpty(message = "Debe incluir al menos un producto")
        @Size(max = 100, message = "No se pueden registrar más de 100 productos por lote")
        List<@Valid LineaEntradaInventario> productos) {
}