package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record SolicitudConfirmarPedido(
        @NotBlank(message = "Indica el escenario de pago de prueba")
        @Pattern(
                regexp = "PRUEBA_APROBADA|PRUEBA_RECHAZADA",
                message = "Usa PRUEBA_APROBADA o PRUEBA_RECHAZADA")
        String metodoPago) {
}
