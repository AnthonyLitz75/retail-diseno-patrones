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
}
