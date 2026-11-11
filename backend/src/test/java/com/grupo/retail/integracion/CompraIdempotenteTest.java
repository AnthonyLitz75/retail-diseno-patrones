package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 004, US1 (T005): reintentar la confirmación con la misma clave no duplica el
 * pedido ni el descuento de stock, y la clave de otro cliente no expone su pedido.
 */
class CompraIdempotenteTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("120.00");

    @Test
    @DisplayName("US1.1: reenviar con la misma clave devuelve el mismo pedido y no descuenta otra vez")
    void reintentoSecuencialDevuelveElMismoPedido() {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        datos.crearCarritoActivo(cliente.id(), Map.of(producto, 2));
        ClienteHttp sesion = sesionDe(cliente);
        String clave = UUID.randomUUID().toString();

        ClienteHttp.Respuesta primera = sesion.confirmarCompra("PRUEBA_APROBADA", clave);
        ClienteHttp.Respuesta segunda = sesion.confirmarCompra("PRUEBA_APROBADA", clave);

        assertEquals(201, primera.estado(), primera.cuerpo());
        assertTrue(segunda.estado() == 200 || segunda.estado() == 201, segunda.toString());
        assertEquals(primera.idPedido(), segunda.idPedido());
        assertEquals(1, datos.pedidosDe(cliente.id()));
        assertEquals(8, datos.stock(producto), "El stock se descuenta una sola vez");
    }

    @Test
    @DisplayName("US1.1: cinco reintentos simultáneos con la misma clave crean un solo pedido")
    void reintentosSimultaneosCreanUnSoloPedido() throws Exception {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        datos.crearCarritoActivo(cliente.id(), Map.of(producto, 1));
        String clave = UUID.randomUUID().toString();
        List<Callable<ClienteHttp.Respuesta>> reintentos = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            // Simula doble clic o pestañas: varias sesiones del mismo cliente con la misma clave.
            ClienteHttp sesion = sesionDe(cliente);
            reintentos.add(() -> sesion.confirmarCompra("PRUEBA_APROBADA", clave));
        }

        List<ClienteHttp.Respuesta> respuestas = enParalelo(reintentos);

        long idEsperado = respuestas.get(0).idPedido();
        for (ClienteHttp.Respuesta r : respuestas) {
            assertTrue(r.estado() == 200 || r.estado() == 201, "Todos los reintentos deben responder el pedido: " + respuestas);
            assertEquals(idEsperado, r.idPedido());
        }
        assertEquals(1, datos.pedidosDe(cliente.id()));
        assertEquals(9, datos.stock(producto));
    }

    @Test
    @DisplayName("US1.2: la clave de otro cliente se rechaza con 409 sin exponer su pedido")
    void claveDeOtroClienteSeRechaza() {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente duenio = datos.crearCliente();
        DatosIntegracion.Cliente otro = datos.crearCliente();
        datos.crearCarritoActivo(duenio.id(), Map.of(producto, 1));
        long carritoOtro = datos.crearCarritoActivo(otro.id(), Map.of(producto, 3));
        String clave = UUID.randomUUID().toString();

        ClienteHttp.Respuesta delDuenio = sesionDe(duenio).confirmarCompra("PRUEBA_APROBADA", clave);
        ClienteHttp.Respuesta delOtro = sesionDe(otro).confirmarCompra("PRUEBA_APROBADA", clave);

        assertEquals(201, delDuenio.estado(), delDuenio.cuerpo());
        assertEquals(409, delOtro.estado(), "La clave ajena debe rechazarse con 409: " + delOtro);
        assertFalse(delOtro.cuerpo().contains("\"idPedido\""), "No debe exponer el pedido ajeno");
        assertEquals(0, datos.pedidosDe(otro.id()));
        assertEquals(9, datos.stock(producto), "Solo cuenta la compra del dueño de la clave");
        assertEquals("ACTIVO", datos.estadoCarrito(carritoOtro), "El carrito del otro cliente queda intacto");
    }
}
