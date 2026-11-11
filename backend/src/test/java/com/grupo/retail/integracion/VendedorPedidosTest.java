package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 007, T016 (US8) con PostgreSQL y HTTP reales: el VENDEDOR ve los pedidos pendientes y
 * cancela los que siguen PENDIENTES (con reposición de stock), pero no prepara, despacha ni
 * entrega: eso es de ALMACEN y ADMIN.
 */
class VendedorPedidosTest extends BaseCompraIntegracion {

    @Test
    @DisplayName("US8: el vendedor lista pendientes y cancela uno; el stock vuelve")
    void listaYCancelaPendientes() {
        Compra compra = comprar(new BigDecimal("20.00"), 5, 2);
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));
        assertEquals(3, datos.stock(compra.producto()));

        assertTrue(vendedor.get("/api/pedidos/pendientes").cuerpo().contains("\"idPedido\":" + compra.pedido()));
        ClienteHttp.Respuesta cancelacion = vendedor.put("/api/pedidos/" + compra.pedido() + "/cancelar");

        assertEquals(204, cancelacion.estado(), cancelacion.toString());
        assertEquals("CANCELADO", datos.estadoPedido(compra.pedido()));
        assertEquals(5, datos.stock(compra.producto()));
        assertEquals(204, vendedor.put("/api/pedidos/" + compra.pedido() + "/cancelar").estado(),
                "Cancelar es idempotente (spec 004)");
        assertEquals(5, datos.stock(compra.producto()), "Repetir no repone dos veces");
    }

    @Test
    @DisplayName("US8: el vendedor no prepara, despacha ni entrega (403) y el pedido no cambia")
    void noRegistraDespachos() {
        Compra compra = comprar(new BigDecimal("20.00"), 5, 1);
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));
        String base = "/api/pedidos/" + compra.pedido();

        assertEquals(403, vendedor.put(base + "/preparar").estado());
        datos.forzarEstadoPedido(compra.pedido(), "EN_PREPARACION");
        assertEquals(403, vendedor.putJson(base + "/despachar",
                "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"OLV-1\"}").estado());
        assertEquals(403, vendedor.put(base + "/entregar").estado());
        assertEquals("EN_PREPARACION", datos.estadoPedido(compra.pedido()));
        assertEquals(409, vendedor.put(base + "/cancelar").estado(), "Solo se cancela un pedido PENDIENTE");
    }
}
