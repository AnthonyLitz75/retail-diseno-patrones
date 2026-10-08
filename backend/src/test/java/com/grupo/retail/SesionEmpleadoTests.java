package com.grupo.retail;

import com.grupo.retail.service.SesionEmpleado;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SesionEmpleadoTests {
    private final SesionEmpleado sesionEmpleado = new SesionEmpleado();

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
}
