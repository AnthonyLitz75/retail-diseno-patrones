package com.grupo.retail.service;

import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dto.LineaEntradaInventario;
import com.grupo.retail.model.MovimientoInventario;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;

@Service
public class InventarioService {
    private final InventarioDAO inventarioDAO;

    public InventarioService(InventarioDAO inventarioDAO) {
        this.inventarioDAO = inventarioDAO;
    }

    public List<MovimientoInventario> registrarEntradas(
            List<LineaEntradaInventario> productos, String motivo, Long responsableId) {
        long productosUnicos = productos.stream()
                .map(LineaEntradaInventario::productoId)
                .distinct()
                .count();
        if (productosUnicos != productos.size()) {
            throw new IllegalArgumentException(
                    "No se puede repetir un producto dentro del mismo lote");
        }
        return inventarioDAO.registrarEntradas(productos, motivo, responsableId);
    }

    public List<MovimientoInventario> listarMovimientos(
            Long productoId, OffsetDateTime desde, OffsetDateTime hasta) {
        if (productoId != null && productoId <= 0) {
            throw new IllegalArgumentException("El ID del producto debe ser positivo");
        }
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha inicial no puede superar a la fecha final");
        }
        return inventarioDAO.listarMovimientos(productoId, desde, hasta);
    }
}