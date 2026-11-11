package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 006, T004 (US4, FR-003; RF14) con PostgreSQL y HTTP reales: nunca se solicita
 * devolver más de lo comprado menos lo ya comprometido (SOLICITADAS, APROBADAS y CERRADAS),
 * ni siquiera con solicitudes simultáneas, y solo sobre pedidos propios ENTREGADOS.
 */
class DevolucionSaldoTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("60.00");

    private Compra entregadoConDos() {
        Compra compra = comprar(PRECIO, 10, 2);
        datos.forzarEstadoPedido(compra.pedido(), "ENTREGADO");
        return compra;
    }

    private String solicitud(long pedidoDetalleId, int cantidad) {
        return "{\"motivo\":\"No cumple lo esperado\",\"lineas\":[{\"pedidoDetalleId\":" + pedidoDetalleId
                + ",\"cantidad\":" + cantidad + "}]}";
    }

    private ClienteHttp.Respuesta solicitar(ClienteHttp cliente, Compra compra, int cantidad) {
        long detalle = datos.idDetallePedido(compra.pedido(), compra.producto());
        return cliente.postJson("/api/pedidos/" + compra.pedido() + "/devoluciones", solicitud(detalle, cantidad));
    }

    @Test
    @DisplayName("US4.1 y US4.2: con 2 unidades compradas se devuelve 1 y luego solo queda 1 disponible")
    void saldoDevolvible() {
        Compra compra = entregadoConDos();
        ClienteHttp cliente = sesionDe(compra.cliente());

        ClienteHttp.Respuesta primera = solicitar(cliente, compra, 1);

        assertEquals(201, primera.estado(), primera.toString());
        long devolucion = primera.campoNumerico("id");
        assertEquals("SOLICITADA", datos.estadoDevolucion(devolucion));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "DEVOLUCION_SOLICITADA"));
        assertEquals(400, solicitar(cliente, compra, 2).estado(), "Solo queda 1 unidad");
        assertEquals(201, solicitar(cliente, compra, 1).estado());
        assertEquals(400, solicitar(cliente, compra, 1).estado(), "Ya no queda saldo");
        assertTrue(cliente.get("/api/devoluciones/mis-devoluciones").cuerpo().contains("\"id\":" + devolucion));
    }

    @Test
    @DisplayName("US4.3: pedido no entregado 400, pedido ajeno 404 y línea de otro pedido 400")
    void soloPedidosPropiosEntregados() {
        Compra pendiente = comprar(PRECIO, 10, 2);
        Compra ajeno = entregadoConDos();
        Compra propio = entregadoConDos();
        ClienteHttp cliente = sesionDe(pendiente.cliente());
        long detallePendiente = datos.idDetallePedido(pendiente.pedido(), pendiente.producto());
        long detalleAjeno = datos.idDetallePedido(ajeno.pedido(), ajeno.producto());

        assertEquals(400, cliente.postJson("/api/pedidos/" + pendiente.pedido() + "/devoluciones",
                solicitud(detallePendiente, 1)).estado());
        assertEquals(404, cliente.postJson("/api/pedidos/" + ajeno.pedido() + "/devoluciones",
                solicitud(detalleAjeno, 1)).estado());
        assertEquals(400, sesionDe(propio.cliente()).postJson("/api/pedidos/" + propio.pedido() + "/devoluciones",
                solicitud(detalleAjeno, 1)).estado(), "La línea no pertenece al pedido");
        assertEquals(400, sesionDe(propio.cliente()).postJson("/api/pedidos/" + propio.pedido() + "/devoluciones",
                "{\"motivo\":\"x\",\"lineas\":[]}").estado(), "Al menos una línea");
    }

    @Test
    @DisplayName("US4.4: dos solicitudes simultáneas por las mismas 2 unidades; solo una procede")
    void solicitudesSimultaneas() throws Exception {
        Compra compra = entregadoConDos();
        ClienteHttp pestania1 = sesionDe(compra.cliente());
        ClienteHttp pestania2 = sesionDe(compra.cliente());

        List<ClienteHttp.Respuesta> respuestas = enParalelo(List.<Callable<ClienteHttp.Respuesta>>of(
                () -> solicitar(pestania1, compra, 2), () -> solicitar(pestania2, compra, 2)));

        assertEquals(1, respuestas.stream().filter(r -> r.estado() == 201).count(), respuestas.toString());
        assertEquals(1, respuestas.stream().filter(r -> r.estado() == 400).count(), respuestas.toString());
    }

    @Test
    @DisplayName("US6.4: una devolución rechazada deja de consumir el saldo")
    void rechazadaLiberaElSaldo() {
        Compra compra = entregadoConDos();
        ClienteHttp cliente = sesionDe(compra.cliente());
        ClienteHttp soporte = sesionDe(datos.crearEmpleado("SOPORTE"));
        long devolucion = solicitar(cliente, compra, 2).campoNumerico("id");
        assertEquals(400, solicitar(cliente, compra, 1).estado());

        assertEquals(200, soporte.putJson("/api/soporte/devoluciones/" + devolucion + "/decision",
                "{\"aprobada\":false,\"observacion\":\"Fuera de plazo\"}").estado());

        assertEquals("RECHAZADA", datos.estadoDevolucion(devolucion));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "DEVOLUCION_RECHAZADA"));
        assertEquals(201, solicitar(cliente, compra, 2).estado(), "Las 2 unidades vuelven a estar disponibles");
    }
}
