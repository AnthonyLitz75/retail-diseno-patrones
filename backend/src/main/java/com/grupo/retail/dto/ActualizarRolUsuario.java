package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ActualizarRolUsuario(
        @NotBlank(message = "El rol es obligatorio")
        @Pattern(regexp = "CLIENTE|ADMIN|VENDEDOR|ALMACEN|SOPORTE",
                message = "El rol no es válido")
        String rol) {
}