package com.grupo.retail.patterns.command;

import com.grupo.retail.dao.CarritoDAO;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Command (GoF) - Comando concreto: agregar unidades de un producto.
 *
 * @param cantidadAnterior 0 si el producto no estaba en el carrito; deshacer lo retira
 */
public record AgregarProductoComando(long carritoId, long productoId, int cantidadAnterior, int cantidadNueva)
        implements ComandoCarrito {

    @Override
    public void ejecutar(CarritoDAO dao, Connection conexion) throws SQLException {
        ComandoCarrito.validarStockAlEjecutar(dao, conexion, productoId, cantidadNueva);
        dao.fijarCantidad(conexion, carritoId, productoId, cantidadNueva);
    }

    @Override
    public void deshacer(CarritoDAO dao, Connection conexion) throws SQLException {
        ComandoCarrito.restaurar(dao, conexion, carritoId, productoId, cantidadAnterior);
    }
}
