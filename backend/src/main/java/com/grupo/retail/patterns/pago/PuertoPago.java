package com.grupo.retail.patterns.pago;

import com.grupo.retail.model.ResultadoPago;

import java.math.BigDecimal;

public interface PuertoPago {
    ResultadoPago procesar(BigDecimal monto, String escenario);
}
