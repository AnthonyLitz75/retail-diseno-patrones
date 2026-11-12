package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 007, T015 (US5) con PostgreSQL y HTTP reales: un administrador no se desactiva ni se
 * quita el rol a sí mismo, y la tienda nunca se queda sin administradores, ni siquiera si los
 * dos últimos se desactivan mutuamente al mismo tiempo (bloqueo en UsuarioDAO).
 */
class AdministracionRegresionTest extends BaseCompraIntegracion {

    @Test
    @DisplayName("Un administrador no puede desactivarse ni quitarse su rol (409 con mensaje claro)")
    void noSeDesactivaNiSeDegradaASiMismo() {
        DatosIntegracion.Cliente admin = datos.crearEmpleado("ADMIN");
        ClienteHttp sesion = sesionDe(admin);

        ClienteHttp.Respuesta desactivar = sesion.put("/api/admin/usuarios/" + admin.id() + "/desactivar");
        ClienteHttp.Respuesta degradar = sesion.patchJson("/api/admin/usuarios/" + admin.id() + "/rol",
                "{\"rol\":\"VENDEDOR\"}");

        assertEquals(409, desactivar.estado(), desactivar.toString());
        assertTrue(desactivar.cuerpo().contains("No puedes desactivar tu propia cuenta"), desactivar.cuerpo());
        assertEquals(409, degradar.estado(), degradar.toString());
        assertTrue(datos.usuarioActivo(admin.id()));
    }

    @Test
    @DisplayName("Los dos últimos administradores se desactivan mutuamente a la vez: siempre queda uno")
    void nuncaSinAdministradores() throws Exception {
        DatosIntegracion.Cliente a = datos.crearEmpleado("ADMIN");
        DatosIntegracion.Cliente b = datos.crearEmpleado("ADMIN");
        ClienteHttp sesionA = sesionDe(a);
        ClienteHttp sesionB = sesionDe(b);
        List<Long> otros = datos.desactivarAdminsExcepto(a.id(), b.id());
        try {
            assertEquals(2, datos.adminsActivos());

            List<ClienteHttp.Respuesta> respuestas = enParalelo(List.<Callable<ClienteHttp.Respuesta>>of(
                    () -> sesionA.put("/api/admin/usuarios/" + b.id() + "/desactivar"),
                    () -> sesionB.put("/api/admin/usuarios/" + a.id() + "/desactivar")));

            assertEquals(1, datos.adminsActivos(), respuestas.toString());
            assertNotEquals(datos.usuarioActivo(a.id()), datos.usuarioActivo(b.id()), "Exactamente uno sigue activo");
            assertEquals(1, respuestas.stream().filter(r -> r.estado() == 204).count(), respuestas.toString());
            // El perdedor ve 409 (último administrador) o 401 (su propia cuenta ya fue desactivada).
            assertTrue(respuestas.stream().anyMatch(r -> r.estado() == 409 || r.estado() == 401), respuestas.toString());
        } finally {
            datos.reactivarUsuarios(otros);
        }
    }
}
