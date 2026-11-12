package com.grupo.retail;

import com.grupo.retail.dto.NuevoProducto;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class NuevoProductoValidationTests {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void categoriaVaciaONulaDebeFallarValidacion() {
        NuevoProducto productoNullCat = new NuevoProducto("Teclado RGB", null, new BigDecimal("150.00"), 10);
        Set<ConstraintViolation<NuevoProducto>> violacionesNull = validator.validate(productoNullCat);
        assertFalse(violacionesNull.isEmpty(), "Debe fallar validación cuando categoría es null");

        NuevoProducto productoBlankCat = new NuevoProducto("Teclado RGB", "   ", new BigDecimal("150.00"), 10);
        Set<ConstraintViolation<NuevoProducto>> violacionesBlank = validator.validate(productoBlankCat);
        assertFalse(violacionesBlank.isEmpty(), "Debe fallar validación cuando categoría está en blanco");
    }

    @Test
    void productoValidoPasaValidacionYTrimeaCampos() {
        NuevoProducto productoValido = new NuevoProducto("  Teclado RGB  ", "  Periféricos  ", new BigDecimal("150.00"), 10);
        Set<ConstraintViolation<NuevoProducto>> violaciones = validator.validate(productoValido);
        assertTrue(violaciones.isEmpty(), "No debe haber violaciones para datos válidos");
        assertEquals("Periféricos", productoValido.categoria());
    }

    private static NuevoProducto ficha(String sku, String precio, String precioAnterior, String imagen) {
        return new NuevoProducto("Teclado", "Teclados", new BigDecimal(precio), 3, sku, "  Logitech ", "   ",
                imagen, precioAnterior == null ? null : new BigDecimal(precioAnterior), null);
    }

    private static Set<String> mensajes(NuevoProducto datos) {
        return validator.validate(datos).stream().map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }

    @Test
    void normalizaCodigoYTextosOpcionales() {
        NuevoProducto datos = ficha(" pa-0099 ", "100.00", null, null);

        assertTrue(mensajes(datos).isEmpty(), mensajes(datos).toString());
        assertEquals("PA-0099", datos.sku());
        assertEquals("Logitech", datos.marca());
        assertNull(datos.descripcion(), "un texto en blanco se guarda como nulo");
        assertEquals(Boolean.FALSE, datos.nuevo(), "sin marcar, el producto no es nuevo");
    }

    @Test
    void elConstructorCortoDejaLosOpcionalesVacios() {
        NuevoProducto datos = new NuevoProducto("Mouse", "Mouse", new BigDecimal("49.00"), 1);

        assertNull(datos.sku());
        assertNull(datos.precioAnterior());
        assertEquals(Boolean.FALSE, datos.nuevo());
    }

    @Test
    void rechazaCodigoInvalido() {
        assertTrue(mensajes(ficha("P A", "100.00", null, null)).stream().anyMatch(m -> m.startsWith("El código")));
        assertTrue(mensajes(ficha("<b>", "100.00", null, null)).stream().anyMatch(m -> m.startsWith("El código")));
    }

    @Test
    void elPrecioAnteriorDebeSerUnDescuento() {
        String mensaje = "El precio anterior debe ser mayor que el precio actual";
        assertTrue(mensajes(ficha(null, "100.00", "100.00", null)).contains(mensaje));
        assertTrue(mensajes(ficha(null, "100.00", "80.00", null)).contains(mensaje));
        assertTrue(mensajes(ficha(null, "100.00", "120.00", null)).isEmpty());
    }

    @Test
    void laImagenSoloAceptaHttpORutaRelativa() {
        assertFalse(mensajes(ficha(null, "100.00", null, "javascript:alert(1)")).isEmpty());
        assertTrue(mensajes(ficha(null, "100.00", null, "https://cdn.ejemplo.pe/a.webp")).isEmpty());
        assertTrue(mensajes(ficha(null, "100.00", null, "/img/productos/a.webp")).isEmpty());
    }
}
