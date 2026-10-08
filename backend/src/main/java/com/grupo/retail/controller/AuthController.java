package com.grupo.retail.controller;

import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.dto.RegistroCliente;
import com.grupo.retail.exception.CorreoYaRegistradoException;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;

    public AuthController(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @PostMapping("/registro")
    public ResponseEntity<Usuario> registrar(
            @Valid @RequestBody RegistroCliente datos) {
        Usuario creado = usuarioService.registrarCliente(datos);
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    @PostMapping("/login")
    public ResponseEntity<?> iniciarSesion(
            @Valid @RequestBody InicioSesion datos,
            HttpServletRequest solicitud) {
        Optional<Usuario> resultado = usuarioService.autenticarCliente(datos);

        if (resultado.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Correo o contraseña incorrectos"));
        }

        HttpSession sesionAnterior = solicitud.getSession(false);
        if (sesionAnterior != null) {
            sesionAnterior.invalidate();
        }

        Usuario usuario = resultado.get();
        HttpSession sesion = solicitud.getSession(true);
        sesion.setAttribute("usuarioId", usuario.idUsuario());
        sesion.setAttribute("usuarioNombre", usuario.nombre());
        sesion.setAttribute("usuarioCorreo", usuario.correo());
        sesion.setAttribute("usuarioRol", usuario.rol());

        return ResponseEntity.ok(usuario);
    }

    @GetMapping("/sesion")
    public ResponseEntity<?> consultarSesion(HttpServletRequest solicitud) {
        HttpSession sesion = solicitud.getSession(false);

        if (sesion == null || !(sesion.getAttribute("usuarioId") instanceof Long)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "No hay una sesión iniciada"));
        }

        return ResponseEntity.ok(Map.of(
                "idUsuario", sesion.getAttribute("usuarioId"),
                "nombre", sesion.getAttribute("usuarioNombre"),
                "correo", sesion.getAttribute("usuarioCorreo"),
                "rol", sesion.getAttribute("usuarioRol")));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> cerrarSesion(HttpServletRequest solicitud) {
        HttpSession sesion = solicitud.getSession(false);

        if (sesion != null) {
            sesion.invalidate();
        }

        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(CorreoYaRegistradoException.class)
    public ResponseEntity<Map<String, String>> manejarCorreoDuplicado(
            CorreoYaRegistradoException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", error.getMessage()));
    }
}