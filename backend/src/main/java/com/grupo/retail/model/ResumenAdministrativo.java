package com.grupo.retail.model;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Panel de supervisión del administrador (RF05, spec 007 US6). {@code pedidosVendidos} y
 * {@code ventasNetas} salen de la misma consulta que el CSV de ventas (FR-002) y excluyen
 * los pedidos cancelados; {@code pedidosPorEstado} sí los incluye. {@code escalados} es el
 * número de reclamos escalados que siguen abiertos, sin filtro de fechas.
 */
public record ResumenAdministrativo(
        long pedidosVendidos,
        BigDecimal ventasNetas,
        long productosActivos,
        long unidadesEnStock,
        BigDecimal valorInventario,
        Map<String, Long> movimientos,
        Map<String, Long> pedidosPorEstado,
        long escalados,
        List<MovimientoReporte> ultimosMovimientos) {
}
