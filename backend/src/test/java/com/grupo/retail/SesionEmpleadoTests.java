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
                () -> sesionEmpleado.obtenerId(new MockHttpServletRequest()));
        assertEquals(401, error.getStatusCode().value());
    }

    @Test
    void obtieneIdDeEmpleadoConSesionValida() {
        var solicitud = solicitudConRol("ALMACEN");
        assertEquals(42L, sesionEmpleado.obtenerId(solicitud));
    }

    @Test
    void obtieneIdParaCualquierRolAutenticado() {
        for (String rol : new String[] { "ADMIN", "VENDEDOR", "ALMACEN" }) {
            assertEquals(42L, sesionEmpleado.obtenerId(solicitudConRol(rol)));
        }
    }

    @Test
    void rechazaSesionInvalidaSinUsuarioId() {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
        solicitud.getSession().setAttribute("usuarioRol", "ADMIN");
        var error = assertThrows(ResponseStatusException.class,
                () -> sesionEmpleado.obtenerId(solicitud));
        assertEquals(401, error.getStatusCode().value());
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
