package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * RF16 (spec 007, T014a): ficha editable del producto. El precio y el stock tienen sus
 * propias rutas con reglas e historial; aquí no se tocan. La imagen solo acepta una URL
 * http(s) o una ruta relativa, para que nunca llegue un {@code javascript:} a un {@code <img>}.
 */
public record EditarProducto(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        String nombre,
        @Size(max = 80, message = "La marca no puede superar 80 caracteres")
        String marca,
        @Size(max = 1000, message = "La descripción no puede superar 1000 caracteres")
        String descripcion,
        @Size(max = 255, message = "La imagen no puede superar 255 caracteres")
        @Pattern(regexp = "^(https?://|/)[^\\s\"'<>]*$",
                message = "La imagen debe ser una URL http(s) o una ruta que empiece con /")
        String imagen,
        @NotBlank(message = "La categoría es obligatoria")
        @Size(max = 80, message = "La categoría no puede superar 80 caracteres")
        String categoria) {

    public EditarProducto {
        nombre = limpiar(nombre);
        marca = limpiar(marca);
        descripcion = limpiar(descripcion);
        imagen = limpiar(imagen);
        categoria = limpiar(categoria);
    }

    /** Recorta espacios; un texto vacío se guarda como nulo. */
    private static String limpiar(String valor) {
        if (valor == null) {
            return null;
        }
        String limpio = valor.strip();
        return limpio.isEmpty() ? null : limpio;
    }
}
