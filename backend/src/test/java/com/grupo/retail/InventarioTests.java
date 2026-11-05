package com.grupo.retail;

import com.grupo.retail.controller.InventarioController;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dto.LineaEntradaInventario;
import com.grupo.retail.dto.SolicitudEntradaInventario;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.InventarioService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.service.SesionEmpleado;
import org.junit.jupiter.api.Test;
import jakarta.validation.Validation;
import org.mockito.InOrder;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InventarioTests {
    @Test
    void soloAlmacenOAdminPuedeRegistrarYResponsableSaleDeSesion() {
        InventarioService servicio = mock(InventarioService.class);
        InventarioController controller = new InventarioController(
                servicio, new SesionEmpleado(sesionActiva()));
        SolicitudEntradaInventario entrada = solicitudEntrada();
        MockHttpServletRequest almacen = solicitud(52L, "ALMACEN");

        var respuesta = controller.registrarEntradas(entrada, almacen);

        assertEquals(201, respuesta.getStatusCode().value());
        verify(servicio).registrarEntradas(entrada.productos(), entrada.motivo(), 52L);
        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> controller.registrarEntradas(entrada, new MockHttpServletRequest()))
                .getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.registrarEntradas(entrada, solicitud(18L, "VENDEDOR")))
                .getStatusCode().value());
    }

    @Test
    void solicitudRechazaMotivoVacioLoteVacioYLineasNoPositivas() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertEquals(2, validator.validate(
                    new SolicitudEntradaInventario(" ", List.of())).size());
            assertEquals(2, validator.validate(new SolicitudEntradaInventario(
                    "Recepción", List.of(new LineaEntradaInventario(0L, -2)))).size());
        }
    }
    @Test
    void servicioRechazaProductosDuplicadosAntesDePersistir() {
        InventarioDAO dao = mock(InventarioDAO.class);
        InventarioService servicio = new InventarioService(dao);
        List<LineaEntradaInventario> lineas = List.of(
                new LineaEntradaInventario(3L, 1),
                new LineaEntradaInventario(3L, 2));

        assertThrows(IllegalArgumentException.class,
                () -> servicio.registrarEntradas(lineas, "Recepción", 7L));
        verify(dao, never()).registrarEntradas(anyList(), anyString(), any());
    }

    @Test
    void servicioRechazaRangoDeFechasInvertido() {
        InventarioDAO dao = mock(InventarioDAO.class);
        InventarioService servicio = new InventarioService(dao);
        OffsetDateTime desde = OffsetDateTime.parse("2026-10-16T12:00:00-05:00");
        OffsetDateTime hasta = desde.minusDays(1);

        assertThrows(IllegalArgumentException.class,
                () -> servicio.listarMovimientos(3L, desde, hasta));
        verify(dao, never()).listarMovimientos(any(), any(), any());
    }

    @Test
    void servicioRechazaIdentificadorDeProductoNoPositivo() {
        InventarioDAO dao = mock(InventarioDAO.class);
        InventarioService servicio = new InventarioService(dao);

        assertThrows(IllegalArgumentException.class,
                () -> servicio.listarMovimientos(0L, null, null));
        verify(dao, never()).listarMovimientos(any(), any(), any());
    }

    @Test
    void loteBloqueaEnOrdenAscendenteYRegistraEntradasFirmadasConResponsable()
            throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement bloqueoMenor = mock(PreparedStatement.class);
        PreparedStatement bloqueoMayor = mock(PreparedStatement.class);
        ResultSet filaMenor = mock(ResultSet.class);
        ResultSet filaMayor = mock(ResultSet.class);
        PreparedStatement actualizacionMenor = mock(PreparedStatement.class);
        PreparedStatement actualizacionMayor = mock(PreparedStatement.class);
        PreparedStatement movimientoMenor = mock(PreparedStatement.class);
        PreparedStatement movimientoMayor = mock(PreparedStatement.class);
        ResultSet resultadoMovimientoMenor = mock(ResultSet.class);
        ResultSet resultadoMovimientoMayor = mock(ResultSet.class);
        OffsetDateTime fecha = OffsetDateTime.parse("2026-10-16T12:00:00-05:00");
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("FOR UPDATE")))
                .thenReturn(bloqueoMenor, bloqueoMayor);
        when(bloqueoMenor.executeQuery()).thenReturn(filaMenor);
        when(bloqueoMayor.executeQuery()).thenReturn(filaMayor);
        when(filaMenor.next()).thenReturn(true);
        when(filaMayor.next()).thenReturn(true);
        when(filaMenor.getInt("stock")).thenReturn(4);
        when(filaMayor.getInt("stock")).thenReturn(8);
        when(conexion.prepareStatement(startsWith("UPDATE producto")))
                .thenReturn(actualizacionMenor, actualizacionMayor);
        when(actualizacionMenor.executeUpdate()).thenReturn(1);
        when(actualizacionMayor.executeUpdate()).thenReturn(1);
        when(conexion.prepareStatement(contains("INSERT INTO movimiento_inventario")))
                .thenReturn(movimientoMenor, movimientoMayor);
        when(movimientoMenor.executeQuery()).thenReturn(resultadoMovimientoMenor);
        when(movimientoMayor.executeQuery()).thenReturn(resultadoMovimientoMayor);
        when(resultadoMovimientoMenor.next()).thenReturn(true);
        when(resultadoMovimientoMayor.next()).thenReturn(true);
        when(resultadoMovimientoMenor.getLong("id")).thenReturn(101L);
        when(resultadoMovimientoMayor.getLong("id")).thenReturn(102L);
        when(resultadoMovimientoMenor.getObject("fecha", OffsetDateTime.class)).thenReturn(fecha);
        when(resultadoMovimientoMayor.getObject("fecha", OffsetDateTime.class)).thenReturn(fecha);

        List<MovimientoInventario> movimientos = new InventarioDAO(proveedor).registrarEntradas(
                List.of(new LineaEntradaInventario(9L, 5), new LineaEntradaInventario(2L, 3)),
                "Recepción OC-123", 77L);

        assertEquals(List.of(2L, 9L), movimientos.stream().map(MovimientoInventario::productoId).toList());
        assertEquals(List.of(3, 5), movimientos.stream().map(MovimientoInventario::cantidadFirmada).toList());
        assertEquals(List.of(77L, 77L), movimientos.stream().map(MovimientoInventario::responsableId).toList());
        InOrder orden = inOrder(bloqueoMenor, bloqueoMayor);
        orden.verify(bloqueoMenor).setLong(1, 2L);
        orden.verify(bloqueoMenor).executeQuery();
        orden.verify(bloqueoMayor).setLong(1, 9L);
        orden.verify(bloqueoMayor).executeQuery();
        verify(conexion).commit();
    }

    @Test
    void productoFaltanteRevierteLoteAntesDeCambiarStock() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement bloqueoPrimero = mock(PreparedStatement.class);
        PreparedStatement bloqueoSegundo = mock(PreparedStatement.class);
        ResultSet filaPrimera = mock(ResultSet.class);
        ResultSet filaSegunda = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("FOR UPDATE")))
                .thenReturn(bloqueoPrimero, bloqueoSegundo);
        when(bloqueoPrimero.executeQuery()).thenReturn(filaPrimera);
        when(bloqueoSegundo.executeQuery()).thenReturn(filaSegunda);
        when(filaPrimera.next()).thenReturn(true);
        when(filaSegunda.next()).thenReturn(false);

        assertThrows(NoSuchElementException.class, () -> new InventarioDAO(proveedor)
                .registrarEntradas(List.of(new LineaEntradaInventario(8L, 2),
                        new LineaEntradaInventario(2L, 1)), "Recepción", 77L));

        verify(conexion).rollback();
        verify(conexion, never()).prepareStatement(startsWith("UPDATE producto"));
        verify(conexion, never()).prepareStatement(contains("INSERT INTO movimiento_inventario"));
    }

    @Test
    void kardexConstruyeFiltrosOpcionalesConParametrosYOrdenEstable() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        OffsetDateTime desde = OffsetDateTime.parse("2026-10-01T00:00:00-05:00");
        OffsetDateTime hasta = OffsetDateTime.parse("2026-10-16T23:59:59-05:00");
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(anyString())).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        new InventarioDAO(proveedor).listarMovimientos(6L, desde, hasta);

        verify(conexion).prepareStatement(contains("producto_id = ?"));
        verify(consulta).setLong(1, 6L);
        verify(consulta).setObject(2, desde);
        verify(consulta).setObject(3, hasta);
        verify(conexion).prepareStatement(contains("ORDER BY fecha, id"));
    }

    @Test
    void kardexSinFiltrosNoAgregaPredicados() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(anyString())).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        new InventarioDAO(proveedor).listarMovimientos(null, null, null);

        verify(conexion).prepareStatement(contains("WHERE 1 = 1"));
        verify(consulta, never()).setLong(any(Integer.class), any(Long.class));
        verify(consulta, never()).setObject(any(Integer.class), any());
    }

    @Test
    void vendedorPuedeConsultarKardexPeroClienteNo() {
        InventarioService servicio = mock(InventarioService.class);
        InventarioController controller = new InventarioController(
                servicio, new SesionEmpleado(sesionActiva()));
        MockHttpServletRequest vendedor = solicitud(22L, "VENDEDOR");

        controller.listarMovimientos(4L, null, null, vendedor);
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.listarMovimientos(null, null, null,
                        solicitud(40L, "CLIENTE"))).getStatusCode().value());
        verify(servicio).listarMovimientos(4L, null, null);
    }

    private SolicitudEntradaInventario solicitudEntrada() {
        return new SolicitudEntradaInventario("Recepción OC-123",
                List.of(new LineaEntradaInventario(4L, 12)));
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
