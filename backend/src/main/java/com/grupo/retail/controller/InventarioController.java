package com.grupo.retail.controller;

import com.grupo.retail.dto.SolicitudEntradaInventario;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.service.InventarioService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/inventario")
public class InventarioController {
    private final InventarioService inventarioService;
    private final SesionEmpleado sesionEmpleado;

    public InventarioController(InventarioService inventarioService, SesionEmpleado sesionEmpleado) {
        this.inventarioService = inventarioService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @PostMapping("/entradas")
    public ResponseEntity<List<MovimientoInventario>> registrarEntradas(
            @Valid @RequestBody SolicitudEntradaInventario solicitud,
            HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        List<MovimientoInventario> movimientos = inventarioService.registrarEntradas(
                solicitud.productos(), solicitud.motivo(), responsableId);
        return ResponseEntity.created(URI.create("/api/inventario/movimientos"))
                .body(movimientos);
    }

    @GetMapping("/movimientos")
    public List<MovimientoInventario> listarMovimientos(
            @RequestParam(required = false) Long productoId,
            @RequestParam(required = false) OffsetDateTime desde,
            @RequestParam(required = false) OffsetDateTime hasta,
            HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN", "VENDEDOR", "ALMACEN");
        return inventarioService.listarMovimientos(productoId, desde, hasta);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> manejarNoEncontrado(NoSuchElementException error) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> manejarSolicitudInvalida(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }
}