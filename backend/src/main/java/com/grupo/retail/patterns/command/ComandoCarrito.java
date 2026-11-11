package com.grupo.retail.patterns.command;

import com.grupo.retail.dao.CarritoDAO;
import com.grupo.retail.exception.StockInsuficienteException;

import java.io.Serializable;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.NoSuchElementException;

/**
 * Patrón Command (GoF) - Comando.
 *
 * <p>Cada modificación del carrito (agregar, cambiar cantidad, eliminar) es un objeto que
 * sabe ejecutarse y deshacerse. Los comandos guardan solo datos simples e inmutables
 * (carrito, producto, cantidades): nunca una conexión ni un DAO, que reciben al ejecutar.
 * Por eso pueden vivir en la sesión HTTP sin retener recursos.</p>
 */
public sealed interface ComandoCarrito extends Serializable
        permits AgregarProductoComando, ModificarCantidadComando, EliminarProductoComando {

    long carritoId();

    long productoId();

    void ejecutar(CarritoDAO dao, Connection conexion) throws SQLException;

    void deshacer(CarritoDAO dao, Connection conexion) throws SQLException;

    /** Regla habitual de una acción del cliente: producto activo (404) y stock suficiente (400). */
    static void validarStockAlEjecutar(CarritoDAO dao, Connection conexion, long productoId, int cantidad)
            throws SQLException {
        int stock = dao.stockSiActivo(conexion, productoId)
                .orElseThrow(() -> new NoSuchElementException("El producto no existe o está inactivo"));
        if (cantidad > stock) {
            throw new IllegalArgumentException(
                    "La cantidad solicitada supera el stock disponible (" + stock + ")");
        }
    }

    /**
     * Restaura una cantidad previa al deshacer. Retirar (0) siempre es posible; volver a
     * poner unidades exige que el producto siga activo y tenga stock (si no, 409 con motivo).
     */
    static void restaurar(CarritoDAO dao, Connection conexion, long carritoId, long productoId, int cantidad)
            throws SQLException {
        if (cantidad > 0) {
            int stock = dao.stockSiActivo(conexion, productoId)
                    .orElseThrow(() -> new IllegalStateException(
                            "El producto ya no está disponible; no se puede deshacer la acción"));
            if (cantidad > stock) {
                throw new StockInsuficienteException(
                        "No hay stock suficiente para deshacer la acción. Disponible: " + stock);
            }
        }
        dao.fijarCantidad(conexion, carritoId, productoId, cantidad);
    }
}
