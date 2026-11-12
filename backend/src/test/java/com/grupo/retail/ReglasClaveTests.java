package com.grupo.retail;

import com.grupo.retail.dto.RegistroCliente;
import com.grupo.retail.dto.RegistroPersonal;
import com.grupo.retail.dto.ReglasClave;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * La contraseña de una cuenta nueva (cliente o personal) cumple las tres reglas que el
 * formulario de registro marca en vivo: 8 a 72 caracteres, una mayúscula y un número.
 */
class ReglasClaveTests {

    private static Validator validator;

    @BeforeAll
    static void preparar() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private static Set<String> erroresCliente(String clave) {
        return validator.validate(new RegistroCliente("Ana", "ana@example.com", clave)).stream()
                .map(ConstraintViolation::getMessage).collect(Collectors.toSet());
    }

    private static Set<String> erroresPersonal(String clave) {
        return validator.validate(new RegistroPersonal("Ana", "ana@example.com", clave, "VENDEDOR")).stream()
                .map(ConstraintViolation::getMessage).collect(Collectors.toSet());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Segura123*", "Ñandú2026x", "ABCDEFG1"})
    void aceptaClavesConMayusculaYNumero(String clave) {
        assertTrue(erroresCliente(clave).isEmpty(), erroresCliente(clave).toString());
        assertTrue(erroresPersonal(clave).isEmpty(), erroresPersonal(clave).toString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"clave-segura1", "SINNUMEROS", "solominusculas"})
    void rechazaClavesSinMayusculaOSinNumero(String clave) {
        assertEquals(Set.of(ReglasClave.MENSAJE), erroresCliente(clave));
        assertEquals(Set.of(ReglasClave.MENSAJE), erroresPersonal(clave));
    }

    @ParameterizedTest
    @ValueSource(strings = {"Corta1", "A1"})
    void laLongitudSigueValidandoseAparte(String clave) {
        assertTrue(erroresCliente(clave).contains("La contraseña debe tener entre 8 y 72 caracteres"));
    }
}
