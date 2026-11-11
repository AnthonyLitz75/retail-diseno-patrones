package com.grupo.retail;

import com.grupo.retail.controller.PedidoController;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.SolicitudDespachoPedido;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
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
    void despachoValidoBloqueaElPedidoYRegistraTransportistaYCodigoEnLaMismaTransaccion() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 15L, null)).thenReturn(Optional.of(new PedidoBloqueado("EN_PREPARACION", 42L)));

        new PedidoService(dao, ejecutorSobre(conexion), mock(PublicadorEventosPedido.class)).despacharPedido(15L, 8L, "Olva", "OLV-2048");

        verify(dao).registrarTransicion(conexion, 15L, "DESPACHADO", 8L,
                "Pedido despachado por almacén", new EnvioPedido("Olva", "OLV-2048", null));
        verify(conexion).commit();
    }

    @Test
    void despachoExigeDatosYQueStateAutoriceLaTransicion() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        PedidoService service = new PedidoService(dao, ejecutorSobre(conexion), mock(PublicadorEventosPedido.class));
        assertThrows(IllegalArgumentException.class,
                () -> service.despacharPedido(15L, 8L, "  ", "OLV-2048"));
        verifyNoInteractions(conexion);

        // State: un pedido PENDIENTE debe prepararse antes del despacho (409).
        when(dao.bloquearEstadoPedido(conexion, 15L, null)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        assertThrows(IllegalStateException.class,
                () -> service.despacharPedido(15L, 8L, "Olva", "OLV-2048"));
        verify(dao, never()).registrarTransicion(any(), anyLong(), anyString(), anyLong(), anyString(), any());
        verify(conexion).rollback();
    }

    @Test
    void pedidoInexistenteResponde404SinRegistrarNada() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 15L, null)).thenReturn(Optional.empty());

        assertThrows(java.util.NoSuchElementException.class,
                () -> new PedidoService(dao, ejecutorSobre(conexion), mock(PublicadorEventosPedido.class)).prepararPedido(15L, 8L));
        verify(dao, never()).registrarTransicion(any(), anyLong(), anyString(), anyLong(), anyString(), any());
    }

    @Test
    void codigoDuplicadoSePropagaYRevierteLaTransaccion() throws Exception {
        PedidoDAO dao = mock(PedidoDAO.class);
        Connection conexion = mock(Connection.class);
        when(dao.bloquearEstadoPedido(conexion, 15L, null)).thenReturn(Optional.of(new PedidoBloqueado("EN_PREPARACION", 42L)));
        doThrow(new CodigoSeguimientoDuplicadoException(new java.sql.SQLException()))
                .when(dao).registrarTransicion(any(), anyLong(), anyString(), anyLong(), anyString(), any());

        // GlobalExceptionHandler responde 409 a esta excepción.
        assertThrows(CodigoSeguimientoDuplicadoException.class,
                () -> new PedidoService(dao, ejecutorSobre(conexion), mock(PublicadorEventosPedido.class)).despacharPedido(15L, 8L, "Olva", "OLV-2048"));
        verify(conexion).rollback();
        verify(conexion, never()).commit();
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
    void insercionDeEnvioOcurreEnLaConexionRecibidaSinCerrarlaNiConfirmarla() throws Exception {
        Connection conexion = mock(Connection.class);
        PreparedStatement actualizar = mock(PreparedStatement.class);
        PreparedStatement envio = mock(PreparedStatement.class);
        PreparedStatement historial = mock(PreparedStatement.class);
        when(conexion.prepareStatement(contains("UPDATE pedido"))).thenReturn(actualizar);
        when(conexion.prepareStatement(contains("INSERT INTO envio"))).thenReturn(envio);
        when(conexion.prepareStatement(contains("INSERT INTO pedido_historial_estado")))
                .thenReturn(historial);
        when(actualizar.executeUpdate()).thenReturn(1);
        when(envio.executeUpdate()).thenReturn(1);

        new PedidoDAO(mock(ProveedorConexiones.class)).registrarTransicion(conexion, 15L,
                "DESPACHADO", 8L, "Despachado", new EnvioPedido("Olva", "OLV-2048", null));

        verify(envio).setLong(1, 15L);
        verify(envio).setString(2, "Olva");
        verify(envio).setString(3, "OLV-2048");
        verify(envio).executeUpdate();
        verify(historial).executeUpdate();
        // La transacción es del servicio: el DAO no confirma, no revierte ni cierra.
        verify(conexion, never()).commit();
        verify(conexion, never()).rollback();
        verify(conexion, never()).close();
    }

    @Test
    void codigoDuplicadoSeTraduceYNoGuardaHistorial() throws Exception {
        Connection conexion = mock(Connection.class);
        PreparedStatement actualizar = mock(PreparedStatement.class);
        PreparedStatement envio = mock(PreparedStatement.class);
        when(conexion.prepareStatement(contains("UPDATE pedido"))).thenReturn(actualizar);
        when(conexion.prepareStatement(contains("INSERT INTO envio"))).thenReturn(envio);
        when(actualizar.executeUpdate()).thenReturn(1);
        when(envio.executeUpdate()).thenThrow(new java.sql.SQLException("duplicate", "23505"));

        assertThrows(CodigoSeguimientoDuplicadoException.class,
                () -> new PedidoDAO(mock(ProveedorConexiones.class)).registrarTransicion(conexion, 15L,
                        "DESPACHADO", 8L, "Despachado", new EnvioPedido("Olva", "OLV-2048", null)));
        verify(conexion, never()).prepareStatement(contains("INSERT INTO pedido_historial_estado"));
    }

    private static EjecutorTransaccion ejecutorSobre(Connection conexion) throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        return new EjecutorTransaccion(proveedor);
    }

    private MockHttpServletRequest solicitud(Long id, String rol) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        HttpSession session = request.getSession(true);
        session.setAttribute("usuarioId", id);
        session.setAttribute("usuarioRol", rol);
        return request;
    }
}
