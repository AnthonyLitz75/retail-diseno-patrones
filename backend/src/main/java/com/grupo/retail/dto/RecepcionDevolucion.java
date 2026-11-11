package com.grupo.retail.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * RF25 y RF26: recepción de una devolución APROBADA; debe incluir cada línea una vez.
 * {@code escenarioReembolso} solo existe para el proveedor simulado (PRUEBA_RECHAZADA
 * demuestra la reversión completa); si se omite, el reembolso de prueba se aprueba.
 */
public record RecepcionDevolucion(
        @NotEmpty(message = "Indica el resultado de cada línea")
        @Size(max = 100, message = "Demasiadas líneas en la recepción")
        List<@Valid @NotNull LineaRecepcionDevolucion> lineas,
        @Size(max = 30, message = "Escenario de reembolso no válido")
        String escenarioReembolso) {
}
