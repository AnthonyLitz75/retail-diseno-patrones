package com.grupo.retail.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;


@Component
public class SesionEmpleado {

    public Long exigirRol(HttpServletRequest solicitud, String... rolesPermitidos) {
        HttpSession sesion = solicitud.getSession(false);
        if (sesion == null || !(sesion.getAttribute("usuarioId") instanceof Long usuarioId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar");
        }

        Object valorRol = sesion.getAttribute("usuarioRol");
        Set<String> permitidos = Set.of(rolesPermitidos);
        if (!(valorRol instanceof String rol) || !permitidos.contains(rol)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu rol no puede realizar esta operación");
        }
        return usuarioId;
    }
}
