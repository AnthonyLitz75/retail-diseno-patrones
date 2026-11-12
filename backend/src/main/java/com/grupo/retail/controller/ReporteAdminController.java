package com.grupo.retail.controller;

import static com.grupo.retail.reportes.RespuestaCsv.adjunto;
import static com.grupo.retail.reportes.RespuestaCsv.fecha;
import jakarta.servlet.http.HttpServletRequest;
import com.grupo.retail.service.SesionEmpleado;
import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.InventarioReporte;
import com.grupo.retail.model.MovimientoReporte;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.reportes.EscritorCsv;
import com.grupo.retail.service.ReporteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * RF05 y RF06 (spec 007): panel de supervisión y exportación CSV. /api/admin/** es solo
 * ADMIN (SecurityConfig). Los CSV van en UTF-8 con BOM para que Excel muestre bien las
 * tildes; las reglas de escape están en {@link EscritorCsv}.
 */
@RestController
@RequestMapping("/api/admin/reportes")
public class ReporteAdminController {


    private final ReporteService reporteService;
    private final AuditoriaService auditoriaService;
    private final SesionEmpleado sesionEmpleado;

    public ReporteAdminController(ReporteService reporteService, AuditoriaService auditoriaService,
            SesionEmpleado sesionEmpleado) {
        this.reporteService = reporteService;
        this.auditoriaService = auditoriaService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @GetMapping("/resumen")
    public ResumenAdministrativo resumen(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {
        return reporteService.obtenerResumen(desde, hasta);
    }

    @GetMapping(value = "/ventas.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarVentas(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            HttpServletRequest peticion) {
        String csv = generarCsvVentas(reporteService.listarVentas(desde, hasta));
        registrarDescarga(peticion, "ventas.csv", desde, hasta);
        return adjunto("ventas.csv", csv);
    }

    @GetMapping(value = "/movimientos.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarMovimientos(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            HttpServletRequest peticion) {
        String csv = generarCsvMovimientos(reporteService.listarMovimientos(desde, hasta));
        registrarDescarga(peticion, "movimientos.csv", desde, hasta);
        return adjunto("movimientos.csv", csv);
    }

    @GetMapping(value = "/inventario.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarInventario(HttpServletRequest peticion) {
        String csv = generarCsvInventario(reporteService.listarInventario());
        registrarDescarga(peticion, "inventario.csv", null, null);
        return adjunto("inventario.csv", csv);
    }

    /** Las descargas de datos de la tienda quedan en la auditoría (quién, qué y qué periodo). */
    private void registrarDescarga(HttpServletRequest peticion, String archivo, String desde, String hasta) {
        String periodo = desde == null && hasta == null ? "sin filtro de fechas"
                : "del " + (desde == null ? "inicio" : desde) + " al " + (hasta == null ? "hoy" : hasta);
        auditoriaService.registrarAparte(EventoAuditoria.de(sesionEmpleado.obtenerId(peticion),
                AccionAuditoria.REPORTE_DESCARGADO, "REPORTE", null, archivo + " (" + periodo + ")"));
    }

    static String generarCsvVentas(List<VentaReporte> ventas) {
        EscritorCsv csv = new EscritorCsv("pedido_id", "fecha", "cliente", "estado", "total");
        ventas.forEach(v -> csv.fila(v.pedidoId(), fecha(v.fecha()), v.cliente(), v.estado(), v.total()));
        return csv.toString();
    }

    static String generarCsvMovimientos(List<MovimientoReporte> movimientos) {
        EscritorCsv csv = new EscritorCsv("fecha", "sku", "tipo", "cantidad", "motivo", "responsable");
        movimientos.forEach(m -> csv.fila(fecha(m.fecha()), m.sku(), m.tipo(), m.cantidad(), m.motivo(), m.responsable()));
        return csv.toString();
    }

    static String generarCsvInventario(List<InventarioReporte> productos) {
        EscritorCsv csv = new EscritorCsv("sku", "nombre", "categoria", "stock", "activo");
        productos.forEach(p -> csv.fila(p.sku(), p.nombre(), p.categoria(), p.stock(), p.activo()));
        return csv.toString();
    }

}
