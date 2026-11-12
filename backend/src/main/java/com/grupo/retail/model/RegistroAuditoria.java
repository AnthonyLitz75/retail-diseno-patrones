package com.grupo.retail.model;

import java.time.OffsetDateTime;

/** Fila del registro de auditoría tal como la consulta el administrador. */
public record RegistroAuditoria(
        long id,
        OffsetDateTime fecha,
        Long usuarioId,
        String usuarioNombre,
        String usuarioCorreo,
        String rol,
        String accion,
        String accionEtiqueta,
        String entidad,
        Long entidadId,
        String detalle) {
}
