package com.grupo.retail.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Locale;

/**
 * Ficha de un producto nuevo (boceto "Panel vendedor - Nuevo producto"). Nombre, categoría,
 * precio y stock de apertura son obligatorios; el resto es opcional. Si no llega código, el
 * servicio genera uno con el formato del catálogo (PA-0033). La imagen sigue la misma regla
 * que {@link EditarProducto}: URL http(s) o ruta que empiece con /, nunca {@code javascript:}.
 */
public record NuevoProducto(
        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 120, message = "El nombre no puede superar 120 caracteres")
        String nombre,

        @NotBlank(message = "La categoría es obligatoria")
        @Size(max = 80, message = "La categoría no puede superar 80 caracteres")
        String categoria,

        @NotNull(message = "El precio es obligatorio")
        @Positive(message = "El precio debe ser mayor que cero")
        @Digits(integer = 8, fraction = 2, message = "El precio admite hasta dos decimales")
        BigDecimal precio,

        @NotNull(message = "El stock es obligatorio")
        @PositiveOrZero(message = "El stock no puede ser negativo")
        Integer stock,

        @Pattern(regexp = "^[A-Z0-9][A-Z0-9-]{2,29}$",
                message = "El código usa de 3 a 30 letras, números o guiones (ej. PA-0033)")
        String sku,

        @Size(max = 80, message = "La marca no puede superar 80 caracteres")
        String marca,

        @Size(max = 1000, message = "La descripción no puede superar 1000 caracteres")
        String descripcion,

        @Size(max = 255, message = "La imagen no puede superar 255 caracteres")
        @Pattern(regexp = "^(https?://|/)[^\\s\"'<>]*$",
                message = "La imagen debe ser una URL http(s) o una ruta que empiece con /")
        String imagen,

        @Positive(message = "El precio anterior debe ser mayor que cero")
        @Digits(integer = 8, fraction = 2, message = "El precio anterior admite hasta dos decimales")
        BigDecimal precioAnterior,

        Boolean nuevo) {

    public NuevoProducto {
        nombre = limpiar(nombre);
        categoria = limpiar(categoria);
        sku = sku == null ? null : limpiar(sku.toUpperCase(Locale.ROOT));
        marca = limpiar(marca);
        descripcion = limpiar(descripcion);
        imagen = limpiar(imagen);
        nuevo = Boolean.TRUE.equals(nuevo);
    }

    /** Solo los datos mínimos; el resto queda vacío y el código se genera al guardar. */
    public NuevoProducto(String nombre, String categoria, BigDecimal precio, Integer stock) {
        this(nombre, categoria, precio, stock, null, null, null, null, null, false);
    }

    /** El precio anterior solo tiene sentido como descuento: debe superar al precio actual. */
    @AssertTrue(message = "El precio anterior debe ser mayor que el precio actual")
    public boolean isPrecioAnteriorMayorQuePrecio() {
        return precioAnterior == null || precio == null || precioAnterior.compareTo(precio) > 0;
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
