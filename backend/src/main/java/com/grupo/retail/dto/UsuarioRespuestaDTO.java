package com.grupo.retail.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.grupo.retail.model.Usuario;

import java.time.OffsetDateTime;

/**
 * DTO de respuesta para usuarios autenticados o registrados, desacoplado de la entidad {@link Usuario}.
 * Soporta serialización limpia sin comodines (ResponseEntity<?>) en AuthController.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record UsuarioRespuestaDTO(
        Long idUsuario,
        String nombre,
        String correo,
        String rol,
        Boolean activo,
        OffsetDateTime fechaAlta,
        String error) {

    public static UsuarioRespuestaDTO desde(Usuario usuario) {
        if (usuario == null) {
            return null;
        }
        return new UsuarioRespuestaDTO(
                usuario.idUsuario(),
                usuario.nombre(),
                usuario.correo(),
                usuario.rol(),
                usuario.activo(),
                usuario.fechaAlta(),
                null);
    }

    public static UsuarioRespuestaDTO conError(String error) {
        return new UsuarioRespuestaDTO(null, null, null, null, null, null, error);
    }
}
