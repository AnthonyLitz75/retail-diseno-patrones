package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 006, T006 (US1, US2, US3; RF13, RF24, RF28) con PostgreSQL y HTTP reales:
 * ciclo del reclamo ABIERTO -> EN_ATENCION -> RESUELTO | ESCALADO
 * (ESCALADO -> EN_ATENCION | RESUELTO), propiedad del pedido y responsables.
 */
class ReclamoTransicionesTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("80.00");
    private static final String RECLAMO = "{\"motivo\":\"Producto con falla\",\"descripcion\":\"El mouse no enciende\"}";

    private Compra entregado() {
        Compra compra = comprar(PRECIO, 5, 1);
        datos.forzarEstadoPedido(compra.pedido(), "ENTREGADO");
        return compra;
    }

    private long reclamar(ClienteHttp cliente, Compra compra) {
        ClienteHttp.Respuesta r = cliente.postJson("/api/pedidos/" + compra.pedido() + "/reclamos", RECLAMO);
        assertEquals(201, r.estado(), r.toString());
        return r.campoNumerico("id");
    }

    @Test
    @DisplayName("US1: el cliente reclama sobre su pedido entregado y Soporte lo ve ABIERTO")
    void reclamoSobrePedidoEntregado() {
        Compra compra = entregado();
        ClienteHttp cliente = sesionDe(compra.cliente());
        ClienteHttp soporte = sesionDe(datos.crearEmpleado("SOPORTE"));

        long reclamo = reclamar(cliente, compra);

        assertEquals("ABIERTO", datos.estadoReclamo(reclamo));
        assertTrue(soporte.get("/api/soporte/reclamos?estado=ABIERTO").cuerpo().contains("\"id\":" + reclamo));
        assertTrue(cliente.get("/api/reclamos/mis-reclamos").cuerpo().contains("\"id\":" + reclamo));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "RECLAMO_REGISTRADO"));
    }

    @Test
    @DisplayName("US1.2 y US1.3: pedido no entregado responde 400 y pedido ajeno 404")
    void reclamoSobrePedidoNoEntregadoOAjeno() {
        Compra pendiente = comprar(PRECIO, 5, 1);
        Compra ajeno = entregado();
        ClienteHttp cliente = sesionDe(pendiente.cliente());

        assertEquals(400, cliente.postJson("/api/pedidos/" + pendiente.pedido() + "/reclamos", RECLAMO).estado());
        assertEquals(404, cliente.postJson("/api/pedidos/" + ajeno.pedido() + "/reclamos", RECLAMO).estado());
        assertEquals(400, cliente.postJson("/api/pedidos/" + pendiente.pedido() + "/reclamos",
                "{\"motivo\":\"\",\"descripcion\":\"x\"}").estado(), "Motivo obligatorio");
    }

    @Test
    @DisplayName("US2: Soporte toma y resuelve; otro agente no puede responder; el cliente ve la respuesta")
    void soporteTomaYResuelve() {
        Compra compra = entregado();
        ClienteHttp cliente = sesionDe(compra.cliente());
        DatosIntegracion.Cliente agente = datos.crearEmpleado("SOPORTE");
        ClienteHttp soporte = sesionDe(agente);
        ClienteHttp otroAgente = sesionDe(datos.crearEmpleado("SOPORTE"));
        long reclamo = reclamar(cliente, compra);
        String base = "/api/soporte/reclamos/" + reclamo;
        String resolver = "{\"respuesta\":\"Te enviamos un reemplazo\",\"estado\":\"RESUELTO\"}";

        assertEquals(409, soporte.putJson(base + "/responder", resolver).estado(), "Sin tomar no se responde");
        assertEquals(200, soporte.put(base + "/tomar").estado());
        assertEquals(409, otroAgente.put(base + "/tomar").estado(), "Ya está EN_ATENCION");
        assertEquals("EN_ATENCION", datos.estadoReclamo(reclamo));
        assertEquals(agente.id(), datos.responsableReclamo(reclamo, "soporte_id"));
        assertEquals(409, otroAgente.putJson(base + "/responder", resolver).estado(), "Lo atiende otro agente");

        ClienteHttp.Respuesta respuesta = soporte.putJson(base + "/responder", resolver);

        assertEquals(200, respuesta.estado(), respuesta.toString());
        assertEquals("RESUELTO", datos.estadoReclamo(reclamo));
        assertTrue(cliente.get("/api/reclamos/mis-reclamos").cuerpo().contains("Te enviamos un reemplazo"));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "RECLAMO_RESUELTO"));
        assertEquals(409, soporte.put(base + "/tomar").estado(), "Un reclamo resuelto no se reabre");
    }

    @Test
    @DisplayName("US2: una respuesta parcial deja el reclamo EN_ATENCION y notifica RECLAMO_RESPONDIDO")
    void respuestaParcialSigueEnAtencion() {
        Compra compra = entregado();
        ClienteHttp soporte = sesionDe(datos.crearEmpleado("SOPORTE"));
        long reclamo = reclamar(sesionDe(compra.cliente()), compra);
        soporte.put("/api/soporte/reclamos/" + reclamo + "/tomar");

        ClienteHttp.Respuesta r = soporte.putJson("/api/soporte/reclamos/" + reclamo + "/responder",
                "{\"respuesta\":\"Estamos revisando\",\"estado\":\"EN_ATENCION\"}");

        assertEquals(200, r.estado(), r.toString());
        assertEquals("EN_ATENCION", datos.estadoReclamo(reclamo));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "RECLAMO_RESPONDIDO"));
    }

    @Test
    @DisplayName("US3: Soporte escala; el administrador lo devuelve con instrucciones y luego lo resuelve")
    void escalamientoYResolucionDelAdministrador() {
        Compra compra = entregado();
        DatosIntegracion.Cliente admin = datos.crearEmpleado("ADMIN");
        ClienteHttp soporte = sesionDe(datos.crearEmpleado("SOPORTE"));
        ClienteHttp administrador = sesionDe(admin);
        long reclamo = reclamar(sesionDe(compra.cliente()), compra);
        String base = "/api/soporte/reclamos/" + reclamo;
        soporte.put(base + "/tomar");

        assertEquals(200, soporte.putJson(base + "/escalar", "{\"motivoEscalamiento\":\"Requiere reembolso especial\"}").estado());
        assertEquals("ESCALADO", datos.estadoReclamo(reclamo));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "RECLAMO_ESCALADO"));
        assertTrue(administrador.get("/api/admin/incidencias").cuerpo().contains("\"id\":" + reclamo));

        assertEquals(200, administrador.putJson("/api/admin/incidencias/" + reclamo + "/resolver",
                "{\"resolucion\":\"Ofrecer cambio por otro modelo\",\"devolver\":true}").estado());
        assertEquals("EN_ATENCION", datos.estadoReclamo(reclamo), "Devuelto a Soporte con instrucciones");
        assertFalse(administrador.get("/api/admin/incidencias").cuerpo().contains("\"id\":" + reclamo));

        soporte.putJson(base + "/escalar", "{\"motivoEscalamiento\":\"El cliente no acepta el cambio\"}");
        ClienteHttp.Respuesta resuelto = administrador.putJson("/api/admin/incidencias/" + reclamo + "/resolver",
                "{\"resolucion\":\"Se autoriza el reembolso\"}");

        assertEquals(200, resuelto.estado(), resuelto.toString());
        assertEquals("RESUELTO", datos.estadoReclamo(reclamo));
        assertEquals(admin.id(), datos.responsableReclamo(reclamo, "admin_id"));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "RECLAMO_RESUELTO"));
        assertEquals(409, administrador.putJson("/api/admin/incidencias/" + reclamo + "/resolver",
                "{\"resolucion\":\"otra vez\"}").estado(), "Solo se resuelven reclamos ESCALADOS");
    }

    @Test
    @DisplayName("Roles: cliente no atiende (403), ADMIN ve la bandeja pero no la atiende, SOPORTE no ve incidencias")
    void permisosPorRol() {
        Compra compra = entregado();
        ClienteHttp cliente = sesionDe(compra.cliente());
        ClienteHttp administrador = sesionDe(datos.crearEmpleado("ADMIN"));
        ClienteHttp soporte = sesionDe(datos.crearEmpleado("SOPORTE"));
        long reclamo = reclamar(cliente, compra);

        assertEquals(403, cliente.get("/api/soporte/reclamos").estado());
        assertEquals(403, cliente.put("/api/soporte/reclamos/" + reclamo + "/tomar").estado());
        assertEquals(200, administrador.get("/api/soporte/reclamos").estado());
        assertEquals(403, administrador.put("/api/soporte/reclamos/" + reclamo + "/tomar").estado());
        assertEquals(403, soporte.get("/api/admin/incidencias").estado());
        assertEquals(403, soporte.postJson("/api/pedidos/" + compra.pedido() + "/reclamos", RECLAMO).estado());
        assertEquals(400, soporte.get("/api/soporte/reclamos?estado=INVENTADO").estado(), "Filtro de estado validado");
    }
}
