package com.grupo.retail.model;

import java.math.BigDecimal;

public record Producto(
                Long id,
                String nombre,
                String categoria,
                BigDecimal precio,
                int stock,
                boolean activo) {
}