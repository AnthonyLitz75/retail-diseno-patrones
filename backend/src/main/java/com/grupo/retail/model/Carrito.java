package com.grupo.retail.model;

import java.math.BigDecimal;
import java.util.List;

public record Carrito(
                Long idCarrito,
                List<LineaCarrito> productos,
                BigDecimal total) {
}