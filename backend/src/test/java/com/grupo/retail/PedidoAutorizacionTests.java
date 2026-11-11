package com.grupo.retail;

import com.grupo.retail.controller.PedidoController;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.SesionEmpleado;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of("PENDIENTE"));

        new PedidoService(dao, ejecutorSobre(conexion)).cancelarPedidoComoCliente(91L, 42L);

        verify(dao).registrarCancelacion(conexion, 91L, 42L, "CANCELADO");
        verify(conexion).commit();
    }

    @Test
    void cancelacionDeVendedorNoFiltraPorPropietarioYRegistraAlVendedorResponsable() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, null)).thenReturn(Optional.of("PENDIENTE"));

        new PedidoService(dao, ejecutorSobre(conexion)).cancelarPedidoComoVendedor(91L, 84L);

        verify(dao).registrarCancelacion(conexion, 91L, 84L, "CANCELADO");
    }

    @Test
    void cancelarUnPedidoYaCanceladoNoRepiteEfectos() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of("CANCELADO"));

        new PedidoService(dao, ejecutorSobre(conexion)).cancelarPedidoComoCliente(91L, 42L);

        verify(dao, never()).registrarCancelacion(any(), anyLong(), anyLong(), anyString());
        verify(conexion).commit();
    }

    @Test
    void elPatronStateRechazaCancelarUnPedidoDespachado() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of("DESPACHADO"));
        PedidoService servicio = new PedidoService(dao, ejecutorSobre(conexion));

        assertThrows(IllegalStateException.class, () -> servicio.cancelarPedidoComoCliente(91L, 42L));

        verify(dao, never()).registrarCancelacion(any(), anyLong(), anyLong(), anyString());
        verify(conexion).rollback();
    }

    @Test
    void cancelarUnPedidoInexistenteOAjenoResponde404() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.empty());
        PedidoService servicio = new PedidoService(dao, ejecutorSobre(conexion));

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

        assertEquals(Optional.of("PENDIENTE"),
                new PedidoDAO(mock(ProveedorConexiones.class)).bloquearEstadoPedido(conexion, 91L, null));

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(conexion).prepareStatement(sql.capture());
        assertFalse(sql.getValue().contains("usuario_id"));
        verify(consulta).setLong(1, 91L);
        verify(consulta, never()).setLong(2, 84L);
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
