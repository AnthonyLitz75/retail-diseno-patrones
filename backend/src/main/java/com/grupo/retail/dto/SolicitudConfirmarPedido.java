package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitudConfirmarPedido(
        @NotBlank(message = "Indica el escenario de pago de prueba")
        @Pattern(
                regexp = "PRUEBA_APROBADA|PRUEBA_RECHAZADA",
                message = "Usa PRUEBA_APROBADA o PRUEBA_RECHAZADA")
        String metodoPago,

        @Pattern(
                regexp = "^$|[0-9a-fA-F-]{36}",
                message = "La clave de confirmación debe ser un UUID válido")
        String claveConfirmacion,

        @Size(max = 120, message = "El destinatario no puede superar 120 caracteres")
        String destinatario,

        @Size(max = 250, message = "La dirección de envío no puede superar 250 caracteres")
        String direccionEnvio) {

    public SolicitudConfirmarPedido(String metodoPago) {
        this(metodoPago, null, null, null);
    }
}
