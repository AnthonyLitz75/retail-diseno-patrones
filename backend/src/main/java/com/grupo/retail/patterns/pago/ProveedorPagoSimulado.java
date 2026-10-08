package com.grupo.retail.patterns.pago;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class ProveedorPagoSimulado {

    public RespuestaProveedorPago cobrar(BigDecimal monto, String escenario) {
        if (monto == null || monto.signum() <= 0) {
            throw new IllegalArgumentException("El monto debe ser mayor que cero");
        }

        boolean aprobado = "PRUEBA_APROBADA".equals(escenario);
        String descripcion = aprobado
                ? "Pago de prueba aprobado"
                : "Pago de prueba rechazado";
        return new RespuestaProveedorPago(
                aprobado, "SIM-" + UUID.randomUUID(), descripcion);
    }
}
