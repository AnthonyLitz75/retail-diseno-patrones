package com.grupo.retail.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class SesionCliente {

    private final SesionAutenticada sesionAutenticada;

    public SesionCliente(SesionAutenticada sesionAutenticada) {
        this.sesionAutenticada = sesionAutenticada;
    }

    public Long obtenerId(HttpServletRequest solicitud) {
        return sesionAutenticada.exigirUsuario(solicitud).usuarioId();
    }

    public SesionAutenticada getSesionAutenticada() {
        return sesionAutenticada;
    }
}
