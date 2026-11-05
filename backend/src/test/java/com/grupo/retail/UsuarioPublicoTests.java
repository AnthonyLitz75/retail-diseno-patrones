package com.grupo.retail;

import com.grupo.retail.model.Usuario;
import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertFalse;

class UsuarioPublicoTests {

    @Test
    void modeloPublicoNoExponeCamposDeContrasena() {
        assertFalse(Arrays.stream(Usuario.class.getRecordComponents())
                .anyMatch(componente -> componente.getName().toLowerCase().contains("clave")
                        || componente.getName().toLowerCase().contains("password")
                        || componente.getName().toLowerCase().contains("hash")));
    }
}
