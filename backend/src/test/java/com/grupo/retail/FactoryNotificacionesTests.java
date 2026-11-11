package com.grupo.retail;

import com.grupo.retail.controller.NotificacionController;
import com.grupo.retail.dao.NotificacionDAO;
import com.grupo.retail.model.EventoNotificacion;
import com.grupo.retail.model.Notificacion;
import com.grupo.retail.patterns.factory.FabricaNotificadorConsola;
import com.grupo.retail.patterns.factory.FabricaNotificadorInApp;
import com.grupo.retail.patterns.factory.NotificadorConsola;
import com.grupo.retail.patterns.factory.NotificadorInApp;
import com.grupo.retail.service.NotificacionService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionCliente;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.*;

class FactoryNotificacionesTests {
    @Test
    void factoryMethodCreaNotificadoresDeCadaCanal() {
        assertInstanceOf(NotificadorInApp.class, new FabricaNotificadorInApp().crearNotificador());
        assertInstanceOf(NotificadorConsola.class, new FabricaNotificadorConsola().crearNotificador());
    }

    @Test
    void notificadorConsolaEmiteSinRequerirConexion() {
        var evento = new EventoNotificacion(7L, 15L, "ENTREGADO", "Pedido entregado con éxito");
        var notificador = new NotificadorConsola();
        assertDoesNotThrow(() -> notificador.notificar(evento));
    }

    @Test
    void notificadorConsolaDelegaCorrectamenteConSobrecargaDeConexion() {
        Connection conexion = mock(Connection.class);
        var evento = new EventoNotificacion(7L, 15L, "ENTREGADO", "Pedido entregado con éxito");
        var notificador = new NotificadorConsola();
        assertDoesNotThrow(() -> notificador.notificar(conexion, evento));
        verifyNoInteractions(conexion);
    }

    @Test
    void notificadorInAppLanzaExcepcionSiSeLlamaSinConexion() {
        var evento = new EventoNotificacion(7L, 15L, "PENDIENTE", "Pedido en espera");
        var notificador = new NotificadorInApp();
        assertThrows(UnsupportedOperationException.class, () -> notificador.notificar(evento));
    }

    @Test
    void notificadorInAppInsertaUsandoLaConexionDeLaTransaccion() throws Exception {
        Connection conexion = mock(Connection.class);
        PreparedStatement insercion = mock(PreparedStatement.class);
        when(conexion.prepareStatement(contains("INSERT INTO notificacion"))).thenReturn(insercion);
        var evento = new EventoNotificacion(7L, 15L, "DESPACHADO", "Pedido despachado");

        new FabricaNotificadorInApp().crearNotificador().notificar(conexion, evento);

        verify(insercion).setLong(1, 7L);
        verify(insercion).setLong(2, 15L);
        verify(insercion).setString(3, "DESPACHADO");
        verify(insercion).setString(4, "Pedido despachado");
        verify(insercion).executeUpdate();
        verify(insercion).close();
    }

    @Test
    void cambioDeEstadoNotificaDentroDeLaMismaConexionAntesDelCommit() throws Exception {
        var proveedor = mock(com.grupo.retail.patterns.singleton.ProveedorConexiones.class);
        var conexion = mock(Connection.class);
        var factory = mock(com.grupo.retail.patterns.factory.FabricaNotificador.class);
        var notifier = mock(com.grupo.retail.patterns.factory.Notificador.class);
        var update = mock(PreparedStatement.class);
        var lookup = mock(PreparedStatement.class);
        var history = mock(PreparedStatement.class);
        var filas = mock(java.sql.ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(factory.crearNotificador()).thenReturn(notifier);
        when(conexion.prepareStatement(contains("UPDATE pedido"))).thenReturn(update);
        when(conexion.prepareStatement(contains("SELECT usuario_id"))).thenReturn(lookup);
        when(conexion.prepareStatement(contains("INSERT INTO pedido_historial_estado"))).thenReturn(history);
        when(update.executeUpdate()).thenReturn(1);
        when(lookup.executeQuery()).thenReturn(filas);
        when(filas.next()).thenReturn(true);
        when(filas.getLong("usuario_id")).thenReturn(7L);

        var ejecutor = new com.grupo.retail.transaccion.EjecutorTransaccion(proveedor);
        var dao = new com.grupo.retail.dao.PedidoDAO(proveedor, factory);
        ejecutor.ejecutar("fallo", c -> {
            dao.registrarTransicion(c, 15L, "EN_PREPARACION", 8L, "Preparado", null);
            return null;
        });
        verify(notifier).notificar(eq(conexion), eq(new EventoNotificacion(
                7L, 15L, "EN_PREPARACION", "Preparado")));
        var orden = inOrder(notifier, conexion);
        orden.verify(notifier).notificar(eq(conexion), any(EventoNotificacion.class));
        orden.verify(conexion).commit();
        verify(conexion, never()).rollback();
    }

    @Test
    void errorAlGuardarNotificacionRevierteElCambioDePedido() throws Exception {
        var proveedor = mock(com.grupo.retail.patterns.singleton.ProveedorConexiones.class);
        var conexion = mock(Connection.class);
        var factory = mock(com.grupo.retail.patterns.factory.FabricaNotificador.class);
        var notifier = mock(com.grupo.retail.patterns.factory.Notificador.class);
        var update = mock(PreparedStatement.class);
        var lookup = mock(PreparedStatement.class);
        var history = mock(PreparedStatement.class);
        var filas = mock(java.sql.ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(factory.crearNotificador()).thenReturn(notifier);
        when(conexion.prepareStatement(contains("UPDATE pedido"))).thenReturn(update);
        when(conexion.prepareStatement(contains("SELECT usuario_id"))).thenReturn(lookup);
        when(conexion.prepareStatement(contains("INSERT INTO pedido_historial_estado"))).thenReturn(history);
        when(update.executeUpdate()).thenReturn(1);
        when(lookup.executeQuery()).thenReturn(filas);
        when(filas.next()).thenReturn(true);
        when(filas.getLong("usuario_id")).thenReturn(7L);
        doThrow(new java.sql.SQLException("fallo de persistencia"))
                .when(notifier).notificar(eq(conexion), any(EventoNotificacion.class));

        var ejecutor = new com.grupo.retail.transaccion.EjecutorTransaccion(proveedor);
        var dao = new com.grupo.retail.dao.PedidoDAO(proveedor, factory);
        assertThrows(com.grupo.retail.exception.ErrorAccesoDatosException.class, () -> ejecutor.ejecutar(
                "fallo", c -> {
                    dao.registrarTransicion(c, 15L, "EN_PREPARACION", 8L, "Preparado", null);
                    return null;
                }));
        verify(conexion).rollback();
        verify(conexion, never()).commit();
    }
    @Test
    void listadoDeNotificacionesExigeClienteYUsaSuIdentidadDeSesion() {
        NotificacionService service = mock(NotificacionService.class);
        Notificacion nota = new Notificacion(9L, 7L, 15L, "DESPACHADO", "Pedido despachado",
                false, OffsetDateTime.parse("2026-10-16T10:00:00Z"));
        when(service.listar(7L, null, 50)).thenReturn(List.of(nota));
        var controller = new NotificacionController(service, sesionCliente());

        assertEquals(List.of(nota), controller.listarMias(null, 50, solicitud(7L, "CLIENTE")));
        assertEquals(List.of(nota), controller.listarMias(null, 50, solicitud(7L, "ALMACEN")));
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> controller.listarMias(null, 50, new MockHttpServletRequest()))
                .getStatusCode().value());
        verify(service, times(2)).listar(7L, null, 50);
        verify(service, never()).listar(7L, null, 100);
    }

    @Test
    void servicioLimitaCursorYPaginacion() {
        NotificacionDAO dao = mock(NotificacionDAO.class);
        var service = new NotificacionService(dao);
        assertThrows(IllegalArgumentException.class, () -> service.listar(3L, 0L, 50));
        assertThrows(IllegalArgumentException.class, () -> service.listar(3L, null, 101));
        verifyNoInteractions(dao);
    }

    private SesionCliente sesionCliente() {
        var usuarioDAO = mock(com.grupo.retail.dao.UsuarioDAO.class);
        when(usuarioDAO.sesionSigueVigente(7L, "CLIENTE")).thenReturn(true);
        when(usuarioDAO.sesionSigueVigente(7L, "ALMACEN")).thenReturn(true);
        return new SesionCliente(new SesionAutenticada(usuarioDAO));
    }

    private MockHttpServletRequest solicitud(Long usuarioId, String rol) {
        var request = new MockHttpServletRequest();
        HttpSession session = request.getSession(true);
        session.setAttribute("usuarioId", usuarioId);
        session.setAttribute("usuarioRol", rol);
        return request;
    }
}
