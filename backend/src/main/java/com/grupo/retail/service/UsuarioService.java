package com.grupo.retail.service;

import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.dto.RegistroCliente;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.Optional;

@Service
public class UsuarioService {

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
}