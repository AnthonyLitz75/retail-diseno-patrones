package com.grupo.retail;

import com.grupo.retail.controller.PedidoController;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.PagoDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.patterns.facade.CheckoutFacade;
import com.grupo.retail.model.LineaReposicion;
import com.grupo.retail.model.PagoReembolsable;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.adapter.PuertoPago;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.SesionEmpleado;
import com.grupo.retail.transaccion.EjecutorTransaccion;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PedidoAutorizacionTests {

    private final PedidoService pedidoService = mock(PedidoService.class);
    private final SesionAutenticada sesionAutenticada = sesionActiva();
    private final PedidoController controller = new PedidoController(
            mock(CheckoutFacade.class),
            new SesionCliente(sesionAutenticada),
            new SesionEmpleado(sesionAutenticada),
            sesionAutenticada,
            pedidoService);

    @Test
    void clienteCancelaPedidoUsandoSuIdentidadDeSesion() {
        controller.cancelarPedido(91L, solicitud(42L, "CLIENTE"));

        verify(pedidoService).cancelarPedidoComoCliente(91L, 42L);
    }

    @Test
    void listaPedidosUsandoLaIdentidadDeSesionYNoUnIdDelCliente() {
        controller.listarMisPedidos(solicitud(42L, "CLIENTE"));

        verify(pedidoService).listarPedidosCliente(42L);
    }

    @Test
    void clienteConsultaDetalleUsandoLaIdentidadDeSesion() {
        controller.obtenerPedido(91L, solicitud(42L, "CLIENTE"));

        verify(pedidoService).buscarPedidoCliente(91L, 42L);
    }

    @Test
    void detalleDePedidoRechazaSesionAusente() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller.obtenerPedido(91L, new MockHttpServletRequest()));
        assertEquals(401, error.getStatusCode().value());
        verify(pedidoService, never()).buscarPedidoCliente(91L, 84L);
    }

    @Test
    void detalleSqlFiltraPorIdDePedidoYPropietarioYNoExponePedidoAjeno() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("p.id_pedido = ? AND p.usuario_id = ?")))
                .thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        assertTrue(new PedidoDAO(proveedor).buscarPorIdYCliente(91L, 42L).isEmpty());

        verify(consulta).setLong(1, 91L);
        verify(consulta).setLong(2, 42L);
        verify(conexion, never()).prepareStatement(contains("FROM pedido_detalle"));
    }

    @Test
    void vendedorPuedeCancelarPedidoYQuedaIdentificadoComoActor() {
        controller.cancelarPedido(91L, solicitud(84L, "VENDEDOR"));

        verify(pedidoService).cancelarPedidoComoVendedor(91L, 84L);
    }

    @Test
    void adminPuedeCancelarPedidoYQuedaIdentificadoComoActor() {
        controller.cancelarPedido(91L, solicitud(99L, "ADMIN"));

        verify(pedidoService).cancelarPedidoComoAdmin(91L, 99L);
    }

    @Test
    void rolesDistintosDeClienteOVendedorNoPuedenCancelar() {
        for (String rol : new String[] { "ALMACEN", "SOPORTE" }) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> controller.cancelarPedido(91L, solicitud(84L, rol)));
            assertEquals(403, error.getStatusCode().value(), rol);
        }

        verify(pedidoService, never()).cancelarPedidoComoCliente(91L, 84L);
        verify(pedidoService, never()).cancelarPedidoComoVendedor(91L, 84L);
        verify(pedidoService, never()).cancelarPedidoComoAdmin(91L, 84L);
    }

    @Test
    void cancelarSinSesionRespondeNoAutorizado() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
                () -> controller.cancelarPedido(91L, new MockHttpServletRequest()));

        assertEquals(401, error.getStatusCode().value());
        verify(pedidoService, never()).cancelarPedidoComoCliente(91L, 42L);
        verify(pedidoService, never()).cancelarPedidoComoVendedor(91L, 42L);
    }

    @Test
    void cancelacionDeClienteBloqueaSoloSuPedidoYRegistraEnLaMismaTransaccion() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        cancelable(dao, conexion);

        PublicadorEventosPedido publicador = mock(PublicadorEventosPedido.class);

        new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), reembolsoAceptado(), ejecutorSobre(conexion), publicador).cancelarPedidoComoCliente(91L, 42L);

        verify(dao).marcarCancelado(conexion, 91L, "CANCELADO");
        verify(dao).registrarHistorial(eq(conexion), eq(91L), eq("CANCELADO"), eq(42L), anyString());
        // Observer: el evento sale con la misma conexión, después de registrar la cancelación.
        ArgumentCaptor<EventoPedido> evento = ArgumentCaptor.forClass(EventoPedido.class);
        verify(publicador).publicar(eq(conexion), evento.capture());
        assertEquals(91L, evento.getValue().pedidoId());
        assertEquals(42L, evento.getValue().clienteId());
        assertEquals("PENDIENTE", evento.getValue().estadoAnterior());
        assertEquals("CANCELADO", evento.getValue().estadoNuevo());
        verify(conexion).commit();
    }

    @Test
    void cancelacionDeVendedorNoFiltraPorPropietarioYRegistraAlVendedorResponsable() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, null)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        cancelable(dao, conexion);

        new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), reembolsoAceptado(), ejecutorSobre(conexion), mock(PublicadorEventosPedido.class)).cancelarPedidoComoVendedor(91L, 84L);

        verify(dao).marcarCancelado(conexion, 91L, "CANCELADO");
        verify(dao).registrarHistorial(eq(conexion), eq(91L), eq("CANCELADO"), eq(84L), anyString());
    }

    @Test
    void cancelarReembolsaElCobroAtravesDelPuertoDePago() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        cancelable(dao, conexion);
        PuertoPago puerto = reembolsoAceptado();

        new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), puerto, ejecutorSobre(conexion), mock(PublicadorEventosPedido.class))
                .cancelarPedidoComoCliente(91L, 42L);

        // Adapter: se devuelve todo lo cobrado, con la referencia del cobro original.
        verify(puerto).reembolsar(new BigDecimal("49.00"), "SIM-1", null);
        verify(conexion).commit();
    }

    @Test
    void siElProveedorRechazaElReembolsoLaCancelacionSeRevierteEntera() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        cancelable(dao, conexion);
        PuertoPago puerto = mock(PuertoPago.class);
        when(puerto.reembolsar(any(), any(), any()))
                .thenReturn(new ResultadoPago(false, "SIMULADO", "RECHAZADO", "REM-2", "Rechazado"));
        PublicadorEventosPedido publicador = mock(PublicadorEventosPedido.class);
        PedidoService servicio = new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), puerto, ejecutorSobre(conexion), publicador);

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> servicio.cancelarPedidoComoCliente(91L, 42L));

        assertTrue(error.getMessage().contains("el pedido sigue pendiente"));
        verify(conexion).rollback();
        verify(conexion, never()).commit();
        verifyNoInteractions(publicador);
    }

    @Test
    void cancelarSinUnCobroAprobadoNoTocaNadaYResponde409() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        cancelable(dao, conexion);
        PagoDAO sinPago = mock(PagoDAO.class);
        when(sinPago.bloquearPagoAprobado(conexion, 91L)).thenReturn(Optional.empty());
        PuertoPago puerto = mock(PuertoPago.class);
        PedidoService servicio = new PedidoService(dao, sinPago, inventarioOk(), puerto, ejecutorSobre(conexion), mock(PublicadorEventosPedido.class));

        assertThrows(IllegalStateException.class, () -> servicio.cancelarPedidoComoCliente(91L, 42L));

        verify(dao, never()).marcarCancelado(any(), anyLong(), anyString());
        verifyNoInteractions(puerto);
        verify(conexion).rollback();
    }

    @Test
    void cancelarUnPedidoYaCanceladoNoRepiteEfectos() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("CANCELADO", 42L)));

        PublicadorEventosPedido publicador = mock(PublicadorEventosPedido.class);

        new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), reembolsoAceptado(), ejecutorSobre(conexion), publicador).cancelarPedidoComoCliente(91L, 42L);

        verify(dao, never()).marcarCancelado(any(), anyLong(), anyString());
        verifyNoInteractions(publicador); // repetir la cancelación no vuelve a avisar
        verify(conexion).commit();
    }

    @Test
    void elPatronStateRechazaCancelarUnPedidoDespachado() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("DESPACHADO", 42L)));
        PedidoService servicio = new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), reembolsoAceptado(), ejecutorSobre(conexion), mock(PublicadorEventosPedido.class));

        assertThrows(IllegalStateException.class, () -> servicio.cancelarPedidoComoCliente(91L, 42L));

        verify(dao, never()).marcarCancelado(any(), anyLong(), anyString());
        verify(conexion).rollback();
    }

    @Test
    void cancelarUnPedidoInexistenteOAjenoResponde404() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.empty());
        PedidoService servicio = new PedidoService(dao, pagoAprobado(conexion), inventarioOk(), reembolsoAceptado(), ejecutorSobre(conexion), mock(PublicadorEventosPedido.class));

        assertThrows(NoSuchElementException.class, () -> servicio.cancelarPedidoComoCliente(91L, 42L));
        verify(conexion).rollback();
    }

    @Test
    void bloqueoDelClienteFiltraPorPropietarioYNoRevelaPedidosAjenos() throws Exception {
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(conexion.prepareStatement(anyString())).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        assertTrue(new PedidoDAO(mock(ProveedorConexiones.class))
                .bloquearEstadoPedido(conexion, 91L, 42L).isEmpty());

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(conexion).prepareStatement(sql.capture());
        assertTrue(sql.getValue().contains("usuario_id = ?"));
        assertTrue(sql.getValue().contains("FOR UPDATE"));
        verify(consulta).setLong(1, 91L);
        verify(consulta).setLong(2, 42L);
        verify(conexion, never()).close();
    }

    @Test
    void bloqueoDeVendedorNoImponeFiltroDePropietario() throws Exception {
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(conexion.prepareStatement(anyString())).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(true);
        when(resultado.getString("estado")).thenReturn("PENDIENTE");
        when(resultado.getLong("usuario_id")).thenReturn(42L);

        assertEquals(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)),
                new PedidoDAO(mock(ProveedorConexiones.class)).bloquearEstadoPedido(conexion, 91L, null));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(conexion).prepareStatement(sql.capture());
        assertFalse(sql.getValue().contains("usuario_id = ?"));
        verify(consulta).setLong(1, 91L);
        verify(consulta, never()).setLong(2, 84L);
    }

    /** Cobro aprobado de S/ 49.00 con referencia SIM-1, ya bloqueado para reembolsar. */
    private static PagoDAO pagoAprobado(Connection conexion) throws Exception {
        PagoDAO pagoDAO = mock(PagoDAO.class);
        when(pagoDAO.bloquearPagoAprobado(eq(conexion), anyLong())).thenReturn(Optional.of(
                new PagoReembolsable(7L, new BigDecimal("49.00"), BigDecimal.ZERO, "SIM-1")));
        when(pagoDAO.marcarReversado(conexion, 7L)).thenReturn(true);
        return pagoDAO;
    }

    /** El pedido 91 tiene una línea (producto 6, 2 unidades) y sigue pendiente al cancelarlo. */
    private static void cancelable(PedidoDAO dao, Connection conexion) throws Exception {
        when(dao.bloquearLineasPedido(conexion, 91L)).thenReturn(List.of(new LineaReposicion(6L, 2)));
        when(dao.marcarCancelado(eq(conexion), eq(91L), anyString())).thenReturn(true);
    }

    private static InventarioDAO inventarioOk() throws Exception {
        InventarioDAO inventario = mock(InventarioDAO.class);
        when(inventario.sumarStock(any(), anyLong(), anyInt())).thenReturn(true);
        return inventario;
    }

    private static PuertoPago reembolsoAceptado() {
        PuertoPago puerto = mock(PuertoPago.class);
        when(puerto.reembolsar(any(), any(), any()))
                .thenReturn(new ResultadoPago(true, "SIMULADO", "REEMBOLSADO", "REM-1", "Reembolso aprobado"));
        return puerto;
    }

    private static EjecutorTransaccion ejecutorSobre(Connection conexion) throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        return new EjecutorTransaccion(proveedor);
    }

    private HttpServletRequest solicitud(Long usuarioId, String rol) {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
        var sesion = solicitud.getSession();
        sesion.setAttribute("usuarioId", usuarioId);
        sesion.setAttribute("usuarioRol", rol);
        return solicitud;
    }
    private static SesionAutenticada sesionActiva() {
        UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
        return new SesionAutenticada(usuarioDAO);
    }}
