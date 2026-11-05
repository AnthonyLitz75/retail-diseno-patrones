package com.grupo.retail.controller;

import com.grupo.retail.model.Notificacion;
import com.grupo.retail.service.NotificacionService;
import com.grupo.retail.service.SesionCliente;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {
    private final NotificacionService notificacionService;
    private final SesionCliente sesionCliente;
    public NotificacionController(NotificacionService notificacionService, SesionCliente sesionCliente) {
        this.notificacionService = notificacionService;
        this.sesionCliente = sesionCliente;
    }
    @GetMapping("/mias")
    public List<Notificacion> listarMias(
            @RequestParam(required = false) Long antesDeId,
            @RequestParam(defaultValue = "50") int limite,
            HttpServletRequest request) {
        Long clienteId = sesionCliente.obtenerId(request);
        return notificacionService.listar(clienteId, antesDeId, limite);
    }
}
