package com.grupo.retail.patterns.adapter;

import com.grupo.retail.model.ResultadoPago;

import java.math.BigDecimal;

/**
 * Puerto de pagos (patrón Adapter): el dominio cobra y reembolsa sin conocer al proveedor.
 */
public interface PuertoPago {
    ResultadoPago procesar(BigDecimal monto, String escenario);

    /**
     * Spec 006, RF26: reembolsa parte de un cobro aprobado. Un resultado no aprobado obliga
     * al llamador a revertir su transacción.
     */
    ResultadoPago reembolsar(BigDecimal monto, String referenciaCobro, String escenario);
}
