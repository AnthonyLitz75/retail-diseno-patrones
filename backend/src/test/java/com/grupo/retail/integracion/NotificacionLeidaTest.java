package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 005, T009 (US3): {@code PATCH /api/notificaciones/{id}/leida} marca como leída una
 * notificación propia; la de otro usuario responde 404 y no cambia.
 */
class NotificacionLeidaTest extends BaseCompraIntegracion {

    @Test
    @DisplayName("US3.2: el dueño marca su notificación como leída (200) y repetirlo es seguro")
    void elDuenioMarcaSuNotificacionComoLeida() {
        Compra compra = comprar(new BigDecimal("12.00"), 3, 1);
        long notificacion = datos.idNotificacion(compra.pedido(), "PENDIENTE");
        ClienteHttp cliente = sesionDe(compra.cliente());
        assertFalse(datos.notificacionLeida(notificacion));

        ClienteHttp.Respuesta primera = cliente.patch("/api/notificaciones/" + notificacion + "/leida");
        ClienteHttp.Respuesta segunda = cliente.patch("/api/notificaciones/" + notificacion + "/leida");

        assertEquals(200, primera.estado(), primera.toString());
        assertTrue(primera.cuerpo().contains("\"leida\":true"), primera.cuerpo());
        assertEquals(200, segunda.estado(), "Marcar dos veces es seguro: " + segunda);
        assertTrue(datos.notificacionLeida(notificacion));
    }

    @Test
    @DisplayName("US3.3: la notificación de otro usuario responde 404 y sigue sin leer")
    void laNotificacionAjenaResponde404() {
        Compra compra = comprar(new BigDecimal("12.00"), 3, 1);
        long notificacion = datos.idNotificacion(compra.pedido(), "PENDIENTE");
        ClienteHttp otro = sesionDe(datos.crearCliente());

        ClienteHttp.Respuesta respuesta = otro.patch("/api/notificaciones/" + notificacion + "/leida");

        assertEquals(404, respuesta.estado(), respuesta.toString());
        assertFalse(respuesta.cuerpo().contains("mensaje"), "No expone la notificación ajena");
        assertFalse(datos.notificacionLeida(notificacion));
    }

    @Test
    @DisplayName("Marcar como leída exige el token CSRF (403 sin él)")
    void marcarLeidaExigeCsrf() {
        Compra compra = comprar(new BigDecimal("12.00"), 3, 1);
        long notificacion = datos.idNotificacion(compra.pedido(), "PENDIENTE");

        ClienteHttp.Respuesta sinToken = new ClienteHttp(puerto)
                .iniciarSesion(compra.cliente().correo(), DatosIntegracion.CLAVE_PRUEBA)
                .sinCsrf()
                .patch("/api/notificaciones/" + notificacion + "/leida");

        assertEquals(403, sinToken.estado(), sinToken.toString());
        assertFalse(datos.notificacionLeida(notificacion));
    }
}
