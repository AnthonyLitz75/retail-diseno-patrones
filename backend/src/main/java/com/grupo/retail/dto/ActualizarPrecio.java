package com.grupo.retail.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record ActualizarPrecio(
                @NotNull(message = "El precio es obligatorio") @Positive(message = "El precio debe ser mayor que cero") @Digits(integer = 8, fraction = 2, message = "El precio admite hasta dos decimales") BigDecimal precio) {
}