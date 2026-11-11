package com.grupo.retail.controller;

import com.grupo.retail.dto.ReasignarReclamo;
import com.grupo.retail.dto.ResolverIncidencia;
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
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** RF28: reclamos escalados que atiende el administrador (/api/admin/** es solo ADMIN). */
@RestController
@RequestMapping("/api/admin/incidencias")
public class IncidenciaAdminController {

    private final ReclamoService reclamoService;
    private final SesionAutenticada sesionAutenticada;

    public IncidenciaAdminController(ReclamoService reclamoService, SesionAutenticada sesionAutenticada) {
        this.reclamoService = reclamoService;
        this.sesionAutenticada = sesionAutenticada;
    }

    @GetMapping
    public List<Reclamo> escaladas() {
        return reclamoService.listarIncidencias();
    }

    /** T013: reclamos en atención cuyo agente fue desactivado; el administrador los reasigna. */
    @GetMapping("/sin-agente")
    public List<Reclamo> sinAgente() {
        return reclamoService.listarSinAgente();
    }

    @PutMapping("/{id}/reasignar")
    public Reclamo reasignar(@PathVariable Long id, @Valid @RequestBody ReasignarReclamo datos) {
        return reclamoService.reasignar(id, datos);
    }

    @PutMapping("/{id}/resolver")
    public Reclamo resolver(
            @PathVariable Long id, @Valid @RequestBody ResolverIncidencia datos, HttpServletRequest solicitud) {
        return reclamoService.resolverIncidencia(id, sesionAutenticada.exigirUsuario(solicitud).usuarioId(), datos);
    }
}
