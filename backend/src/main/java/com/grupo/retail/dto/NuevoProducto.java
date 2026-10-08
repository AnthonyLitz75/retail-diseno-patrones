package com.grupo.retail.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record NuevoProducto(
        @NotBlank(message = "El nombre es obligatorio") @Size(max = 120, message = "El nombre no puede superar 120 caracteres") String nombre,

        @NotBlank(message = "La categoría es obligatoria") @Size(max = 80, message = "La categoría no puede superar 80 caracteres") String categoria,

        @NotNull(message = "El precio es obligatorio") @Positive(message = "El precio debe ser mayor que cero") @Digits(integer = 8, fraction = 2, message = "El precio admite hasta dos decimales") BigDecimal precio,

        @NotNull(message = "El stock es obligatorio") @PositiveOrZero(message = "El stock no puede ser negativo") Integer stock) {

    public NuevoProducto {
        if (categoria == null || categoria.isBlank()) {
            categoria = "General";
        } else {
            categoria = categoria.trim();
        }
    }
}