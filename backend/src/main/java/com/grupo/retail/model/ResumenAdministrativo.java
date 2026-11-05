package com.grupo.retail.model;

import java.math.BigDecimal;
import java.util.Map;

public record ResumenAdministrativo(
        long pedidosVendidos,
        BigDecimal totalVentas,
        long productosActivos,
        long unidadesEnStock,
        BigDecimal valorInventario,
        Map<String, Long> movimientos) {
}
