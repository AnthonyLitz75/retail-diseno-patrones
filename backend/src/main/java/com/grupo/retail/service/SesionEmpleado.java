package com.grupo.retail.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;


@Component
public class SesionEmpleado {

    private final SesionAutenticada sesionAutenticada;

    public SesionEmpleado(SesionAutenticada sesionAutenticada) {
        this.sesionAutenticada = sesionAutenticada;
    }

    public Long obtenerId(HttpServletRequest solicitud) {
        return sesionAutenticada.exigirUsuario(solicitud).usuarioId();
    }
}
