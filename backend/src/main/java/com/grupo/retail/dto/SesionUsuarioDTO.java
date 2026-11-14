package com.grupo.retail.dto;

/**
 * DTO tipado para la respuesta del endpoint de consulta de sesión (/api/auth/sesion),
 * eliminando el uso de mapas genéricos y tipos comodín ResponseEntity<?>.
 */
public record SesionUsuarioDTO(
        Long idUsuario,
        String nombre,
        String correo,
        String rol) {
}
