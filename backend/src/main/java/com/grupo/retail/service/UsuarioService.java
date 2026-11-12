package com.grupo.retail.service;

import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.Rol;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.ActualizarRolUsuario;
import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.dto.RegistroCliente;
import com.grupo.retail.dto.RegistroPersonal;
import com.grupo.retail.exception.OperacionAdminNoPermitidaException;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class UsuarioService {

    private final UsuarioDAO usuarioDAO;
    private final PasswordEncoder passwordEncoder;
    private volatile String hashSenuelo;

    private final EjecutorTransaccion ejecutorTransaccion;
    private final AuditoriaService auditoriaService;

    public UsuarioService(UsuarioDAO usuarioDAO, PasswordEncoder passwordEncoder,
            EjecutorTransaccion ejecutorTransaccion, AuditoriaService auditoriaService) {
        this.usuarioDAO = usuarioDAO;
        this.passwordEncoder = passwordEncoder;
        this.ejecutorTransaccion = ejecutorTransaccion;
        this.auditoriaService = auditoriaService;
    }

    public Usuario registrarCliente(RegistroCliente datos) {
        String nombre = datos.nombre().trim();
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        String claveHash = passwordEncoder.encode(datos.clave());
        return usuarioDAO.registrar(nombre, correo, claveHash);
    }

    public Usuario registrarPersonal(RegistroPersonal datos, Long administradorId) {
        String rol = validarRol(datos.rol());
        String nombre = datos.nombre().trim();
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        String claveHash = passwordEncoder.encode(datos.clave());
        Usuario creado = usuarioDAO.registrarPersonal(nombre, correo, claveHash, rol);
        auditoriaService.registrarAparte(EventoAuditoria.de(administradorId, AccionAuditoria.CUENTA_CREADA,
                USUARIO, creado.idUsuario(), creado.correo() + " como " + creado.rol()));
        return creado;
    }

    public List<Usuario> listarUsuarios() {
        return usuarioDAO.listarUsuarios();
    }

    public Usuario actualizarRol(Long usuarioId, Long administradorId, ActualizarRolUsuario datos) {
        String rol = validarRol(datos.rol());
        validarNoCambiarPropioRol(usuarioId, administradorId, rol);
        return ejecutorTransaccion.ejecutar("No se pudo actualizar el rol", conexion -> {
            // Primero los administradores (orden de id), luego la cuenta: el mismo orden en
            // cambio de rol y desactivación evita bloqueos cruzados.
            int adminsActivos = usuarioDAO.bloquearAdministradoresActivos(conexion);
            Usuario actual = usuarioDAO.bloquearActivo(conexion, usuarioId)
                    .orElseThrow(() -> new NoSuchElementException("No existe la cuenta activa"));
            if (Rol.ADMIN.es(actual.rol()) && !Rol.ADMIN.es(rol) && adminsActivos <= 1) {
                throw new OperacionAdminNoPermitidaException(
                        "No se puede cambiar el rol del último administrador activo");
            }
            if (actual.rol().equals(rol)) {
                return actual;
            }
            Usuario actualizado = usuarioDAO.cambiarRol(conexion, usuarioId, rol)
                    .orElseThrow(() -> new NoSuchElementException("No existe la cuenta activa"));
            auditoriaService.registrar(conexion, EventoAuditoria.de(administradorId, AccionAuditoria.ROL_CAMBIADO,
                    USUARIO, usuarioId, actual.correo() + ": " + actual.rol() + " → " + rol));
            return actualizado;
        });
    }

    public void desactivar(Long usuarioId, Long administradorId) {
        validarNoDesactivarPropiaCuenta(usuarioId, administradorId);
        ejecutorTransaccion.ejecutar("No se pudo desactivar la cuenta", conexion -> {
            int adminsActivos = usuarioDAO.bloquearAdministradoresActivos(conexion);
            Usuario actual = usuarioDAO.bloquearActivo(conexion, usuarioId)
                    .orElseThrow(() -> new NoSuchElementException("No existe la cuenta activa"));
            if (Rol.ADMIN.es(actual.rol()) && adminsActivos <= 1) {
                throw new OperacionAdminNoPermitidaException(
                        "No se puede desactivar el último administrador activo");
            }
            if (!usuarioDAO.marcarInactivo(conexion, usuarioId)) {
                throw new NoSuchElementException("No existe la cuenta activa");
            }
            auditoriaService.registrar(conexion, EventoAuditoria.de(administradorId, AccionAuditoria.CUENTA_DESACTIVADA,
                    USUARIO, usuarioId, actual.correo() + " (" + actual.rol() + ")"));
            return null;
        });
    }

    private static final String USUARIO = "USUARIO";

    private void validarNoCambiarPropioRol(Long usuarioId, Long administradorId, String nuevoRol) {
        if (usuarioId.equals(administradorId) && !Rol.ADMIN.es(nuevoRol)) {
            throw new OperacionAdminNoPermitidaException(
                    "No puedes cambiar tu propio rol de administrador");
        }
    }

    private void validarNoDesactivarPropiaCuenta(Long usuarioId, Long administradorId) {
        if (usuarioId.equals(administradorId)) {
            throw new OperacionAdminNoPermitidaException(
                    "No puedes desactivar tu propia cuenta");
        }
    }

    /**
     * Valida correo y contraseña de cualquier rol. Siempre compara un hash BCrypt, aunque
     * el correo no exista o la cuenta esté desactivada, para que el tiempo de respuesta no
     * revele qué correos están registrados.
     */
    public Optional<Usuario> autenticarCliente(InicioSesion datos) {
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        Optional<CredencialesUsuario> resultado = usuarioDAO.buscarPorCorreo(correo);
        String hash = resultado.map(CredencialesUsuario::claveHash).orElseGet(this::hashSenuelo);
        boolean claveCorrecta = passwordEncoder.matches(datos.clave(), hash);
        if (resultado.isEmpty() || !claveCorrecta || !resultado.get().usuario().activo()) {
            return Optional.empty();
        }
        return Optional.of(resultado.get().usuario());
    }

    /** Hash de una clave aleatoria, calculado una vez, solo para igualar el tiempo de respuesta. */
    private String hashSenuelo() {
        String hash = hashSenuelo;
        if (hash == null) {
            hash = passwordEncoder.encode(java.util.UUID.randomUUID().toString());
            hashSenuelo = hash;
        }
        return hash;
    }

    private String validarRol(String rol) {
        return Rol.desde(rol)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rol solicitado no es válido"))
                .name();
    }
}
