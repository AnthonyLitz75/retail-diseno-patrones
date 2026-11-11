package com.grupo.retail.integracion;

import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.ObservadorPedidoPostCommit;
import com.grupo.retail.patterns.observer.ObservadorPedidoTransaccional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.sql.Connection;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.ConcurrentLinkedQueue;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 005, T008 (US1, US2, SC-001, SC-002) con PostgreSQL y HTTP reales.
 *
 * <p>Los dos observadores de esta clase se registran solo en la prueba, como beans, sin
 * editar PedidoService ni CheckoutFacade: así se demuestra que un canal nuevo es una clase
 * nueva y su registro.</p>
 */
@Import(ObserverIntegracionTest.CanalesDePrueba.class)
class ObserverIntegracionTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("33.00");

    /** Lo que vio el observador transaccional, con la conexión que recibió. */
    record Visto(EventoPedido evento, boolean conexionAbiertaSinAutoCommit) {
    }

    static final Queue<Visto> TRANSACCIONAL = new ConcurrentLinkedQueue<>();
    static final Queue<EventoPedido> POST_COMMIT = new ConcurrentLinkedQueue<>();

    @TestConfiguration
    static class CanalesDePrueba {
        @Bean
        ObservadorPedidoTransaccional canalTransaccionalDePrueba() {
            return (Connection conexion, EventoPedido evento) ->
                    TRANSACCIONAL.add(new Visto(evento, !conexion.isClosed() && !conexion.getAutoCommit()));
        }

        @Bean
        ObservadorPedidoPostCommit canalPostCommitDePrueba() {
            return POST_COMMIT::add;
        }
    }

    @BeforeEach
    void limpiar() {
        TRANSACCIONAL.clear();
        POST_COMMIT.clear();
    }

    @Test
    @DisplayName("SC-001: un canal nuevo recibe la confirmación y cada transición sin editar los servicios")
    void unCanalNuevoRecibeLosEventosSinEditarLosServicios() {
        Compra compra = comprar(PRECIO, 5, 1);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));

        assertEquals(204, almacen.put("/api/pedidos/" + compra.pedido() + "/preparar").estado());

        List<EventoPedido> transaccionales = eventosDe(compra.pedido(), TRANSACCIONAL.stream().map(Visto::evento).toList());
        assertEquals(2, transaccionales.size(), transaccionales.toString());
        EventoPedido creado = transaccionales.get(0);
        assertEquals(null, creado.estadoAnterior());
        assertEquals("PENDIENTE", creado.estadoNuevo());
        assertEquals(compra.cliente().id(), creado.clienteId());
        EventoPedido preparado = transaccionales.get(1);
        assertEquals("PENDIENTE", preparado.estadoAnterior());
        assertEquals("EN_PREPARACION", preparado.estadoNuevo());
        assertTrue(TRANSACCIONAL.stream().allMatch(Visto::conexionAbiertaSinAutoCommit),
                "El observador transaccional recibe la conexión abierta de la transacción");

        assertEquals(transaccionales, eventosDe(compra.pedido(), List.copyOf(POST_COMMIT)),
                "Tras el commit, los post-commit reciben los mismos eventos");
    }

    @Test
    @DisplayName("US1.1: la alerta in-app se guarda al confirmar y en cada transición")
    void laAlertaInAppSeGuardaEnLaCampanaDelCliente() {
        Compra compra = comprar(PRECIO, 5, 1);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));
        almacen.put("/api/pedidos/" + compra.pedido() + "/preparar");

        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "PENDIENTE"));
        assertEquals(1, datos.notificacionesDe(compra.cliente().id(), compra.pedido(), "EN_PREPARACION"));
    }

    @Test
    @DisplayName("US1.2 y US2.2: si la alerta in-app falla, se revierte el cambio y no hay avisos post-commit")
    void siLaAlertaFallaSeRevierteElCambio() {
        Compra compra = comprar(PRECIO, 5, 1);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));
        POST_COMMIT.clear();
        datos.ejecutar("CREATE OR REPLACE FUNCTION prueba_fallo_notificacion() RETURNS trigger AS $$ "
                + "BEGIN IF NEW.pedido_id = " + compra.pedido() + " AND NEW.estado = 'EN_PREPARACION' THEN "
                + "RAISE EXCEPTION 'Fallo forzado al guardar la alerta'; END IF; RETURN NEW; END; "
                + "$$ LANGUAGE plpgsql");
        datos.ejecutar("CREATE TRIGGER prueba_fallo_notificacion BEFORE INSERT ON notificacion "
                + "FOR EACH ROW EXECUTE FUNCTION prueba_fallo_notificacion()");
        ClienteHttp.Respuesta respuesta;
        try {
            respuesta = almacen.put("/api/pedidos/" + compra.pedido() + "/preparar");
        } finally {
            datos.ejecutar("DROP TRIGGER IF EXISTS prueba_fallo_notificacion ON notificacion");
            datos.ejecutar("DROP FUNCTION IF EXISTS prueba_fallo_notificacion()");
        }

        assertEquals(500, respuesta.estado(), respuesta.toString());
        assertEquals("PENDIENTE", datos.estadoPedido(compra.pedido()), "El cambio de estado se revierte");
        assertEquals(0, datos.historialDe(compra.pedido(), "EN_PREPARACION"));
        assertFalse(POST_COMMIT.stream().anyMatch(e -> e.pedidoId() == compra.pedido()),
                "Una transacción revertida no genera auditoría ni correo simulado");
    }

    private static List<EventoPedido> eventosDe(long pedidoId, List<EventoPedido> eventos) {
        List<EventoPedido> delPedido = eventos.stream().filter(e -> e.pedidoId() == pedidoId).toList();
        delPedido.forEach(e -> assertNotNull(e.fecha()));
        return delPedido;
    }
}
