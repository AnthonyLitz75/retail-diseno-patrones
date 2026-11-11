package com.grupo.retail.controller;

import com.grupo.retail.dto.RegistrarReclamo;
import com.grupo.retail.model.Reclamo;
import com.grupo.retail.service.ReclamoService;
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

/** RF13: reclamos del cliente. El cliente sale siempre de la sesión, nunca del cuerpo. */
@RestController
@RequestMapping("/api")
public class ReclamoController {

    private final ReclamoService reclamoService;
    private final SesionAutenticada sesionAutenticada;

    public ReclamoController(ReclamoService reclamoService, SesionAutenticada sesionAutenticada) {
        this.reclamoService = reclamoService;
        this.sesionAutenticada = sesionAutenticada;
    }

    @PostMapping("/pedidos/{id}/reclamos")
    public ResponseEntity<Reclamo> registrar(
            @PathVariable Long id, @Valid @RequestBody RegistrarReclamo datos, HttpServletRequest solicitud) {
        long clienteId = sesionAutenticada.exigirUsuario(solicitud).usuarioId();
        return ResponseEntity.status(HttpStatus.CREATED).body(reclamoService.registrar(clienteId, id, datos));
    }

    @GetMapping("/reclamos/mis-reclamos")
    public List<Reclamo> misReclamos(HttpServletRequest solicitud) {
        return reclamoService.listarDelCliente(sesionAutenticada.exigirUsuario(solicitud).usuarioId());
    }
}
