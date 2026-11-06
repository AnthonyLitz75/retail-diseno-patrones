package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarRolUsuario;
import com.grupo.retail.dto.RegistroPersonal;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.service.SesionEmpleado;
import com.grupo.retail.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
public class UsuarioAdminController {
    private final UsuarioService usuarioService;
    private final SesionEmpleado sesionEmpleado;

    public UsuarioAdminController(UsuarioService usuarioService, SesionEmpleado sesionEmpleado) {
        this.usuarioService = usuarioService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @GetMapping
    public List<Usuario> listar(HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN");
        return usuarioService.listarUsuarios();
    }

    @PostMapping
    public ResponseEntity<Usuario> crear(
            @Valid @RequestBody RegistroPersonal solicitud,
            HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN");
        Usuario creado = usuarioService.registrarPersonal(solicitud);
        return ResponseEntity.created(URI.create("/api/admin/usuarios/" + creado.idUsuario()))
                .body(creado);
    }

    @PatchMapping("/{id}/rol")
    public ResponseEntity<Usuario> actualizarRol(
            @PathVariable Long id,
            @Valid @RequestBody ActualizarRolUsuario solicitud,
            HttpServletRequest peticion) {
        Long administradorId = sesionEmpleado.exigirRol(peticion, "ADMIN");
        return ResponseEntity.ok(usuarioService.actualizarRol(id, administradorId, solicitud));
    }

    @PutMapping("/{id}/desactivar")
    public ResponseEntity<Void> desactivar(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long administradorId = sesionEmpleado.exigirRol(peticion, "ADMIN");
        usuarioService.desactivar(id, administradorId);
        return ResponseEntity.noContent().build();
    }
}