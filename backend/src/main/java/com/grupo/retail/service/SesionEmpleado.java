package com.grupo.retail.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;


@Component
public class SesionEmpleado {

    private final SesionAutenticada sesionAutenticada;

    public SesionEmpleado(SesionAutenticada sesionAutenticada) {
        this.sesionAutenticada = sesionAutenticada;
    }

    public Long exigirRol(HttpServletRequest solicitud, String... rolesPermitidos) {
        return sesionAutenticada.exigirRol(solicitud, rolesPermitidos).usuarioId();
    }
}
