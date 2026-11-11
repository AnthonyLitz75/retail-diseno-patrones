package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 006, T013 (US3, caso límite) con PostgreSQL y HTTP reales: si se desactiva al agente
 * que atiende un reclamo, el administrador lo ve como reclamo sin agente y lo reasigna a
 * otro agente de soporte activo, que puede seguir atendiéndolo.
 */
class ReasignacionReclamoTest extends BaseCompraIntegracion {

    private static final String RECLAMO = "{\"motivo\":\"No llegó completo\",\"descripcion\":\"Falta el cable\"}";

    private record Escenario(long reclamo, DatosIntegracion.Cliente agente, ClienteHttp admin) {
    }

    private Escenario reclamoEnAtencion() {
        Compra compra = comprar(new BigDecimal("30.00"), 5, 1);
        datos.forzarEstadoPedido(compra.pedido(), "ENTREGADO");
        long reclamo = sesionDe(compra.cliente())
                .postJson("/api/pedidos/" + compra.pedido() + "/reclamos", RECLAMO).campoNumerico("id");
        DatosIntegracion.Cliente agente = datos.crearEmpleado("SOPORTE");
        assertEquals(200, sesionDe(agente).put("/api/soporte/reclamos/" + reclamo + "/tomar").estado());
        return new Escenario(reclamo, agente, sesionDe(datos.crearEmpleado("ADMIN")));
    }

    private String destino(long soporteId) {
        return "{\"soporteId\":" + soporteId + "}";
    }

    @Test
    @DisplayName("Agente desactivado: el reclamo aparece sin agente y se reasigna a otro agente activo")
    void reasignaReclamoDeAgenteDesactivado() {
        Escenario e = reclamoEnAtencion();
        assertFalse(e.admin().get("/api/admin/incidencias/sin-agente").cuerpo().contains("\"id\":" + e.reclamo()),
                "Mientras el agente está activo no hace falta reasignar");

        assertEquals(204, e.admin().put("/api/admin/usuarios/" + e.agente().id() + "/desactivar").estado());
        assertTrue(e.admin().get("/api/admin/incidencias/sin-agente").cuerpo().contains("\"id\":" + e.reclamo()));

        DatosIntegracion.Cliente nuevo = datos.crearEmpleado("SOPORTE");
        ClienteHttp.Respuesta respuesta = e.admin().putJson(
                "/api/admin/incidencias/" + e.reclamo() + "/reasignar", destino(nuevo.id()));

        assertEquals(200, respuesta.estado(), respuesta.toString());
        assertEquals("EN_ATENCION", datos.estadoReclamo(e.reclamo()));
        assertEquals(nuevo.id(), datos.responsableReclamo(e.reclamo(), "soporte_id"));
        assertFalse(e.admin().get("/api/admin/incidencias/sin-agente").cuerpo().contains("\"id\":" + e.reclamo()));
        assertEquals(200, sesionDe(nuevo).putJson("/api/soporte/reclamos/" + e.reclamo() + "/responder",
                "{\"respuesta\":\"Enviamos el cable\",\"estado\":\"RESUELTO\"}").estado(),
                "El nuevo responsable continúa la atención");
    }

    @Test
    @DisplayName("Solo se reasigna un reclamo EN_ATENCION y solo a un agente de soporte activo")
    void validacionesDeReasignacion() {
        Escenario e = reclamoEnAtencion();
        String ruta = "/api/admin/incidencias/" + e.reclamo() + "/reasignar";
        DatosIntegracion.Cliente inactivo = datos.crearEmpleado("SOPORTE");
        datos.ejecutar("UPDATE usuario SET activo = FALSE WHERE id_usuario = ?", inactivo.id());

        assertEquals(400, e.admin().putJson(ruta, destino(datos.crearCliente().id())).estado(), "No es SOPORTE");
        assertEquals(400, e.admin().putJson(ruta, destino(inactivo.id())).estado(), "Agente inactivo");
        assertEquals(400, e.admin().putJson(ruta, "{}").estado(), "Destino obligatorio");
        assertEquals(404, e.admin().putJson("/api/admin/incidencias/999999999/reasignar",
                destino(e.agente().id())).estado());
        assertEquals(e.agente().id(), datos.responsableReclamo(e.reclamo(), "soporte_id"), "Nada cambió");

        Compra otra = comprar(new BigDecimal("30.00"), 5, 1);
        datos.forzarEstadoPedido(otra.pedido(), "ENTREGADO");
        long abierto = sesionDe(otra.cliente())
                .postJson("/api/pedidos/" + otra.pedido() + "/reclamos", RECLAMO).campoNumerico("id");
        assertEquals(409, e.admin().putJson("/api/admin/incidencias/" + abierto + "/reasignar",
                destino(e.agente().id())).estado(), "Un reclamo ABIERTO se toma desde la bandeja");
    }
}
