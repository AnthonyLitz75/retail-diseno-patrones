package com.grupo.retail;

import com.grupo.retail.controller.ConsultaProductoController;
import com.grupo.retail.dao.ConsultaProductoDAO;
import com.grupo.retail.dto.SolicitudPreguntaProducto;
import com.grupo.retail.dto.SolicitudRespuestaPregunta;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.ConsultaProductoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.SesionEmpleado;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConsultaProductoTests {
    private final ConsultaProductoDAO dao = mock(ConsultaProductoDAO.class);
    private final ConsultaProductoService service = new ConsultaProductoService(dao);
    private final SesionAutenticada autenticada = sesionActiva();
    private final ConsultaProductoController controller = new ConsultaProductoController(
            service, new SesionCliente(autenticada), new SesionEmpleado(autenticada));

    @Test
    void clienteCreaPreguntaConSuIdentidadDeSesion() {
        controller.crearPregunta(7L, new SolicitudPreguntaProducto("¿Es compatible?"),
                solicitud(42L, "CLIENTE"));

        verify(dao).crearPregunta(7L, 42L, "¿Es compatible?");
    }

    @Test
    void clienteListaSoloPreguntasAsociadasASuSesion() {
        controller.listarMisPreguntas(solicitud(42L, "CLIENTE"));

        verify(dao).listarPorCliente(42L);
    }

    @Test
    void vendedorListaPendientesYRespondeConSuIdentidad() {
        when(dao.responder(15L, 84L, "Sí, es compatible.")).thenReturn(true);
        controller.listarPendientes(solicitud(84L, "VENDEDOR"));
        controller.responderPregunta(15L, new SolicitudRespuestaPregunta("Sí, es compatible."),
                solicitud(84L, "VENDEDOR"));

        verify(dao).listarPendientes();
        verify(dao).responder(15L, 84L, "Sí, es compatible.");
    }

    @Test
    void sesionClienteNoPuedeUsarRutasDeVendedor() {
        MockHttpServletRequest peticion = solicitud(42L, "CLIENTE");

        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.listarPendientes(peticion)).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.responderPregunta(15L,
                        new SolicitudRespuestaPregunta("Respuesta"), peticion))
                .getStatusCode().value());
        verify(dao, never()).listarPendientes();
        verify(dao, never()).responder(15L, 42L, "Respuesta");
    }

    @Test
    void rutasPrivadasRechazanSesionAusente() {
        MockHttpServletRequest peticion = new MockHttpServletRequest();

        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> controller.listarMisPreguntas(peticion)).getStatusCode().value());
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> controller.listarPendientes(peticion)).getStatusCode().value());
    }

    @Test
    void vendedorNoPuedeResponderDosVecesYPreguntaInexistenteDa404() {
        when(dao.responder(15L, 84L, "Respuesta")).thenReturn(false);
        when(dao.existe(15L)).thenReturn(true, false);

        assertEquals(409, assertThrows(ResponseStatusException.class,
                () -> service.responder(15L, 84L, "Respuesta")).getStatusCode().value());
        assertThrows(NoSuchElementException.class,
                () -> service.responder(15L, 84L, "Respuesta"));
    }

    @Test
    void consultaDeClienteAplicaFiltroDePropiedadEnSql() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("WHERE c.cliente_id = ?"))).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        new ConsultaProductoDAO(proveedor).listarPorCliente(42L);

        verify(consulta).setLong(1, 42L);
    }

    @Test
    void respuestaSqlSoloActualizaPreguntaPendienteYRegistraVendedor() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(anyString())).thenReturn(consulta);
        when(consulta.executeUpdate()).thenReturn(1);

        new ConsultaProductoDAO(proveedor).responder(15L, 84L, "Respuesta");

        verify(consulta).setString(1, "Respuesta");
        verify(consulta).setLong(2, 84L);
        verify(consulta).setLong(3, 15L);
        verify(conexion).prepareStatement(contains("respuesta IS NULL"));
    }

    private MockHttpServletRequest solicitud(Long usuarioId, String rol) {
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
