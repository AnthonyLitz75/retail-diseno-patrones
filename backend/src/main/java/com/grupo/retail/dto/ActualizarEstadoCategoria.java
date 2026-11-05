package com.grupo.retail.dto;

import jakarta.validation.constraints.NotNull;

public record ActualizarEstadoCategoria(
        @NotNull(message = "El estado es obligatorio") Boolean activa) {
}