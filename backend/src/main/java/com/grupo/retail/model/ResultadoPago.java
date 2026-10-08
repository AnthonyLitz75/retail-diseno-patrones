package com.grupo.retail.model;

public record ResultadoPago(
        boolean aprobado,
        String metodo,
        String estado,
        String referencia,
        String mensaje) {
}
