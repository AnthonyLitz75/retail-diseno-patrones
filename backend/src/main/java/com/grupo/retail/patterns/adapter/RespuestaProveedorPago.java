package com.grupo.retail.patterns.adapter;

public record RespuestaProveedorPago(
                boolean aceptado,
                String referencia,
                String descripcion) {
}
