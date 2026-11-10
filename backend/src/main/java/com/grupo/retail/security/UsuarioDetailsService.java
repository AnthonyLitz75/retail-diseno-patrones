package com.grupo.retail.security;

import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UsuarioDetailsService implements UserDetailsService {

    private final UsuarioDAO usuarioDAO;

    public UsuarioDetailsService(UsuarioDAO usuarioDAO) {
        this.usuarioDAO = usuarioDAO;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (username == null || username.isBlank()) {
            throw new UsernameNotFoundException("El correo de usuario no puede estar vacío");
        }

        CredencialesUsuario credenciales = usuarioDAO.buscarPorCorreo(username.trim())
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado con correo: " + username));

        Usuario usuario = credenciales.usuario();

        return User.builder()
                .username(usuario.correo())
                .password(credenciales.claveHash())
                .disabled(!usuario.activo())
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_" + usuario.rol())))
                .build();
    }
}
