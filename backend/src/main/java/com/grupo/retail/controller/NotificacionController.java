package com.grupo.retail.controller;

import com.grupo.retail.model.Notificacion;
import com.grupo.retail.service.NotificacionService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionCliente;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {
    private final NotificacionService notificacionService;
    private final SesionAutenticada sesionAutenticada;

    @org.springframework.beans.factory.annotation.Autowired
    public NotificacionController(NotificacionService notificacionService, SesionAutenticada sesionAutenticada) {
        this.notificacionService = notificacionService;
        this.sesionAutenticada = sesionAutenticada;
    }

    public NotificacionController(NotificacionService notificacionService, SesionCliente sesionCliente) {
        this(notificacionService, sesionCliente.getSesionAutenticada());
    }

    @GetMapping("/mias")
    public List<Notificacion> listarMias(
            @RequestParam(required = false) Long antesDeId,
            @RequestParam(defaultValue = "50") int limite,
            HttpServletRequest request) {
        Long usuarioId = sesionAutenticada.exigirUsuario(request).usuarioId();
        return notificacionService.listar(usuarioId, antesDeId, limite);
    }

    @PatchMapping("/{id}/leida")
    public Notificacion marcarLeida(@PathVariable Long id, HttpServletRequest request) {
        Long usuarioId = sesionAutenticada.exigirUsuario(request).usuarioId();
        return notificacionService.marcarLeida(usuarioId, id);
    }
}
