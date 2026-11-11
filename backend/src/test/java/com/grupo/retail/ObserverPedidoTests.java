package com.grupo.retail;

import com.grupo.retail.model.EventoNotificacion;
import com.grupo.retail.patterns.factory.FabricaNotificadorConsola;
import com.grupo.retail.patterns.factory.FabricaNotificadorInApp;
import com.grupo.retail.patterns.factory.Notificador;
import com.grupo.retail.patterns.observer.AuditoriaConsolaObservador;
import com.grupo.retail.patterns.observer.CorreoSimuladoObservador;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.NotificadorInAppObservador;
import com.grupo.retail.patterns.observer.ObservadorPedidoPostCommit;
import com.grupo.retail.patterns.observer.ObservadorPedidoTransaccional;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Spec 005, T002 (US1, US2, SC-002): el observador in-app participa en la transacción del
 * pedido y los observadores post-commit solo corren si la transacción se confirma.
 */
class ObserverPedidoTests {

    private static final EventoPedido EVENTO = new EventoPedido(
            15L, 7L, "EN_PREPARACION", "DESPACHADO",
            OffsetDateTime.parse("2026-11-10T10:00:00Z"), "Pedido despachado por almacén");

    private Connection conexion;
    private EjecutorTransaccion ejecutor;
    private ObservadorPedidoTransaccional transaccional;
    private ObservadorPedidoPostCommit postCommit;
    private PublicadorEventosPedido publicador;

    @BeforeEach
    void setUp() throws SQLException {
        conexion = mock(Connection.class);
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        ejecutor = new EjecutorTransaccion(proveedor);
        transaccional = mock(ObservadorPedidoTransaccional.class);
        postCommit = mock(ObservadorPedidoPostCommit.class);
        publicador = new PublicadorEventosPedido(List.of(transaccional), List.of(postCommit), ejecutor);
    }

    @Test
    void elObservadorTransaccionalRecibeLaConexionYLosPostCommitCorrenTrasElCommit() throws Exception {
        ejecutor.ejecutar("fallo", c -> {
            publicador.publicar(c, EVENTO);
            verifyNoInteractions(postCommit); // todavía no hay commit
            return null;
        });

        InOrder orden = inOrder(transaccional, conexion, postCommit);
        orden.verify(transaccional).alCambiarEstado(conexion, EVENTO);
        orden.verify(conexion).commit();
        orden.verify(postCommit).alConfirmar(EVENTO);
    }

    @Test
    void siElObservadorInAppFallaSeRevierteTodoYNoHayAvisosPostCommit() throws Exception {
        doThrow(new SQLException("no se pudo guardar la alerta"))
                .when(transaccional).alCambiarEstado(any(), any());

        assertThrows(RuntimeException.class, () -> ejecutor.ejecutar("fallo", c -> {
            publicador.publicar(c, EVENTO);
            return null;
        }));

        verify(conexion).rollback();
        verify(conexion, never()).commit();
        verifyNoInteractions(postCommit);
    }

    @Test
    void unRollbackPosteriorTambienCancelaLosAvisosPostCommit() throws Exception {
        assertThrows(IllegalStateException.class, () -> ejecutor.ejecutar("fallo", c -> {
            publicador.publicar(c, EVENTO);
            throw new IllegalStateException("falló un paso posterior del caso de uso");
        }));

        verify(transaccional).alCambiarEstado(conexion, EVENTO);
        verifyNoInteractions(postCommit);
    }

    @Test
    void notificadorInAppObservadorUsaLaFabricaYLaConexionDeLaTransaccion() throws Exception {
        FabricaNotificadorInApp fabrica = mock(FabricaNotificadorInApp.class);
        Notificador notificador = mock(Notificador.class);
        when(fabrica.crearNotificador()).thenReturn(notificador);

        new NotificadorInAppObservador(fabrica).alCambiarEstado(conexion, EVENTO);

        verify(notificador).notificar(eq(conexion),
                eq(new EventoNotificacion(7L, 15L, "DESPACHADO", "Pedido despachado por almacén")));
    }

    @Test
    void correoSimuladoUsaLaFabricaDeConsolaSinConexion() {
        FabricaNotificadorConsola fabrica = mock(FabricaNotificadorConsola.class);
        Notificador notificador = mock(Notificador.class);
        when(fabrica.crearNotificador()).thenReturn(notificador);

        new CorreoSimuladoObservador(fabrica).alConfirmar(EVENTO);

        verify(notificador).notificar(new EventoNotificacion(7L, 15L, "DESPACHADO", "Pedido despachado por almacén"));
    }

    @Test
    void auditoriaGeneraUnRegistroEstructuradoConTodosLosCampos() {
        String linea = AuditoriaConsolaObservador.formatear(EVENTO);

        assertEquals("AUDITORIA_PEDIDO pedido=15 cliente=7 anterior=EN_PREPARACION nuevo=DESPACHADO"
                + " fecha=2026-11-10T10:00Z motivo=\"Pedido despachado por almacén\"", linea);
        assertTrue(AuditoriaConsolaObservador.formatear(new EventoPedido(
                3L, 2L, null, "PENDIENTE", OffsetDateTime.parse("2026-11-10T10:00:00Z"), "Compra"))
                .contains("anterior=NINGUNO"));
    }

    @Test
    void elEventoExigeLosDatosMinimos() {
        assertThrows(NullPointerException.class,
                () -> new EventoPedido(1L, 2L, null, null, OffsetDateTime.now(), "x"));
        assertThrows(NullPointerException.class,
                () -> new EventoPedido(1L, 2L, null, "PENDIENTE", null, "x"));
    }
}
