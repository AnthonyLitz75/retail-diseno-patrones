package com.grupo.retail.model;

import java.math.BigDecimal;
import java.util.List;

/**
 * @param revision aumenta con cada cambio del carrito; el deshacer la compara (spec 005)
 */
public record Carrito(
                Long idCarrito,
                List<LineaCarrito> productos,
                BigDecimal total,
                long revision) {
}
