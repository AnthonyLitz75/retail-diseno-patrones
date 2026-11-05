package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record ConsultaProducto(
        Long idConsulta,
        Long productoId,
        String nombreProducto,
        String clienteNombre,
        String pregunta,
        String respuesta,
        OffsetDateTime creadaEn,
        OffsetDateTime respondidaEn) {
}
