package com.grupo.retail;

import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.service.SesionCliente;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SesionClienteTests {

    private final SesionCliente sesionCliente = new SesionCliente(sesionActiva());

    @Test
    void obtieneLaIdentidadDelClienteAutenticado() {
        assertEquals(42L, sesionCliente.obtenerId(solicitudConRol("CLIENTE")));
    }

    @Test
    void rechazaRolesDeEmpleadoEnOperacionesDeCliente() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> sesionCliente.obtenerId(solicitudConRol("VENDEDOR")));
        assertEquals(403, error.getStatusCode().value());
    }

    @Test
    void rechazaUnaSesionSinIdentidadDeUsuario() {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
        solicitud.getSession().setAttribute("usuarioRol", "CLIENTE");

        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> sesionCliente.obtenerId(solicitud));
        assertEquals(401, error.getStatusCode().value());
    }

    private MockHttpServletRequest solicitudConRol(String rol) {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
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
