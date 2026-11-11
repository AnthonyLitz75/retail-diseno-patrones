package com.grupo.retail.patterns.pago;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/** Proveedor de pagos de prueba; el escenario decide si la operación se acepta. */
@Component
public class ProveedorPagoSimulado {

    public static final String APROBADA = "PRUEBA_APROBADA";
    public static final String RECHAZADA = "PRUEBA_RECHAZADA";

    public RespuestaProveedorPago cobrar(BigDecimal monto, String escenario) {
        exigirMontoPositivo(monto);
        boolean aprobado = APROBADA.equals(escenario);
        String descripcion = aprobado
                ? "Pago de prueba aprobado"
                : "Pago de prueba rechazado";
        return new RespuestaProveedorPago(
                aprobado, "SIM-" + UUID.randomUUID(), descripcion);
    }

    /**
     * Reembolso de prueba: se acepta salvo el escenario PRUEBA_RECHAZADA, que permite
     * demostrar la reversión completa del cierre de una devolución.
     */
    public RespuestaProveedorPago devolver(BigDecimal monto, String referenciaCobro, String escenario) {
        exigirMontoPositivo(monto);
        if (referenciaCobro == null || referenciaCobro.isBlank()) {
            throw new IllegalArgumentException("Falta la referencia del cobro a reembolsar");
        }
        boolean aprobado = !RECHAZADA.equals(escenario);
        String descripcion = aprobado
                ? "Reembolso de prueba aprobado"
                : "Reembolso de prueba rechazado por el proveedor";
        return new RespuestaProveedorPago(aprobado, "REM-" + UUID.randomUUID(), descripcion);
    }

    private static void exigirMontoPositivo(BigDecimal monto) {
        if (monto == null || monto.signum() <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor que cero");
        }
    }
}
