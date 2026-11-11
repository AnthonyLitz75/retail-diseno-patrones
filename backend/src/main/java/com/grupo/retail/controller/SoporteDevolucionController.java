package com.grupo.retail.controller;

import com.grupo.retail.dto.DecidirDevolucion;
import com.grupo.retail.dto.RecepcionDevolucion;
import com.grupo.retail.model.Devolucion;
import com.grupo.retail.service.DevolucionService;
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
 * RF25 y RF26: bandeja, decisión y recepción de devoluciones. La bandeja la ven SOPORTE y
 * ADMIN; decidir y recibir son solo de SOPORTE (reglas en SecurityConfig).
 */
@RestController
@RequestMapping("/api/soporte/devoluciones")
public class SoporteDevolucionController {

    private final DevolucionService devolucionService;
    private final SesionAutenticada sesionAutenticada;

    public SoporteDevolucionController(DevolucionService devolucionService, SesionAutenticada sesionAutenticada) {
        this.devolucionService = devolucionService;
        this.sesionAutenticada = sesionAutenticada;
    }

    @GetMapping
    public List<Devolucion> bandeja(@RequestParam(required = false) String estado) {
        return devolucionService.listarBandeja(estado);
    }

    @PutMapping("/{id}/decision")
    public Devolucion decidir(
            @PathVariable Long id, @Valid @RequestBody DecidirDevolucion datos, HttpServletRequest solicitud) {
        return devolucionService.decidir(id, agente(solicitud), datos);
    }

    @PutMapping("/{id}/recepcion")
    public Devolucion recibir(
            @PathVariable Long id, @Valid @RequestBody RecepcionDevolucion datos, HttpServletRequest solicitud) {
        return devolucionService.cerrar(id, agente(solicitud), datos);
    }

    private long agente(HttpServletRequest solicitud) {
        return sesionAutenticada.exigirUsuario(solicitud).usuarioId();
    }
}
