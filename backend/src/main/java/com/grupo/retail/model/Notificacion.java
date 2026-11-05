package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record Notificacion(
        Long id, Long usuarioId, Long pedidoId, String estado, String mensaje,
        boolean leida, OffsetDateTime creadaEn) {
}
