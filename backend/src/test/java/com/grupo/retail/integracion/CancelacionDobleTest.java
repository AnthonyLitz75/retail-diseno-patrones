package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 004, US4 (T011): cancelar es idempotente. El stock se restituye y el pago de
 * prueba se reversa una sola vez, aunque la cancelación se repita o llegue en paralelo,
 * y un pedido que ya salió del almacén no se puede cancelar.
 */
class CancelacionDobleTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("65.00");
    private static final int STOCK_INICIAL = 10;
    private static final int CANTIDAD = 3;

    @Test
    @DisplayName("US4.1: cancelar dos veces seguidas restituye el stock y reversa el pago una sola vez")
    void cancelacionSecuencialRepetida() {
        Compra compra = comprar();
        ClienteHttp sesion = sesionDe(compra.cliente());

        ClienteHttp.Respuesta primera = sesion.put(rutaCancelar(compra));
        ClienteHttp.Respuesta segunda = sesion.put(rutaCancelar(compra));

        assertEquals(204, primera.estado(), primera.toString());
        assertEquals(204, segunda.estado(), "Repetir la cancelación es seguro: " + segunda);
        verificarCanceladoUnaVez(compra);
    }

    @Test
    @DisplayName("US4.1: cinco cancelaciones simultáneas tienen efecto una sola vez")
    void cancelacionesSimultaneas() throws Exception {
        Compra compra = comprar();
        List<Callable<ClienteHttp.Respuesta>> cancelaciones = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            ClienteHttp sesion = sesionDe(compra.cliente());
            cancelaciones.add(() -> sesion.put(rutaCancelar(compra)));
        }

        List<ClienteHttp.Respuesta> respuestas = enParalelo(cancelaciones);

        assertTrue(respuestas.stream().allMatch(r -> r.estado() == 204),
                "Todas las cancelaciones deben responder 204: " + respuestas);
        verificarCanceladoUnaVez(compra);
    }

    @Test
    @DisplayName("US4.2: un pedido despachado no se cancela (409) y no cambia nada")
    void pedidoDespachadoNoSeCancela() {
        Compra compra = comprar();
        datos.forzarEstadoPedido(compra.pedido(), "DESPACHADO");

        ClienteHttp.Respuesta respuesta = sesionDe(compra.cliente()).put(rutaCancelar(compra));

        assertEquals(409, respuesta.estado(), respuesta.toString());
        assertEquals("DESPACHADO", datos.estadoPedido(compra.pedido()));
        assertEquals(STOCK_INICIAL - CANTIDAD, datos.stock(compra.producto()));
        assertEquals(1, datos.pagosEnEstado(compra.pedido(), "APROBADO"));
        assertEquals(0, datos.movimientosDeTipo(compra.producto(), "CANCELACION"));
    }

    @Test
    @DisplayName("Un cliente no puede cancelar el pedido de otro (404) y el pedido queda intacto")
    void clienteNoCancelaPedidoAjeno() {
        Compra compra = comprar();
        DatosIntegracion.Cliente otro = datos.crearCliente();

        ClienteHttp.Respuesta respuesta = sesionDe(otro).put(rutaCancelar(compra));

        assertEquals(404, respuesta.estado(), respuesta.toString());
        assertEquals("PENDIENTE", datos.estadoPedido(compra.pedido()));
        assertEquals(STOCK_INICIAL - CANTIDAD, datos.stock(compra.producto()));
    }

    private Compra comprar() {
        return comprar(PRECIO, STOCK_INICIAL, CANTIDAD);
    }

    private static String rutaCancelar(Compra compra) {
        return "/api/pedidos/" + compra.pedido() + "/cancelar";
    }

    private void verificarCanceladoUnaVez(Compra compra) {
        assertEquals("CANCELADO", datos.estadoPedido(compra.pedido()));
        assertEquals(STOCK_INICIAL, datos.stock(compra.producto()), "El stock vuelve a su valor inicial");
        assertEquals(1, datos.movimientosDeTipo(compra.producto(), "CANCELACION"));
        assertEquals(1, datos.pagosEnEstado(compra.pedido(), "REVERSADO"));
        assertEquals(0, datos.pagosEnEstado(compra.pedido(), "APROBADO"));
        assertEquals(1, datos.historialDe(compra.pedido(), "CANCELADO"));
    }
}
