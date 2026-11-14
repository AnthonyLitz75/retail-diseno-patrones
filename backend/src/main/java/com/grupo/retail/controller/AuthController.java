package com.grupo.retail.controller;

import java.util.Locale;
import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.exception.CredencialesInvalidasException;
import com.grupo.retail.exception.DemasiadosIntentosException;
import com.grupo.retail.security.LimitadorIntentosLogin;
import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.dto.RegistroCliente;
import com.grupo.retail.dto.SesionUsuarioDTO;
import com.grupo.retail.dto.UsuarioRespuestaDTO;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.service.UsuarioService;
import com.grupo.retail.service.SesionAutenticada;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controlador de autenticación y gestión de sesiones de usuario.
 * Respuestas estrictamente tipadas mediante DTOs para cumplir con SonarQube java:S1452.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UsuarioService usuarioService;
    private final SesionAutenticada sesionAutenticada;
    private final LimitadorIntentosLogin limitadorIntentos;
    private final AuditoriaService auditoriaService;

    public AuthController(UsuarioService usuarioService, SesionAutenticada sesionAutenticada,
            LimitadorIntentosLogin limitadorIntentos, AuditoriaService auditoriaService) {
        this.usuarioService = usuarioService;
        this.sesionAutenticada = sesionAutenticada;
        this.limitadorIntentos = limitadorIntentos;
        this.auditoriaService = auditoriaService;
    }

    @PostMapping("/registro")
    public ResponseEntity<UsuarioRespuestaDTO> registrar(
            @Valid @RequestBody RegistroCliente datos) {
        Usuario creado = usuarioService.registrarCliente(datos);
        return ResponseEntity.status(HttpStatus.CREATED).body(UsuarioRespuestaDTO.desde(creado));
    }

    @PostMapping("/login")
    public ResponseEntity<UsuarioRespuestaDTO> iniciarSesion(
            @Valid @RequestBody InicioSesion datos,
            HttpServletRequest solicitud) {
        String correoIntentado = datos.correo().trim().toLowerCase(Locale.ROOT);
        try {
            limitadorIntentos.verificar(datos.correo());
        } catch (DemasiadosIntentosException bloqueo) {
            auditoriaService.registrarAparte(new EventoAuditoria(null, correoIntentado, null,
                    AccionAuditoria.INICIO_SESION_BLOQUEADO, "USUARIO", null,
                    "Correo bloqueado temporalmente por intentos fallidos"));
            throw bloqueo;
        }
        Optional<Usuario> resultado = usuarioService.autenticarCliente(datos);

        if (resultado.isEmpty()) {
            limitadorIntentos.registrarFallo(datos.correo());
            auditoriaService.registrarAparte(new EventoAuditoria(null, correoIntentado, null,
                    AccionAuditoria.INICIO_SESION_FALLIDO, "USUARIO", null, "Correo o contraseña incorrectos"));
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(UsuarioRespuestaDTO.conError("Correo o contraseña incorrectos"));
        }
        limitadorIntentos.reiniciar(datos.correo());

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

        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + usuario.rol()));
        var authentication = new UsernamePasswordAuthenticationToken(usuario.correo(), null, authorities);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        sesion.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

        auditoriaService.registrarAparte(new EventoAuditoria(usuario.idUsuario(), usuario.correo(), usuario.rol(),
                AccionAuditoria.INICIO_SESION, "USUARIO", usuario.idUsuario(), ""));
        return ResponseEntity.ok(UsuarioRespuestaDTO.desde(usuario));
    }

    @GetMapping("/csrf")
    public ResponseEntity<Map<String, String>> obtenerCsrf(HttpServletRequest solicitud) {
        CsrfToken token = (CsrfToken) solicitud.getAttribute(CsrfToken.class.getName());
        if (token == null) {
            token = (CsrfToken) solicitud.getAttribute("_csrf");
        }
        String valorToken = token != null ? token.getToken() : "";
        String cabecera = token != null && token.getHeaderName() != null ? token.getHeaderName() : "X-XSRF-TOKEN";
        return ResponseEntity.ok(Map.of(
                "token", valorToken,
                "cabecera", cabecera
        ));
    }

    @GetMapping("/sesion")
    public ResponseEntity<SesionUsuarioDTO> consultarSesion(HttpServletRequest solicitud) {
        sesionAutenticada.exigirUsuario(solicitud);
        HttpSession sesion = solicitud.getSession(false);
        Object idObj = sesion.getAttribute("usuarioId");
        Long idUsuario = idObj instanceof Number num ? num.longValue() : null;
        String nombre = (String) sesion.getAttribute("usuarioNombre");
        String correo = (String) sesion.getAttribute("usuarioCorreo");
        String rol = (String) sesion.getAttribute("usuarioRol");

        return ResponseEntity.ok(new SesionUsuarioDTO(idUsuario, nombre, correo, rol));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> cerrarSesion(HttpServletRequest solicitud) {
        SecurityContextHolder.clearContext();
        HttpSession sesion = solicitud.getSession(false);

        if (sesion != null) {
            sesion.invalidate();
        }

        return ResponseEntity.noContent().build();
    }
}
