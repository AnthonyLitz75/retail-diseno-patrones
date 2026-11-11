package com.grupo.retail.controller;

import com.grupo.retail.dto.EscalarReclamo;
import com.grupo.retail.dto.ResponderReclamo;
import com.grupo.retail.model.Reclamo;
import com.grupo.retail.service.ReclamoService;
import com.grupo.retail.service.SesionAutenticada;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF24 y RF28: bandeja y atención de reclamos. La bandeja la ven SOPORTE y ADMIN; tomar,
 * responder y escalar son solo de SOPORTE (reglas en SecurityConfig). El agente
 * responsable sale de la sesión.
 */
@RestController
@RequestMapping("/api/soporte/reclamos")
public class SoporteReclamoController {

    private final ReclamoService reclamoService;
    private final SesionAutenticada sesionAutenticada;

    public SoporteReclamoController(ReclamoService reclamoService, SesionAutenticada sesionAutenticada) {
        this.reclamoService = reclamoService;
        this.sesionAutenticada = sesionAutenticada;
    }

    @GetMapping
    public List<Reclamo> bandeja(@RequestParam(required = false) String estado) {
        return reclamoService.listarBandeja(estado);
    }

    @PutMapping("/{id}/tomar")
    public Reclamo tomar(@PathVariable Long id, HttpServletRequest solicitud) {
        return reclamoService.tomar(id, agente(solicitud));
    }

    @PutMapping("/{id}/responder")
    public Reclamo responder(
            @PathVariable Long id, @Valid @RequestBody ResponderReclamo datos, HttpServletRequest solicitud) {
        return reclamoService.responder(id, agente(solicitud), datos);
    }

    @PutMapping("/{id}/escalar")
    public Reclamo escalar(
            @PathVariable Long id, @Valid @RequestBody EscalarReclamo datos, HttpServletRequest solicitud) {
        return reclamoService.escalar(id, agente(solicitud), datos);
    }

    private long agente(HttpServletRequest solicitud) {
        return sesionAutenticada.exigirUsuario(solicitud).usuarioId();
    }
}
