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
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.NoSuchElementException;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
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
    void detalleDePedidoRechazaOtrosRolesYSesionAusente() {
        for (String rol : new String[] { "ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE" }) {
            ResponseStatusException error = assertThrows(ResponseStatusException.class,
                    () -> controller.obtenerPedido(91L, solicitud(84L, rol)));
            assertEquals(403, error.getStatusCode().value(), rol);
        }

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
    void cancelacionDeClienteLimitaElPedidoAlPropietarioDeSesion() {
        PedidoDAO dao = mock(PedidoDAO.class);
        new PedidoService(dao).cancelarPedidoComoCliente(91L, 42L);

        verify(dao).cancelarPedido(91L, 42L, 42L, "CANCELADO");
    }

    @Test
    void cancelacionDeVendedorNoFiltraPorPropietarioYRegistraAlVendedorResponsable() {
        PedidoDAO dao = mock(PedidoDAO.class);
        new PedidoService(dao).cancelarPedidoComoVendedor(91L, 84L);

        verify(dao).cancelarPedido(91L, null, 84L, "CANCELADO");
    }

    @Test
    void consultaSqlDelClienteFiltraPorPropietarioYNoRevelaPedidosAjenos() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("SELECT estado"))).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        PedidoDAO dao = new PedidoDAO(proveedor);
        assertThrows(NoSuchElementException.class,
                () -> dao.cancelarPedido(91L, 42L, 42L, "CANCELADO"));

        verify(consulta).setLong(1, 91L);
        verify(consulta).setLong(2, 42L);
        verify(conexion).rollback();
    }

    @Test
    void consultaDeVendedorNoImponeFiltroDePropietario() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(org.mockito.ArgumentMatchers.anyString())).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(true);
        when(resultado.getString("estado")).thenReturn("CANCELADO");

        new PedidoDAO(proveedor).cancelarPedido(91L, null, 84L, "CANCELADO");

        ArgumentCaptor<String> consultaSql = ArgumentCaptor.forClass(String.class);
        verify(conexion).prepareStatement(consultaSql.capture());
        assertFalse(consultaSql.getValue().contains("usuario_id"));
        verify(consulta).setLong(1, 91L);
        verify(consulta, never()).setLong(2, 84L);
        verify(conexion).commit();
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
