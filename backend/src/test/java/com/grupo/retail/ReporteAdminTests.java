package com.grupo.retail;

import com.grupo.retail.controller.ReporteAdminController;
import com.grupo.retail.dao.ReporteDAO;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.service.ReporteService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Reportes del administrador (RF05, RF06): controlador y validación de fechas del servicio. */
class ReporteAdminTests {

    @Test
    void resumenPasaFechasYDevuelveMetricas() {
        ReporteService service = mock(ReporteService.class);
        var esperado = new ResumenAdministrativo(3, new BigDecimal("120.00"), 4, 17,
                new BigDecimal("450.00"), Map.of("ENTRADA", 2L), Map.of("PENDIENTE", 3L), 1, List.of());
        when(service.obtenerResumen("2026-10-01", null)).thenReturn(esperado);
        assertEquals(esperado, new ReporteAdminController(service).resumen("2026-10-01", null));
    }

    @Test
    void csvDeVentasLlevaBomCabeceraYEscapa() {
        ReporteService service = mock(ReporteService.class);
        when(service.listarVentas(null, null)).thenReturn(List.of(new VentaReporte(12,
                OffsetDateTime.parse("2026-10-01T10:00:00-05:00"), "ENTREGADO",
                "Cliente \"Uno\"", new BigDecimal("54.90"))));

        var respuesta = new ReporteAdminController(service).exportarVentas(null, null);
        String csv = new String(respuesta.getBody(), StandardCharsets.UTF_8);

        assertEquals(200, respuesta.getStatusCode().value());
        assertTrue(respuesta.getHeaders().getContentType().toString().startsWith("text/csv"));
        assertTrue(respuesta.getHeaders().getFirst("Content-Disposition").contains("ventas.csv"));
        assertEquals(0xFEFF, csv.charAt(0), "BOM UTF-8 para Excel");
        assertTrue(csv.startsWith("pedido_id,fecha,cliente,estado,total\r\n", 1), csv);
        assertTrue(csv.contains("12,\"2026-10-01 10:00:00\",\"Cliente \"\"Uno\"\"\",\"ENTREGADO\",54.90\r\n"), csv);
    }

    @Test
    void csvNeutralizaCsvInjectionEnElNombreDelCliente() {
        ReporteService service = mock(ReporteService.class);
        OffsetDateTime fecha = OffsetDateTime.parse("2026-10-01T10:00:00-05:00");
        when(service.listarVentas(null, null)).thenReturn(List.of(
                new VentaReporte(1, fecha, "ENTREGADO", "=cmd|'/C calc'!A0", new BigDecimal("10.00")),
                new VentaReporte(2, fecha, "ENTREGADO", "@macro", new BigDecimal("40.00"))));

        String csv = new String(new ReporteAdminController(service).exportarVentas(null, null).getBody(),
                StandardCharsets.UTF_8);

        assertTrue(csv.contains("\"'=cmd|'/C calc'!A0\""), csv);
        assertTrue(csv.contains("\"'@macro\""), csv);
    }

    @Test
    void fechasInvalidasYRangoInvertidoSeRechazanAntesDelDao() {
        ReporteDAO dao = mock(ReporteDAO.class);
        ReporteService service = new ReporteService(dao);
        assertThrows(IllegalArgumentException.class, () -> service.obtenerResumen("ayer", null));
        assertThrows(IllegalArgumentException.class, () -> service.listarVentas("2026-10-02", "2026-10-01"));
        assertThrows(IllegalArgumentException.class,
                () -> service.listarMovimientos("2026-10-02T00:00:00Z", "2026-10-01T00:00:00Z"));
        verifyNoInteractions(dao);
    }

    @Test
    void unaFechaSolaCubreElDiaCompletoEnHoraDeLima() {
        ReporteDAO dao = mock(ReporteDAO.class);
        new ReporteService(dao).listarVentas("2026-10-01", "2026-10-01");

        ArgumentCaptor<OffsetDateTime> desde = ArgumentCaptor.forClass(OffsetDateTime.class);
        ArgumentCaptor<OffsetDateTime> hasta = ArgumentCaptor.forClass(OffsetDateTime.class);
        verify(dao).listarVentas(desde.capture(), hasta.capture());
        assertEquals(OffsetDateTime.parse("2026-10-01T00:00:00-05:00"), desde.getValue());
        assertEquals(OffsetDateTime.parse("2026-10-01T23:59:59.999999-05:00"), hasta.getValue(),
                "El último microsegundo del día: PostgreSQL no lo redondea al día siguiente");
        verify(dao, never()).listarMovimientos(any(), any());
    }
}
