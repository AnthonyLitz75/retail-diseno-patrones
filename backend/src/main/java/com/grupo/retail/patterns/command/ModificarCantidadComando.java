package com.grupo.retail.patterns.command;

import com.grupo.retail.dao.CarritoDAO;

import java.sql.Connection;
import java.sql.SQLException;

/** Patrón Command (GoF) - Comando concreto: cambiar la cantidad de un producto del carrito. */
public record ModificarCantidadComando(long carritoId, long productoId, int cantidadAnterior, int cantidadNueva)
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
