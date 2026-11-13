package com.grupo.retail.security;

import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.security.UsuarioDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UsuarioDetailsServiceTest {

    private final UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
    private final UsuarioDetailsService service = new UsuarioDetailsService(usuarioDAO);

    @Test
    @DisplayName("Cargar usuario activo retorna UserDetails con credenciales y autoridad ROLE_<rol>")
    void cargarUsuarioActivoExitoso() {
        Usuario usuario = new Usuario(1L, "Admin General", "admin@pixelandino.pe", "ADMIN", true, OffsetDateTime.now());
        CredencialesUsuario credenciales = new CredencialesUsuario(usuario, "$2a$10$hashPruebaBcrypt");

        when(usuarioDAO.buscarPorCorreo("admin@pixelandino.pe")).thenReturn(Optional.of(credenciales));

        UserDetails details = service.loadUserByUsername("admin@pixelandino.pe");

        assertNotNull(details);
        assertEquals("admin@pixelandino.pe", details.getUsername());
        assertEquals("$2a$10$hashPruebaBcrypt", details.getPassword());
        assertTrue(details.isEnabled());
        assertTrue(details.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        verify(usuarioDAO).buscarPorCorreo("admin@pixelandino.pe");
    }

    @Test
    @DisplayName("Cargar usuario inactivo retorna UserDetails con isEnabled() en false")
    void cargarUsuarioInactivoDeshabilitado() {
        Usuario usuario = new Usuario(2L, "Cliente Inactivo", "inactivo@pixelandino.pe", "CLIENTE", false, OffsetDateTime.now());
        CredencialesUsuario credenciales = new CredencialesUsuario(usuario, "$2a$10$hashCliente");

        when(usuarioDAO.buscarPorCorreo("inactivo@pixelandino.pe")).thenReturn(Optional.of(credenciales));

        UserDetails details = service.loadUserByUsername("inactivo@pixelandino.pe");

        assertNotNull(details);
        assertEquals("inactivo@pixelandino.pe", details.getUsername());
        assertFalse(details.isEnabled());
        assertTrue(details.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_CLIENTE")));
    }

    @Test
    @DisplayName("Cargar correo inexistente lanza UsernameNotFoundException")
    void cargarUsuarioInexistenteLanzaExcepcion() {
        when(usuarioDAO.buscarPorCorreo("noexiste@pixelandino.pe")).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class,
                () -> service.loadUserByUsername("noexiste@pixelandino.pe"));
    }

    @Test
    @DisplayName("Cargar correo nulo o en blanco lanza UsernameNotFoundException")
    void cargarUsuarioBlancoLanzaExcepcion() {
        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername(null));
        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("   "));
    }
}
