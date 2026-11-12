package com.grupo.retail.service;

import com.grupo.retail.dao.ReporteDAO;
import com.grupo.retail.model.InventarioReporte;
import com.grupo.retail.model.MovimientoReporte;
import com.grupo.retail.model.RangoFechas;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Reportes del administrador (RF05, RF06; spec 007). Los filtros aceptan una fecha
 * {@code yyyy-MM-dd} (contrato 007: el día completo en hora de Lima, rango inclusivo) o una
 * fecha ISO-8601 con zona, que es lo que enviaba el panel antes del spec 007.
 */
@Service
public class ReporteService {


    private final ReporteDAO reporteDAO;

    public ReporteService(ReporteDAO reporteDAO) {
        this.reporteDAO = reporteDAO;
    }

    public ResumenAdministrativo obtenerResumen(String desde, String hasta) {
        RangoFechas rango = RangoFechas.de(desde, hasta);
        return reporteDAO.obtenerResumen(rango.desde(), rango.hasta());
    }

    public List<VentaReporte> listarVentas(String desde, String hasta) {
        RangoFechas rango = RangoFechas.de(desde, hasta);
        return reporteDAO.listarVentas(rango.desde(), rango.hasta());
    }

    public List<MovimientoReporte> listarMovimientos(String desde, String hasta) {
        RangoFechas rango = RangoFechas.de(desde, hasta);
        return reporteDAO.listarMovimientos(rango.desde(), rango.hasta());
    }

    /** El inventario es una foto del momento: no lleva rango de fechas. */
    public List<InventarioReporte> listarInventario() {
        return reporteDAO.listarInventario();
    }
}
