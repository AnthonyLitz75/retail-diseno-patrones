package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 006, T005 (US5, US6, SC-003; RF25, RF26) con PostgreSQL y HTTP reales: el cierre de
 * una devolución aprobada repone solo las unidades aptas, reembolsa por el precio histórico
 * mediante PuertoPago y cierra, todo en una transacción; repetirlo no duplica nada y un
 * reembolso rechazado lo revierte todo.
 */
class CierreDevolucionTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO_APTO = new BigDecimal("40.00");
    private static final BigDecimal PRECIO_DEFECTUOSO = new BigDecimal("25.50");
    private static final int STOCK_INICIAL = 10;

    /** Pedido entregado con dos productos (1 unidad de cada uno) y su devolución aprobada. */
    private record Escenario(DatosIntegracion.Cliente cliente, long pedido, long apto, long defectuoso,
            long devolucion, long lineaApta, long lineaDefectuosa, ClienteHttp soporte) {
    }

    private Escenario devolucionAprobada() {
        long apto = datos.crearProducto(PRECIO_APTO, STOCK_INICIAL);
        long defectuoso = datos.crearProducto(PRECIO_DEFECTUOSO, STOCK_INICIAL);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        Map<Long, Integer> lineas = new LinkedHashMap<>();
        lineas.put(apto, 1);
        lineas.put(defectuoso, 1);
        datos.crearCarritoActivo(cliente.id(), lineas);
        ClienteHttp sesion = sesionDe(cliente);
        long pedido = sesion.confirmarCompra("PRUEBA_APROBADA", null).idPedido();
        datos.forzarEstadoPedido(pedido, "ENTREGADO");
        long detalleApto = datos.idDetallePedido(pedido, apto);
        long detalleDefectuoso = datos.idDetallePedido(pedido, defectuoso);
        long devolucion = sesion.postJson("/api/pedidos/" + pedido + "/devoluciones",
                "{\"motivo\":\"Llegaron con fallas\",\"lineas\":[{\"pedidoDetalleId\":" + detalleApto
                        + ",\"cantidad\":1},{\"pedidoDetalleId\":" + detalleDefectuoso + ",\"cantidad\":1}]}")
                .campoNumerico("id");
        ClienteHttp soporte = sesionDe(datos.crearEmpleado("SOPORTE"));
        assertEquals(200, soporte.putJson("/api/soporte/devoluciones/" + devolucion + "/decision",
                "{\"aprobada\":true,\"observacion\":\"Envíanos los productos\"}").estado());
        return new Escenario(cliente, pedido, apto, defectuoso, devolucion,
                datos.idDetalleDevolucion(devolucion, detalleApto),
                datos.idDetalleDevolucion(devolucion, detalleDefectuoso), soporte);
    }

    private String recepcion(Escenario e, String escenarioReembolso) {
        return "{\"lineas\":[{\"detalleDevolucionId\":" + e.lineaApta() + ",\"reintegrarStock\":true},"
                + "{\"detalleDevolucionId\":" + e.lineaDefectuosa() + ",\"reintegrarStock\":false}]"
                + (escenarioReembolso == null ? "" : ",\"escenarioReembolso\":\"" + escenarioReembolso + "\"")
                + "}";
    }

    @Test
    @DisplayName("US6.1: 1 apta y 1 defectuosa: stock +1 solo de la apta, reembolso de ambas y CERRADA")
    void cierreRepondeSoloLoAptoYReembolsaTodo() {
        Escenario e = devolucionAprobada();
        assertEquals(1, datos.notificacionesDe(e.cliente().id(), e.pedido(), "DEVOLUCION_APROBADA"));

        ClienteHttp.Respuesta respuesta = e.soporte().putJson(
                "/api/soporte/devoluciones/" + e.devolucion() + "/recepcion", recepcion(e, null));

        assertEquals(200, respuesta.estado(), respuesta.toString());
        assertEquals("CERRADA", datos.estadoDevolucion(e.devolucion()));
        assertTrue(datos.devolucionTieneFechaCierre(e.devolucion()));
        assertEquals(STOCK_INICIAL, datos.stock(e.apto()), "La unidad apta vuelve al stock");
        assertEquals(STOCK_INICIAL - 1, datos.stock(e.defectuoso()), "La defectuosa no se repone");
        assertEquals(1, datos.movimientosDeTipo(e.apto(), "DEVOLUCION"));
        assertEquals(0, datos.movimientosDeTipo(e.defectuoso(), "DEVOLUCION"));
        assertEquals(6550, datos.centimosReembolsados(e.pedido()), "40.00 + 25.50 al precio histórico");
        assertEquals(1, datos.notificacionesDe(e.cliente().id(), e.pedido(), "DEVOLUCION_CERRADA"));
    }

    @Test
    @DisplayName("US6.3: repetir el cierre responde 409 y no repone ni reembolsa otra vez")
    void cierreRepetido() {
        Escenario e = devolucionAprobada();
        String ruta = "/api/soporte/devoluciones/" + e.devolucion() + "/recepcion";
        assertEquals(200, e.soporte().putJson(ruta, recepcion(e, null)).estado());

        ClienteHttp.Respuesta repetido = e.soporte().putJson(ruta, recepcion(e, null));

        assertEquals(409, repetido.estado(), repetido.toString());
        assertEquals(STOCK_INICIAL, datos.stock(e.apto()));
        assertEquals(1, datos.movimientosDeTipo(e.apto(), "DEVOLUCION"));
        assertEquals(6550, datos.centimosReembolsados(e.pedido()));
    }

    @Test
    @DisplayName("US6.2: un reembolso rechazado revierte todo: sin stock, sin movimientos y sigue APROBADA")
    void reembolsoRechazadoRevierteTodo() {
        Escenario e = devolucionAprobada();

        ClienteHttp.Respuesta respuesta = e.soporte().putJson(
                "/api/soporte/devoluciones/" + e.devolucion() + "/recepcion", recepcion(e, "PRUEBA_RECHAZADA"));

        assertEquals(409, respuesta.estado(), respuesta.toString());
        assertTrue(respuesta.cuerpo().toLowerCase().contains("reembolso"), respuesta.cuerpo());
        assertEquals("APROBADA", datos.estadoDevolucion(e.devolucion()));
        assertFalse(datos.devolucionTieneFechaCierre(e.devolucion()));
        assertEquals(STOCK_INICIAL - 1, datos.stock(e.apto()));
        assertEquals(0, datos.movimientosDeTipo(e.apto(), "DEVOLUCION"));
        assertEquals(0, datos.centimosReembolsados(e.pedido()));
        assertEquals(0, datos.notificacionesDe(e.cliente().id(), e.pedido(), "DEVOLUCION_CERRADA"));
    }

    @Test
    @DisplayName("FR-001: no se recibe una devolución sin aprobar ni se decide dos veces")
    void transicionesInvalidas() {
        Escenario e = devolucionAprobada();
        String base = "/api/soporte/devoluciones/" + e.devolucion();

        assertEquals(409, e.soporte().putJson(base + "/decision", "{\"aprobada\":false}").estado(),
                "Una devolución APROBADA ya no se decide");

        // Otra devolución, solo SOLICITADA: recibirla sin aprobar es 409.
        long otroProducto = datos.crearProducto(PRECIO_APTO, STOCK_INICIAL);
        datos.crearCarritoActivo(e.cliente().id(), Map.of(otroProducto, 1));
        ClienteHttp cliente = sesionDe(e.cliente());
        long otroPedido = cliente.confirmarCompra("PRUEBA_APROBADA", null).idPedido();
        datos.forzarEstadoPedido(otroPedido, "ENTREGADO");
        long detalle = datos.idDetallePedido(otroPedido, otroProducto);
        long solicitada = cliente.postJson("/api/pedidos/" + otroPedido + "/devoluciones",
                "{\"motivo\":\"x\",\"lineas\":[{\"pedidoDetalleId\":" + detalle + ",\"cantidad\":1}]}")
                .campoNumerico("id");
        long linea = datos.idDetalleDevolucion(solicitada, detalle);

        assertEquals(409, e.soporte().putJson("/api/soporte/devoluciones/" + solicitada + "/recepcion",
                "{\"lineas\":[{\"detalleDevolucionId\":" + linea + ",\"reintegrarStock\":true}]}").estado());
        assertEquals(400, e.soporte().putJson(base + "/recepcion",
                "{\"lineas\":[{\"detalleDevolucionId\":" + linea + ",\"reintegrarStock\":true}]}").estado(),
                "Una línea de otra devolución no se acepta");
    }
}
