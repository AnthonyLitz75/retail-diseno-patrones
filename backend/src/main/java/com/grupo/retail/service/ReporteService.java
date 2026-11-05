package com.grupo.retail.service;

import com.grupo.retail.dao.ReporteDAO;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Service
public class ReporteService {
    private final ReporteDAO reporteDAO;

    public ReporteService(ReporteDAO reporteDAO) {
        this.reporteDAO = reporteDAO;
    }

    public ResumenAdministrativo obtenerResumen(String desde, String hasta) {
        var fechas = validarFechas(desde, hasta);
        return reporteDAO.obtenerResumen(fechas.desde(), fechas.hasta());
    }

    public List<VentaReporte> listarVentas(String desde, String hasta) {
        var fechas = validarFechas(desde, hasta);
        return reporteDAO.listarVentas(fechas.desde(), fechas.hasta());
    }

    private Fechas validarFechas(String desdeTexto, String hastaTexto) {
        OffsetDateTime desde = parsear("desde", desdeTexto);
        OffsetDateTime hasta = parsear("hasta", hastaTexto);
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha desde no puede ser posterior a hasta");
        }
        return new Fechas(desde, hasta);
    }

    private OffsetDateTime parsear(String campo, String texto) {
        if (texto == null || texto.isBlank()) return null;
        try {
            return OffsetDateTime.parse(texto);
        } catch (DateTimeParseException error) {
            throw new IllegalArgumentException("El parámetro " + campo + " debe ser ISO-8601 con zona", error);
        }
    }

    private record Fechas(OffsetDateTime desde, OffsetDateTime hasta) {}
}
