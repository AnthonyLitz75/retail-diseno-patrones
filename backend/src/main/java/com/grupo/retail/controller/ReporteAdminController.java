package com.grupo.retail.controller;

import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.service.ReporteService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin/reportes")
public class ReporteAdminController {
    private final ReporteService reporteService;

    public ReporteAdminController(ReporteService reporteService, SesionEmpleado sesionEmpleado) {
        this.reporteService = reporteService;
    }

    @GetMapping("/resumen")
    public ResumenAdministrativo resumen(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            HttpServletRequest request) {
        return reporteService.obtenerResumen(desde, hasta);
    }

    @GetMapping(value = "/ventas.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportarVentas(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            HttpServletRequest request) {
        String csv = generarCsv(reporteService.listarVentas(desde, hasta));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ventas.csv")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    static String generarCsv(List<VentaReporte> ventas) {
        StringBuilder csv = new StringBuilder("pedido_id,fecha,estado,cliente,total\r\n");
        for (VentaReporte venta : ventas) {
            csv.append(venta.pedidoId()).append(',')
                    .append(celda(venta.fecha().toString())).append(',')
                    .append(celda(venta.estado())).append(',')
                    .append(celda(venta.cliente())).append(',')
                    .append(venta.total().toPlainString()).append("\r\n");
        }
        return csv.toString();
    }

    private static String celda(String valor) {
        if (valor == null) {
            return "\"\"";
        }
        String texto = valor.replace("\"", "\"\"");
        if (!texto.isEmpty()) {
            char primerCaracter = texto.charAt(0);
            if (primerCaracter == '=' || primerCaracter == '+' || primerCaracter == '-'
                    || primerCaracter == '@' || primerCaracter == '\t' || primerCaracter == '\r') {
                texto = "'" + texto;
            }
        }
        return "\"" + texto + "\"";
    }
}
