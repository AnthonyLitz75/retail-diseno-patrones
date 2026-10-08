package com.grupo.retail.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class SesionCliente {

    public Long obtenerId(HttpServletRequest solicitud) {
        HttpSession sesion = solicitud.getSession(false);
        if (sesion == null || !(sesion.getAttribute("usuarioId") instanceof Long usuarioId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para usar el carrito");
        }
        if (!"CLIENTE".equals(sesion.getAttribute("usuarioRol"))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "El carrito es solo para clientes");
        }
        return usuarioId;
    }
}