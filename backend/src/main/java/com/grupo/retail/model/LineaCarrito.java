package com.grupo.retail.model;

import java.math.BigDecimal;

public record LineaCarrito(
                Long productoId,
                String nombre,
                String categoria,
                BigDecimal precio,
                int cantidad,
                BigDecimal subtotal,
                int stockDisponible) {
}