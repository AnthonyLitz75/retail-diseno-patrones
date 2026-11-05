package com.grupo.retail;

import com.grupo.retail.service.SesionEmpleado;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.dao.UsuarioDAO;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SesionEmpleadoTests {
    private final SesionAutenticada sesionAutenticada = sesionActiva();
    private final SesionEmpleado sesionEmpleado = new SesionEmpleado(sesionAutenticada);

    @Test
    void rechazaOperacionesSinSesion() {
        var error = assertThrows(ResponseStatusException.class,
                () -> sesionEmpleado.exigirRol(new MockHttpServletRequest(), "VENDEDOR"));
        assertEquals(401, error.getStatusCode().value());
    }

    @Test
    void permiteElRolIncluidoEnLaRegla() {
        var solicitud = solicitudConRol("ALMACEN");
        assertEquals(42L, sesionEmpleado.exigirRol(solicitud, "VENDEDOR", "ALMACEN"));
    }

    @Test
    void permiteLosTresRolesDePersonalImplementados() {
        for (String rol : new String[] { "ADMIN", "VENDEDOR", "ALMACEN" }) {
            assertEquals(42L, sesionEmpleado.exigirRol(solicitudConRol(rol), rol));
        }
    }

    @Test
    void rechazaUnRolQueNoEstaAutorizado() {
        var error = assertThrows(ResponseStatusException.class,
                () -> sesionEmpleado.exigirRol(solicitudConRol("CLIENTE"), "VENDEDOR"));
        assertEquals(403, error.getStatusCode().value());
    }

    private MockHttpServletRequest solicitudConRol(String rol) {
        var solicitud = new MockHttpServletRequest();
        var sesion = solicitud.getSession();
        sesion.setAttribute("usuarioId", 42L);
        sesion.setAttribute("usuarioRol", rol);
        return solicitud;
    }
    private static SesionAutenticada sesionActiva() {
        UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
        return new SesionAutenticada(usuarioDAO);
    }
}
