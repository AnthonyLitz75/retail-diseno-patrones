package com.grupo.retail;

import com.grupo.retail.model.EstadoReclamo;
import org.junit.jupiter.api.Test;

import static com.grupo.retail.model.EstadoReclamo.*;
import static org.junit.jupiter.api.Assertions.*;

/** Spec 006, FR-001: transiciones permitidas y prohibidas del reclamo. */
class EstadoReclamoTests {

    @Test
    void transicionesPermitidas() {
        assertDoesNotThrow(() -> ABIERTO.validarTransicion(EN_ATENCION));
        assertDoesNotThrow(() -> EN_ATENCION.validarTransicion(RESUELTO));
        assertDoesNotThrow(() -> EN_ATENCION.validarTransicion(ESCALADO));
        assertDoesNotThrow(() -> ESCALADO.validarTransicion(EN_ATENCION));
        assertDoesNotThrow(() -> ESCALADO.validarTransicion(RESUELTO));
    }

    @Test
    void transicionesProhibidas() {
        assertThrows(IllegalStateException.class, () -> ABIERTO.validarTransicion(RESUELTO));
        assertThrows(IllegalStateException.class, () -> ABIERTO.validarTransicion(ESCALADO));
        assertThrows(IllegalStateException.class, () -> EN_ATENCION.validarTransicion(ABIERTO));
        for (EstadoReclamo destino : values()) {
            assertThrows(IllegalStateException.class, () -> RESUELTO.validarTransicion(destino),
                    "Un reclamo resuelto es terminal");
        }
    }

    @Test
    void filtroDeBandeja() {
        assertEquals(ESCALADO, desdeFiltro("ESCALADO"));
        assertThrows(IllegalArgumentException.class, () -> desdeFiltro("INVENTADO"));
        assertThrows(IllegalArgumentException.class, () -> desdeFiltro("escalado"));
    }
}
