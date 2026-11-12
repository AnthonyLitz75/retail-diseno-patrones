package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarEstadoCategoria;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.service.CategoriaService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
        return categoriaService.listarTodas();
    }

    @PostMapping
    public ResponseEntity<Categoria> crear(
            @Valid @RequestBody SolicitudCategoria solicitud,
            HttpServletRequest peticion) {
        Categoria creada = categoriaService.crear(solicitud, sesionEmpleado.obtenerId(peticion));
        return ResponseEntity.created(URI.create("/api/admin/categorias/" + creada.idCategoria()))
                .body(creada);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Categoria> actualizarNombre(
            @PathVariable Long id,
            @Valid @RequestBody SolicitudCategoria solicitud,
            HttpServletRequest peticion) {
        return categoriaService.actualizarNombre(id, solicitud, sesionEmpleado.obtenerId(peticion))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Categoria> actualizarEstado(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarEstadoCategoria solicitud,
            HttpServletRequest peticion) {
        return categoriaService.actualizarEstado(id, solicitud.activa(), sesionEmpleado.obtenerId(peticion))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
