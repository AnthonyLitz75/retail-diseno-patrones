package com.grupo.retail.patterns.pago;

public record RespuestaProveedorPago(
                boolean aceptado,
                String referencia,
                String descripcion) {
}
