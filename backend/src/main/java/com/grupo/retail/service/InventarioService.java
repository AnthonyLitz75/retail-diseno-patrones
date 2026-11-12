package com.grupo.retail.service;

import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dto.LineaEntradaInventario;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.RegistroMovimiento.TipoMovimiento;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.transaccion.EjecutorTransaccion;

import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class InventarioService {
    private final InventarioDAO inventarioDAO;
    private final EjecutorTransaccion ejecutorTransaccion;

    public InventarioService(InventarioDAO inventarioDAO, EjecutorTransaccion ejecutorTransaccion) {
        this.inventarioDAO = inventarioDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
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
        List<LineaEntradaInventario> ordenadas = productos.stream()
                .sorted(Comparator.comparing(LineaEntradaInventario::productoId))
                .toList();
        String motivoLimpio = motivo.strip();
        return ejecutorTransaccion.ejecutar("No se pudieron registrar las entradas de inventario", conexion -> {
            // 1. Bloquear todo el lote en orden ascendente y validar antes de escribir.
            for (LineaEntradaInventario linea : ordenadas) {
                int stockActual = inventarioDAO.bloquearStockActivo(conexion, linea.productoId())
                        .orElseThrow(() -> new NoSuchElementException(
                                "No existe un producto activo con ID " + linea.productoId()));
                try {
                    Math.addExact(stockActual, linea.cantidad());
                } catch (ArithmeticException error) {
                    throw new IllegalArgumentException("La entrada supera el stock máximo permitido", error);
                }
            }
            // 2. Sumar stock y dejar el movimiento ENTRADA con su responsable.
            List<MovimientoInventario> movimientos = new ArrayList<>();
            for (LineaEntradaInventario linea : ordenadas) {
                inventarioDAO.sumarStock(conexion, linea.productoId(), linea.cantidad());
                movimientos.add(inventarioDAO.registrarMovimiento(conexion, RegistroMovimiento.simple(
                        linea.productoId(), TipoMovimiento.ENTRADA, linea.cantidad(), motivoLimpio, responsableId)));
            }
            return List.copyOf(movimientos);
        });
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