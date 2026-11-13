package com.grupo.retail;

import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.adapter.PagoPruebaAdapter;
import com.grupo.retail.patterns.adapter.ProveedorPagoSimulado;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/** Adapter de pagos: cobro (spec 004) y reembolso simulable (spec 006, T003b). */
class PagoAdapterTests {

    private final PagoPruebaAdapter adapter = new PagoPruebaAdapter(new ProveedorPagoSimulado());
    private static final BigDecimal MONTO = new BigDecimal("10.00");

    @Test
    void cobroSoloSeApruebaConElEscenarioAprobado() {
        ResultadoPago aprobado = adapter.procesar(MONTO, "PRUEBA_APROBADA");
        assertTrue(aprobado.aprobado());
        assertEquals("APROBADO", aprobado.estado());
        assertEquals("RECHAZADO", adapter.procesar(MONTO, null).estado());
    }

    @Test
    void reembolsoSeApruebaPorDefectoYSeRechazaConElEscenario() {
        ResultadoPago aprobado = adapter.reembolsar(MONTO, "SIM-1", null);
        assertTrue(aprobado.aprobado());
        assertEquals("REEMBOLSADO", aprobado.estado());
        assertTrue(aprobado.referencia().startsWith("REM-"));

        ResultadoPago rechazado = adapter.reembolsar(MONTO, "SIM-1", "PRUEBA_RECHAZADA");
        assertFalse(rechazado.aprobado());
        assertEquals("RECHAZADO", rechazado.estado());
    }

    @Test
    void reembolsoExigeMontoPositivoYReferencia() {
        assertThrows(IllegalArgumentException.class, () -> adapter.reembolsar(BigDecimal.ZERO, "SIM-1", null));
        assertThrows(IllegalArgumentException.class, () -> adapter.reembolsar(MONTO, " ", null));
    }
}
