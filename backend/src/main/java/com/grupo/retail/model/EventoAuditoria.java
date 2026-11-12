package com.grupo.retail.model;

import java.util.Objects;

/**
 * Una acción por registrar en la auditoría.
 *
 * @param usuarioId     quién la hizo; {@code null} si no hay sesión (por ejemplo, un inicio
 *                      de sesión fallido con un correo que no existe)
 * @param usuarioCorreo correo del actor; si es {@code null} se toma el de la cuenta al registrar
 * @param rol           rol del actor; si es {@code null} se toma el de la cuenta al registrar
 * @param entidad       tipo de objeto afectado (USUARIO, PRODUCTO, CATEGORIA, PEDIDO, REPORTE)
 * @param entidadId     id del objeto afectado, si tiene
 * @param detalle       qué cambió, en texto corto (se recorta a 500 caracteres)
 */
public record EventoAuditoria(
        Long usuarioId,
        String usuarioCorreo,
        String rol,
        AccionAuditoria accion,
        String entidad,
        Long entidadId,
        String detalle) {

    public static final int LARGO_MAXIMO_DETALLE = 500;

    public EventoAuditoria {
        Objects.requireNonNull(accion, "La acción de auditoría es obligatoria");
        detalle = detalle == null ? "" : detalle.strip();
        if (detalle.length() > LARGO_MAXIMO_DETALLE) {
            detalle = detalle.substring(0, LARGO_MAXIMO_DETALLE - 1) + "…";
        }
    }

    /** Acción de un usuario con sesión: el correo y el rol se completan desde su cuenta. */
    public static EventoAuditoria de(Long usuarioId, AccionAuditoria accion, String entidad, Long entidadId,
            String detalle) {
        return new EventoAuditoria(usuarioId, null, null, accion, entidad, entidadId, detalle);
    }
}
