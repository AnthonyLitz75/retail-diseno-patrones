package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record EventoEstadoPedido(
        String estado,
        String responsable,
        String comentario,
        OffsetDateTime fecha) {
}
