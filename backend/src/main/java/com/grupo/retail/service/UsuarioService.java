package com.grupo.retail.service;

import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.ActualizarRolUsuario;
import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.dto.RegistroCliente;
import com.grupo.retail.dto.RegistroPersonal;
import com.grupo.retail.exception.OperacionAdminNoPermitidaException;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Service
public class UsuarioService {
    private static final Set<String> ROLES_PERSONAL = Set.of("CLIENTE", "ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE");
    private static final Set<String> ROLES_NUEVO_PERSONAL = Set.of("ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE", "CLIENTE");

    private final UsuarioDAO usuarioDAO;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioDAO usuarioDAO, PasswordEncoder passwordEncoder) {
        this.usuarioDAO = usuarioDAO;
        this.passwordEncoder = passwordEncoder;
    }

    public Usuario registrarCliente(RegistroCliente datos) {
        String nombre = datos.nombre().trim();
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        String claveHash = passwordEncoder.encode(datos.clave());
        return usuarioDAO.registrar(nombre, correo, claveHash);
    }

    public Usuario registrarPersonal(RegistroPersonal datos) {
        String rol = validarRol(datos.rol(), ROLES_NUEVO_PERSONAL);
        String nombre = datos.nombre().trim();
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        String claveHash = passwordEncoder.encode(datos.clave());
        return usuarioDAO.registrarPersonal(nombre, correo, claveHash, rol);
    }

    public List<Usuario> listarUsuarios() {
        return usuarioDAO.listarUsuarios();
    }

    public Usuario actualizarRol(Long usuarioId, Long administradorId, ActualizarRolUsuario datos) {
        String rol = validarRol(datos.rol(), ROLES_PERSONAL);
        validarNoCambiarPropioRol(usuarioId, administradorId, rol);
        return usuarioDAO.actualizarRol(usuarioId, rol)
                .orElseThrow(() -> new java.util.NoSuchElementException("No existe la cuenta activa"));
    }

    public void desactivar(Long usuarioId, Long administradorId) {
        validarNoDesactivarPropiaCuenta(usuarioId, administradorId);
        if (!usuarioDAO.desactivar(usuarioId)) {
            throw new java.util.NoSuchElementException("No existe la cuenta activa");
        }
    }

    private void validarNoCambiarPropioRol(Long usuarioId, Long administradorId, String nuevoRol) {
        if (usuarioId.equals(administradorId) && !"ADMIN".equals(nuevoRol)) {
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

    public Optional<Usuario> autenticarCliente(InicioSesion datos) {
        String correo = datos.correo().trim().toLowerCase(Locale.ROOT);
        Optional<CredencialesUsuario> resultado = usuarioDAO.buscarPorCorreo(correo);
        if (resultado.isEmpty()) {
            return Optional.empty();
        }
        CredencialesUsuario credenciales = resultado.get();
        if (!credenciales.usuario().activo()
                || !passwordEncoder.matches(datos.clave(), credenciales.claveHash())) {
            return Optional.empty();
        }
        return Optional.of(credenciales.usuario());
    }

    private String validarRol(String rol, Set<String> rolesPermitidos) {
        if (rol == null || !rolesPermitidos.contains(rol)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El rol solicitado no es válido");
        }
        return rol;
    }
}
