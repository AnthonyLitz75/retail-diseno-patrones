package com.grupo.retail.service;

import com.grupo.retail.dao.ReporteDAO;
import com.grupo.retail.model.InventarioReporte;
import com.grupo.retail.model.MovimientoReporte;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.List;

/**
 * Reportes del administrador (RF05, RF06; spec 007). Los filtros aceptan una fecha
 * {@code yyyy-MM-dd} (contrato 007: el día completo en hora de Lima, rango inclusivo) o una
 * fecha ISO-8601 con zona, que es lo que enviaba el panel antes del spec 007.
 */
@Service
public class ReporteService {

    private static final ZoneId ZONA_TIENDA = ZoneId.of("America/Lima");

    private final ReporteDAO reporteDAO;

    public ReporteService(ReporteDAO reporteDAO) {
        this.reporteDAO = reporteDAO;
    }

    public ResumenAdministrativo obtenerResumen(String desde, String hasta) {
        Rango rango = validarRango(desde, hasta);
        return reporteDAO.obtenerResumen(rango.desde(), rango.hasta());
    }

    public List<VentaReporte> listarVentas(String desde, String hasta) {
        Rango rango = validarRango(desde, hasta);
        return reporteDAO.listarVentas(rango.desde(), rango.hasta());
    }

    public List<MovimientoReporte> listarMovimientos(String desde, String hasta) {
        Rango rango = validarRango(desde, hasta);
        return reporteDAO.listarMovimientos(rango.desde(), rango.hasta());
    }

    /** El inventario es una foto del momento: no lleva rango de fechas. */
    public List<InventarioReporte> listarInventario() {
        return reporteDAO.listarInventario();
    }

    private static Rango validarRango(String desdeTexto, String hastaTexto) {
        OffsetDateTime desde = parsear("desde", desdeTexto, false);
        OffsetDateTime hasta = parsear("hasta", hastaTexto, true);
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha desde no puede ser posterior a hasta");
        }
        return new Rango(desde, hasta);
    }

    /**
     * Una fecha sola cubre el día completo: {@code desde} es su primer instante y
     * {@code hasta} el último microsegundo (la precisión de PostgreSQL), así el rango es
     * inclusivo sin redondear al día siguiente.
     */
    private static OffsetDateTime parsear(String campo, String texto, boolean finDelDia) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        String valor = texto.strip();
        try {
            if (valor.length() == 10) {
                LocalDate dia = LocalDate.parse(valor);
                return finDelDia
                        ? dia.plusDays(1).atStartOfDay(ZONA_TIENDA).toOffsetDateTime().minusNanos(1_000)
                        : dia.atStartOfDay(ZONA_TIENDA).toOffsetDateTime();
            }
            return OffsetDateTime.parse(valor);
        } catch (DateTimeParseException error) {
            throw new IllegalArgumentException(
                    "El parámetro " + campo + " debe ser una fecha yyyy-MM-dd o ISO-8601 con zona", error);
        }
    }

    private record Rango(OffsetDateTime desde, OffsetDateTime hasta) {
    }
}
