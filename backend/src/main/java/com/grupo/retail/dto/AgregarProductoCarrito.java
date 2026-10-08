package com.grupo.retail.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AgregarProductoCarrito(
                @NotNull(message = "El producto es obligatorio") @Positive(message = "El identificador del producto debe ser positivo") Long productoId,

                @NotNull(message = "La cantidad es obligatoria") @Positive(message = "La cantidad debe ser mayor que cero") Integer cantidad) {
}