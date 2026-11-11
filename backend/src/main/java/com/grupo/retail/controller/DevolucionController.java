package com.grupo.retail.controller;

import com.grupo.retail.dto.SolicitarDevolucion;
import com.grupo.retail.model.Devolucion;
import com.grupo.retail.service.DevolucionService;
import com.grupo.retail.service.SesionAutenticada;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** RF14: devoluciones del cliente. El cliente sale siempre de la sesión, nunca del cuerpo. */
@RestController
@RequestMapping("/api")
public class DevolucionController {

    private final DevolucionService devolucionService;
    private final SesionAutenticada sesionAutenticada;

    public DevolucionController(DevolucionService devolucionService, SesionAutenticada sesionAutenticada) {
        this.devolucionService = devolucionService;
        this.sesionAutenticada = sesionAutenticada;
    }

    @PostMapping("/pedidos/{id}/devoluciones")
    public ResponseEntity<Devolucion> solicitar(
            @PathVariable Long id, @Valid @RequestBody SolicitarDevolucion datos, HttpServletRequest solicitud) {
        long clienteId = sesionAutenticada.exigirUsuario(solicitud).usuarioId();
        return ResponseEntity.status(HttpStatus.CREATED).body(devolucionService.solicitar(clienteId, id, datos));
    }

    @GetMapping("/devoluciones/mis-devoluciones")
    public List<Devolucion> misDevoluciones(HttpServletRequest solicitud) {
        return devolucionService.listarDelCliente(sesionAutenticada.exigirUsuario(solicitud).usuarioId());
    }
}
