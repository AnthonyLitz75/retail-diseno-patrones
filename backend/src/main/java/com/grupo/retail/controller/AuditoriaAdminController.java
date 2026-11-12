package com.grupo.retail.controller;

import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.PaginaAuditoria;
import com.grupo.retail.model.RegistroAuditoria;
import com.grupo.retail.reportes.EscritorCsv;
import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import static com.grupo.retail.reportes.RespuestaCsv.adjunto;
import static com.grupo.retail.reportes.RespuestaCsv.fecha;

/**
 * Consulta de auditoría para el administrador (guía §2: "consultar auditoría").
 * /api/admin/** es solo ADMIN (SecurityConfig).
 */
@RestController
@RequestMapping("/api/admin/auditoria")
public class AuditoriaAdminController {

    private final AuditoriaService auditoriaService;
    private final SesionEmpleado sesionEmpleado;

    public AuditoriaAdminController(AuditoriaService auditoriaService, SesionEmpleado sesionEmpleado) {
        this.auditoriaService = auditoriaService;
        this.sesionEmpleado = sesionEmpleado;
    }

    /** Página de registros, del más reciente al más antiguo. */
    @GetMapping
    public PaginaAuditoria consultar(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String usuario,
            @RequestParam(required = false) Integer pagina,
            @RequestParam(required = false) Integer tamano) {
        return auditoriaService.consultar(desde, hasta, accion, usuario, pagina, tamano);
    }

    /** Acciones que se pueden filtrar, con su texto para mostrar. */
    @GetMapping("/acciones")
    public List<Map<String, String>> acciones() {
        return Arrays.stream(AccionAuditoria.values())
                .map(a -> Map.of("codigo", a.name(), "etiqueta", a.etiqueta()))
                .toList();
    }

    /** Los mismos filtros en CSV (hasta 5000 filas). La descarga también queda auditada. */
    @GetMapping(value = "/exportar.csv", produces = "text/csv")
    public ResponseEntity<byte[]> exportar(
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) String accion,
            @RequestParam(required = false) String usuario,
            HttpServletRequest peticion) {
        String csv = generarCsv(auditoriaService.exportar(desde, hasta, accion, usuario));
        auditoriaService.registrarAparte(EventoAuditoria.de(sesionEmpleado.obtenerId(peticion),
                AccionAuditoria.REPORTE_DESCARGADO, "REPORTE", null, "auditoria.csv"));
        return adjunto("auditoria.csv", csv);
    }

    static String generarCsv(List<RegistroAuditoria> registros) {
        EscritorCsv csv = new EscritorCsv("fecha", "usuario", "correo", "rol", "accion", "entidad", "entidad_id", "detalle");
        registros.forEach(r -> csv.fila(fecha(r.fecha()), r.usuarioNombre(), r.usuarioCorreo(), r.rol(),
                r.accionEtiqueta(), r.entidad(), r.entidadId(), r.detalle()));
        return csv.toString();
    }
}
