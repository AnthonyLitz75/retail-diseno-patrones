package com.grupo.retail.patterns.command;

import com.grupo.retail.dao.CarritoDAO;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Command (GoF) - Comando concreto: retirar un producto del carrito. Guarda la
 * cantidad que había para poder devolverla al deshacer.
 */
public record EliminarProductoComando(long carritoId, long productoId, int cantidadAnterior)
        implements ComandoCarrito {

    @Override
    public void ejecutar(CarritoDAO dao, Connection conexion) throws SQLException {
        dao.fijarCantidad(conexion, carritoId, productoId, 0);
    }

    @Override
    public void deshacer(CarritoDAO dao, Connection conexion) throws SQLException {
        ComandoCarrito.restaurar(dao, conexion, carritoId, productoId, cantidadAnterior);
    }
}
