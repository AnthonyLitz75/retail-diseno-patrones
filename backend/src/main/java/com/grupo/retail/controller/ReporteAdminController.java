package com.grupo.retail.controller;

import com.grupo.retail.model.InventarioReporte;
import com.grupo.retail.model.MovimientoReporte;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.reportes.EscritorCsv;
import com.grupo.retail.service.ReporteService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * RF05 y RF06 (spec 007): panel de supervisión y exportación CSV. /api/admin/** es solo
 * ADMIN (SecurityConfig). Los CSV van en UTF-8 con BOM para que Excel muestre bien las
 * tildes; las reglas de escape están en {@link EscritorCsv}.
 */
@RestController
@RequestMapping("/api/admin/reportes")
public class ReporteAdminController {

    /** Marca de orden de bytes: Excel la usa para detectar UTF-8. */
    private static final String BOM = String.valueOf((char) 0xFEFF);
    private static final MediaType CSV_UTF8 = new MediaType("text", "csv", StandardCharsets.UTF_8);
    /** Fechas legibles en Excel y en la hora de la tienda (la base las devuelve en UTC). */
    private static final DateTimeFormatter FECHA_CSV =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("America/Lima"));

    private final ReporteService reporteService;

    public ReporteAdminController(ReporteService reporteService) {
        this.reporteService = reporteService;
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
            @RequestParam(required = false) String hasta) {
        return adjunto("ventas.csv", generarCsvVentas(reporteService.listarVentas(desde, hasta)));
    }

    @GetMapping(value = "/movimientos.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarMovimientos(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta) {
        return adjunto("movimientos.csv", generarCsvMovimientos(reporteService.listarMovimientos(desde, hasta)));
    }

    @GetMapping(value = "/inventario.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarInventario() {
        return adjunto("inventario.csv", generarCsvInventario(reporteService.listarInventario()));
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

    private static String fecha(OffsetDateTime valor) {
        return valor == null ? null : FECHA_CSV.format(valor);
    }

    private static ResponseEntity<byte[]> adjunto(String nombre, String csv) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + nombre)
                .contentType(CSV_UTF8)
                .body((BOM + csv).getBytes(StandardCharsets.UTF_8));
    }
}
