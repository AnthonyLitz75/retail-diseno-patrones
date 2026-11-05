package com.grupo.retail.service;

import com.grupo.retail.dao.UsuarioDAO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

@Component
public class SesionAutenticada {
    private final UsuarioDAO usuarioDAO;

    public SesionAutenticada(UsuarioDAO usuarioDAO) {
        this.usuarioDAO = usuarioDAO;
    }

    public UsuarioSesion exigirUsuario(HttpServletRequest solicitud) {
        HttpSession sesion = solicitud.getSession(false);
        if (sesion == null || !(sesion.getAttribute("usuarioId") instanceof Long usuarioId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar");
        }
        if (!(sesion.getAttribute("usuarioRol") instanceof String rol) || rol.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión no contiene un rol válido");
        }
        if (!usuarioDAO.sesionSigueVigente(usuarioId, rol)) {
            sesion.invalidate();
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "La cuenta o el rol cambiaron; inicia sesión nuevamente");
        }
        return new UsuarioSesion(usuarioId, rol);
    }

    public UsuarioSesion exigirRol(HttpServletRequest solicitud, String... rolesPermitidos) {
        UsuarioSesion usuario = exigirUsuario(solicitud);
        if (!Set.of(rolesPermitidos).contains(usuario.rol())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu rol no puede realizar esta operación");
        }
        return usuario;
    }

    public record UsuarioSesion(Long usuarioId, String rol) {
    }
}