package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarEstadoCategoria;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.exception.CategoriaDuplicadaException;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.service.CategoriaService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/admin/categorias")
public class CategoriaAdminController {
    private final CategoriaService categoriaService;
    private final SesionEmpleado sesionEmpleado;

    public CategoriaAdminController(CategoriaService categoriaService, SesionEmpleado sesionEmpleado) {
        this.categoriaService = categoriaService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @GetMapping
    public List<Categoria> listar(HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN");
        return categoriaService.listarTodas();
    }

    @PostMapping
    public ResponseEntity<Categoria> crear(
            @Valid @RequestBody SolicitudCategoria solicitud,
            HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN");
        Categoria creada = categoriaService.crear(solicitud);
        return ResponseEntity.created(URI.create("/api/admin/categorias/" + creada.idCategoria()))
                .body(creada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Categoria> actualizarNombre(
            @PathVariable Long id,
            @Valid @RequestBody SolicitudCategoria solicitud,
            HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN");
        return categoriaService.actualizarNombre(id, solicitud)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Categoria> actualizarEstado(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarEstadoCategoria solicitud,
            HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN");
        return categoriaService.actualizarEstado(id, solicitud.activa())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @ExceptionHandler(CategoriaDuplicadaException.class)
    public ResponseEntity<Map<String, String>> manejarDuplicado(CategoriaDuplicadaException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> manejarSolicitudInvalida(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }
}