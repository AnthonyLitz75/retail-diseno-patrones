package com.grupo.retail;

import com.grupo.retail.controller.ReporteAdminController;
import com.grupo.retail.dao.ReporteDAO;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.service.ReporteService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReporteAdminTests {

    @Test
    void resumenPasaFechasYDevuelveMetricas() {
        ReporteService service = mock(ReporteService.class);
        var esperado = new ResumenAdministrativo(3, new BigDecimal("120.00"), 4, 17,
                new BigDecimal("450.00"), Map.of("ENTRADA", 2L));
        when(service.obtenerResumen("2026-10-01T00:00:00-05:00", null)).thenReturn(esperado);
        assertEquals(esperado, controller(service).resumen(
                "2026-10-01T00:00:00-05:00", null, solicitud("ADMIN")));
    }

    @Test
    void csvIncluyeCabeceraYEscapaComillas() {
        ReporteService service = mock(ReporteService.class);
        when(service.listarVentas(null, null)).thenReturn(List.of(new VentaReporte(12,
                OffsetDateTime.parse("2026-10-01T10:00:00-05:00"), "ENTREGADO",
                "Cliente \"Uno\"", new BigDecimal("54.90"))));
        var respuesta = controller(service).exportarVentas(null, null, solicitud("ADMIN"));
        String csv = new String(respuesta.getBody(), java.nio.charset.StandardCharsets.UTF_8);
        assertEquals(200, respuesta.getStatusCode().value());
        assertTrue(respuesta.getHeaders().getContentType().toString().startsWith("text/csv"));
        assertTrue(respuesta.getHeaders().getFirst("Content-Disposition").contains("ventas.csv"));
        assertTrue(csv.contains("\"Cliente \"\"Uno\"\"\""));
        assertTrue(csv.startsWith("pedido_id,fecha,estado,cliente,total\r\n"));
    }

    @Test
    void csvNeutralizaCsvInjectionEnCeldasConPrefijosDeFormula() {
        ReporteService service = mock(ReporteService.class);
        when(service.listarVentas(null, null)).thenReturn(List.of(
                new VentaReporte(1, OffsetDateTime.parse("2026-10-01T10:00:00-05:00"), "ENTREGADO", "=cmd|'/C calc'!A0", new BigDecimal("10.00")),
                new VentaReporte(2, OffsetDateTime.parse("2026-10-01T10:00:00-05:00"), "ENTREGADO", "+12345", new BigDecimal("20.00")),
                new VentaReporte(3, OffsetDateTime.parse("2026-10-01T10:00:00-05:00"), "ENTREGADO", "-SUM(A1:A10)", new BigDecimal("30.00")),
                new VentaReporte(4, OffsetDateTime.parse("2026-10-01T10:00:00-05:00"), "ENTREGADO", "@macro", new BigDecimal("40.00"))
        ));
        var respuesta = controller(service).exportarVentas(null, null, solicitud("ADMIN"));
        String csv = new String(respuesta.getBody(), java.nio.charset.StandardCharsets.UTF_8);

        assertTrue(csv.contains("\"'=cmd|'/C calc'!A0\""), "Debe anteponer apóstrofe a fórmulas que inician con '='");
        assertTrue(csv.contains("\"'+12345\""), "Debe anteponer apóstrofe a valores que inician con '+'");
        assertTrue(csv.contains("\"'-SUM(A1:A10)\""), "Debe anteponer apóstrofe a valores que inician con '-'");
        assertTrue(csv.contains("\"'@macro\""), "Debe anteponer apóstrofe a valores que inician con '@'");
    }

    @Test
    void fechasInvalidasYRangoInvertidoSeRechazanAntesDelDao() {
        ReporteDAO dao = mock(ReporteDAO.class);
        ReporteService service = new ReporteService(dao);
        assertThrows(IllegalArgumentException.class,
                () -> service.obtenerResumen("ayer", null));
        assertThrows(IllegalArgumentException.class,
                () -> service.listarVentas("2026-10-02T00:00:00Z", "2026-10-01T00:00:00Z"));
        verifyNoInteractions(dao);
    }

    private ReporteAdminController controller(ReporteService service) {
        var usuarioDAO = mock(com.grupo.retail.dao.UsuarioDAO.class);
        var guard = new SesionEmpleado(new SesionAutenticada(usuarioDAO));
        when(usuarioDAO.sesionSigueVigente(8L, "ADMIN")).thenReturn(true);
        when(usuarioDAO.sesionSigueVigente(8L, "VENDEDOR")).thenReturn(true);
        return new ReporteAdminController(service, guard);
    }

    private MockHttpServletRequest solicitud(String rol) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        HttpSession session = request.getSession(true);
        session.setAttribute("usuarioId", 8L);
        session.setAttribute("usuarioRol", rol);
        return request;
    }
}
