package com.grupo.retail.dto;

import jakarta.validation.constraints.NotNull;

/** RF16: activar o desactivar un producto (nunca se borra). */
public record CambiarEstadoProducto(
        @NotNull(message = "Indica si el producto queda activo")
        Boolean activo) {
}
