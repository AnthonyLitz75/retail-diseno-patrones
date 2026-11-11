package com.grupo.retail;

import com.grupo.retail.model.EstadoDevolucion;
import org.junit.jupiter.api.Test;

import static com.grupo.retail.model.EstadoDevolucion.*;
import static org.junit.jupiter.api.Assertions.*;

/** Spec 006, FR-001 y FR-003: transiciones de la devolución y estados que consumen saldo. */
class EstadoDevolucionTests {

    @Test
    void transicionesPermitidas() {
        assertDoesNotThrow(() -> SOLICITADA.validarTransicion(APROBADA));
        assertDoesNotThrow(() -> SOLICITADA.validarTransicion(RECHAZADA));
        assertDoesNotThrow(() -> APROBADA.validarTransicion(CERRADA));
    }

    @Test
    void transicionesProhibidas() {
        assertThrows(IllegalStateException.class, () -> SOLICITADA.validarTransicion(CERRADA),
                "No se recibe sin aprobar");
        assertThrows(IllegalStateException.class, () -> APROBADA.validarTransicion(RECHAZADA));
        for (EstadoDevolucion destino : values()) {
            assertThrows(IllegalStateException.class, () -> CERRADA.validarTransicion(destino));
            assertThrows(IllegalStateException.class, () -> RECHAZADA.validarTransicion(destino));
        }
    }

    @Test
    void soloLaRechazadaLiberaSaldo() {
        assertTrue(SOLICITADA.comprometeSaldo());
        assertTrue(APROBADA.comprometeSaldo());
        assertTrue(CERRADA.comprometeSaldo());
        assertFalse(RECHAZADA.comprometeSaldo());
    }

    @Test
    void filtroDeBandeja() {
        assertEquals(APROBADA, desdeFiltro("APROBADA"));
        assertThrows(IllegalArgumentException.class, () -> desdeFiltro("aprobada"));
    }
}
