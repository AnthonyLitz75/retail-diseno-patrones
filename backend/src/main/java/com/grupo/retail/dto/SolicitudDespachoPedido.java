package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudDespachoPedido(
        @NotBlank(message = "El transportista es obligatorio")
        @Size(max = 120, message = "El transportista no puede superar 120 caracteres")
        String transportista,
        @NotBlank(message = "El código de seguimiento es obligatorio")
        @Size(max = 120, message = "El código de seguimiento no puede superar 120 caracteres")
        String codigoSeguimiento) {
}
