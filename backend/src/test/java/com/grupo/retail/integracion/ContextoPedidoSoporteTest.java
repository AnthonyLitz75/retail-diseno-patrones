package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 006, T021 (US7; RF27) con PostgreSQL y HTTP reales: Soporte consulta en una sola
 * vista el pedido, sus líneas, pago, envío, historial y las atenciones previas, sin datos
 * sensibles innecesarios (clave de confirmación, referencia del cobro ni dirección).
 */
class ContextoPedidoSoporteTest extends BaseCompraIntegracion {

    @Test
    @DisplayName("US7.1: vista agregada del pedido con reclamos y devoluciones")
    void vistaAgregada() {
        Compra compra = comprar(new BigDecimal("45.00"), 5, 2);
        datos.forzarEstadoPedido(compra.pedido(), "ENTREGADO");
        ClienteHttp cliente = sesionDe(compra.cliente());
        long reclamo = cliente.postJson("/api/pedidos/" + compra.pedido() + "/reclamos",
                "{\"motivo\":\"Caja dañada\",\"descripcion\":\"Llegó abollada\"}").campoNumerico("id");
        long detalle = datos.idDetallePedido(compra.pedido(), compra.producto());
        long devolucion = cliente.postJson("/api/pedidos/" + compra.pedido() + "/devoluciones",
                "{\"motivo\":\"No lo uso\",\"lineas\":[{\"pedidoDetalleId\":" + detalle + ",\"cantidad\":1}]}")
                .campoNumerico("id");

        ClienteHttp.Respuesta respuesta = sesionDe(datos.crearEmpleado("SOPORTE"))
                .get("/api/soporte/pedidos/" + compra.pedido());

        assertEquals(200, respuesta.estado(), respuesta.toString());
        String cuerpo = respuesta.cuerpo();
        assertTrue(cuerpo.contains("\"idPedido\":" + compra.pedido()), cuerpo);
        assertTrue(cuerpo.contains("\"estado\":\"ENTREGADO\""), cuerpo);
        assertTrue(cuerpo.contains("\"productos\":[{"), "Incluye las líneas");
        assertTrue(cuerpo.contains("\"idDetalle\":" + detalle), "La línea expone su id para devolver");
        assertTrue(cuerpo.contains("\"historial\":["), "Incluye el historial");
        assertTrue(cuerpo.contains("\"pago\":{"), "Incluye el pago");
        assertTrue(cuerpo.contains("\"montoReembolsado\":"), cuerpo);
        assertTrue(cuerpo.contains("\"reclamos\":[{\"id\":" + reclamo), cuerpo);
        assertTrue(cuerpo.contains("\"devoluciones\":[{\"id\":" + devolucion), cuerpo);
        assertFalse(cuerpo.contains("claveConfirmacion"), "Sin clave de idempotencia");
        assertFalse(cuerpo.contains("\"referencia\""), "Sin referencia del cobro");
        assertFalse(cuerpo.contains("direccion"), "Sin dirección de envío");
    }

    @Test
    @DisplayName("Un pedido inexistente responde 404")
    void pedidoInexistente() {
        assertEquals(404, sesionDe(datos.crearEmpleado("SOPORTE")).get("/api/soporte/pedidos/999999999").estado());
    }
}
