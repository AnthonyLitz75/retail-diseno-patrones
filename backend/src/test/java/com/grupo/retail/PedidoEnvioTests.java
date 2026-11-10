package com.grupo.retail;

import com.grupo.retail.controller.PedidoController;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.SolicitudDespachoPedido;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.patterns.factory.FabricaNotificador;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class PedidoEnvioTests {
    @Test
    void datosDeDespachoRechazanCamposVaciosYLargos() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        assertEquals(2, validator.validate(new SolicitudDespachoPedido(" ", " ")).size());
        assertEquals(2, validator.validate(new SolicitudDespachoPedido(
                "T".repeat(121), "C".repeat(121))).size());
    }

    @Test
    void despachoValidoPersisteTransportistaYCodigoEnTransicion() {
        PedidoDAO dao = mock(PedidoDAO.class);
        when(dao.buscarEstado(15L)).thenReturn(Optional.of("EN_PREPARACION"));
        when(dao.cambiarEstado(eq(15L), eq("EN_PREPARACION"), eq("DESPACHADO"), eq(8L),
                anyString(), any(EnvioPedido.class))).thenReturn(true);

        new PedidoService(dao).despacharPedido(15L, 8L, "Olva", "OLV-2048");

        verify(dao).cambiarEstado(eq(15L), eq("EN_PREPARACION"), eq("DESPACHADO"), eq(8L),
                eq("Pedido despachado por almacén"),
                eq(new EnvioPedido("Olva", "OLV-2048", null)));
    }

    @Test
    void despachoExigeDatosYEstadoEnPreparacion() {
        PedidoDAO dao = mock(PedidoDAO.class);
        PedidoService service = new PedidoService(dao);
        assertThrows(IllegalArgumentException.class,
                () -> service.despacharPedido(15L, 8L, "  ", "OLV-2048"));
        when(dao.buscarEstado(15L)).thenReturn(Optional.of("PENDIENTE"));
        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.despacharPedido(15L, 8L, "Olva", "OLV-2048"))
                .getStatusCode().value());
        verify(dao, never()).cambiarEstado(anyLong(), anyString(), anyString(), anyLong(),
                anyString(), any());
    }

    @Test
    void codigoDuplicadoSeExponeComoConflicto() {
        PedidoDAO dao = mock(PedidoDAO.class);
        when(dao.buscarEstado(15L)).thenReturn(Optional.of("EN_PREPARACION"));
        when(dao.cambiarEstado(anyLong(), anyString(), anyString(), anyLong(), anyString(), any()))
                .thenThrow(new CodigoSeguimientoDuplicadoException(new java.sql.SQLException()));

        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> new PedidoService(dao).despacharPedido(15L, 8L, "Olva", "OLV-2048"))
                .getStatusCode().value());
    }

    @Test
    void soloAlmacenOAdminPuedenDespacharYElResponsableSaleDeLaSesion() {
        PedidoService service = mock(PedidoService.class);
        UsuarioDAO usuarios = mock(UsuarioDAO.class);
        when(usuarios.sesionSigueVigente(8L, "ALMACEN")).thenReturn(true);
        SesionAutenticada sesion = new SesionAutenticada(usuarios);
        PedidoController controller = new PedidoController(mock(CheckoutFacade.class),
                new SesionCliente(sesion), new SesionEmpleado(sesion), sesion, service);

        controller.despacharPedido(15L, new SolicitudDespachoPedido("Olva", "OLV-2048"),
                solicitud(8L, "ALMACEN"));
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> controller.despacharPedido(15L,
                        new SolicitudDespachoPedido("Olva", "OLV-2048"), new MockHttpServletRequest()))
                .getStatusCode().value());
        verify(service).despacharPedido(15L, 8L, "Olva", "OLV-2048");
        verifyNoMoreInteractions(service);
    }

    @Test
    void insercionDeEnvioOcurreEnLaTransaccionDelEstado() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        FabricaNotificador fabrica = mock(FabricaNotificador.class);
        var notificador = mock(com.grupo.retail.patterns.factory.Notificador.class);
        PreparedStatement actualizar = mock(PreparedStatement.class);
        PreparedStatement envio = mock(PreparedStatement.class);
        PreparedStatement cliente = mock(PreparedStatement.class);
        PreparedStatement historial = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(fabrica.crearNotificador()).thenReturn(notificador);
        when(conexion.prepareStatement(contains("UPDATE pedido"))).thenReturn(actualizar);
        when(conexion.prepareStatement(contains("INSERT INTO envio"))).thenReturn(envio);
        when(conexion.prepareStatement(contains("SELECT usuario_id"))).thenReturn(cliente);
        when(conexion.prepareStatement(contains("INSERT INTO pedido_historial_estado")))
                .thenReturn(historial);
        when(actualizar.executeUpdate()).thenReturn(1);
        when(envio.executeUpdate()).thenReturn(1);
        when(cliente.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(true);
        when(resultado.getLong("usuario_id")).thenReturn(7L);

        assertTrue(new PedidoDAO(proveedor, fabrica).cambiarEstado(15L, "EN_PREPARACION",
                "DESPACHADO", 8L, "Despachado", new EnvioPedido("Olva", "OLV-2048", null)));

        verify(conexion).prepareStatement(contains("INSERT INTO envio"));
        verify(envio).setLong(1, 15L);
        verify(envio).setString(2, "Olva");
        verify(envio).setString(3, "OLV-2048");
        verify(envio).executeUpdate();
        verify(conexion).commit();
        verify(conexion, never()).rollback();
    }

    @Test
    void codigoDuplicadoRevierteLaTransicionYNoGuardaHistorial() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement actualizar = mock(PreparedStatement.class);
        PreparedStatement envio = mock(PreparedStatement.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("UPDATE pedido"))).thenReturn(actualizar);
        when(conexion.prepareStatement(contains("INSERT INTO envio"))).thenReturn(envio);
        when(actualizar.executeUpdate()).thenReturn(1);
        when(envio.executeUpdate()).thenThrow(new java.sql.SQLException("duplicate", "23505"));

        assertThrows(CodigoSeguimientoDuplicadoException.class,
                () -> new PedidoDAO(proveedor).cambiarEstado(15L, "EN_PREPARACION",
                        "DESPACHADO", 8L, "Despachado", new EnvioPedido("Olva", "OLV-2048", null)));
        verify(conexion).rollback();
        verify(conexion, never()).commit();
        verify(conexion, never()).prepareStatement(contains("INSERT INTO pedido_historial_estado"));
    }

    private MockHttpServletRequest solicitud(Long id, String rol) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        HttpSession session = request.getSession(true);
        session.setAttribute("usuarioId", id);
        session.setAttribute("usuarioRol", rol);
        return request;
    }
}
