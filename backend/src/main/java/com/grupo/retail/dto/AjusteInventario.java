package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record AjusteInventario(
                @NotNull(message = "El nuevo stock es obligatorio") @PositiveOrZero(message = "El stock no puede ser negativo") Integer nuevoStock,

                @NotBlank(message = "El motivo es obligatorio") @Size(max = 250, message = "El motivo no puede superar 250 caracteres") String motivo) {
}