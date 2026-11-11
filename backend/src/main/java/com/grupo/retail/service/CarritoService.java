package com.grupo.retail.service;

import com.grupo.retail.dao.CarritoDAO;
import com.grupo.retail.exception.CarritoDesactualizadoException;
import com.grupo.retail.exception.StockInsuficienteException;
import com.grupo.retail.model.Carrito;
import com.grupo.retail.model.CarritoBloqueado;
import com.grupo.retail.patterns.command.AgregarProductoComando;
import com.grupo.retail.patterns.command.ComandoCarrito;
import com.grupo.retail.patterns.command.EliminarProductoComando;
import com.grupo.retail.patterns.command.HistorialComandosCarrito;
import com.grupo.retail.patterns.command.ModificarCantidadComando;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.NoSuchElementException;

/**
 * Patrón Command (GoF) - Invocador.
 *
 * <p>Cada acción del cliente se convierte en un comando que se ejecuta dentro de una
 * transacción, sube la revisión del carrito y, solo tras el commit, se apila en el
 * historial de la sesión. {@link #deshacer} toma el último comando y ejecuta su inverso
 * si el carrito no cambió desde entonces.</p>
 */
@Service
public class CarritoService {

    private static final String SIN_ACCIONES = "No hay acciones para deshacer";
    private static final String NO_ESTA_EN_CARRITO = "El producto no está en tu carrito";
    private static final String ACCION_DESCARTADA =
            "Se descartó esa acción; puedes seguir deshaciendo las anteriores";

    private final CarritoDAO carritoDAO;
    private final EjecutorTransaccion ejecutorTransaccion;

    public CarritoService(CarritoDAO carritoDAO, EjecutorTransaccion ejecutorTransaccion) {
        this.carritoDAO = carritoDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
    }

    public Carrito obtener(Long usuarioId) {
        return carritoDAO.obtener(usuarioId);
    }

    public Carrito agregar(Long usuarioId, Long productoId, int cantidad, HistorialComandosCarrito historial) {
        return ejecutorTransaccion.ejecutar("No se pudo agregar el producto al carrito", conexion -> {
            CarritoBloqueado carrito = carritoDAO.obtenerOCrearYBloquear(conexion, usuarioId);
            int anterior = carritoDAO.leerCantidad(conexion, carrito.id(), productoId);
            int nueva = Math.addExact(anterior, cantidad);
            return aplicar(conexion, carrito,
                    new AgregarProductoComando(carrito.id(), productoId, anterior, nueva), historial);
        });
    }

    public Carrito actualizarCantidad(
            Long usuarioId, Long productoId, int cantidad, HistorialComandosCarrito historial) {
        return ejecutorTransaccion.ejecutar("No se pudo actualizar el carrito", conexion -> {
            CarritoBloqueado carrito = carritoDAO.bloquearActivo(conexion, usuarioId);
            int anterior = cantidadExistente(conexion, carrito, productoId);
            return aplicar(conexion, carrito,
                    new ModificarCantidadComando(carrito.id(), productoId, anterior, cantidad), historial);
        });
    }

    public Carrito quitar(Long usuarioId, Long productoId, HistorialComandosCarrito historial) {
        return ejecutorTransaccion.ejecutar("No se pudo quitar el producto del carrito", conexion -> {
            CarritoBloqueado carrito = carritoDAO.bloquearActivo(conexion, usuarioId);
            int anterior = cantidadExistente(conexion, carrito, productoId);
            return aplicar(conexion, carrito,
                    new EliminarProductoComando(carrito.id(), productoId, anterior), historial);
        });
    }

    /**
     * Deshace la última acción: 400 si no hay acciones, 409 si el carrito cambió desde
     * otra sesión (en ese caso el historial ya no es confiable y se vacía) y 409 con motivo
     * si el producto ya no está disponible o no alcanza el stock.
     */
    public Carrito deshacer(Long usuarioId, HistorialComandosCarrito historial) {
        HistorialComandosCarrito.Registro registro = historial.ultimo()
                .orElseThrow(() -> new IllegalArgumentException(SIN_ACCIONES));
        long revisionEsperada = historial.revisionEsperada();
        return ejecutorTransaccion.ejecutar("No se pudo deshacer la acción del carrito", conexion -> {
            CarritoBloqueado carrito = carritoDAO.bloquearActivo(conexion, usuarioId);
            if (carrito.id() != registro.comando().carritoId() || carrito.revision() != revisionEsperada) {
                historial.limpiar();
                throw new CarritoDesactualizadoException();
            }
            deshacerODescartar(conexion, registro, historial);
            long revision = carritoDAO.incrementarRevision(conexion, carrito.id());
            ejecutorTransaccion.trasConfirmar(() -> historial.quitar(registro, revision));
            return carritoDAO.leerCarrito(conexion, carrito.id(), revision);
        });
    }

    /**
     * Si el inverso no es posible (producto desactivado o sin stock), esa acción ya nunca
     * podrá deshacerse: se descarta del historial para no bloquear las anteriores y se
     * responde 409 con el motivo. El historial vive en memoria, así que el descarte se
     * mantiene aunque la transacción se revierta.
     */
    private void deshacerODescartar(Connection conexion, HistorialComandosCarrito.Registro registro,
            HistorialComandosCarrito historial) throws SQLException {
        try {
            registro.comando().deshacer(carritoDAO, conexion);
        } catch (StockInsuficienteException error) {
            historial.descartar(registro);
            throw new StockInsuficienteException(error.getMessage() + ". " + ACCION_DESCARTADA);
        } catch (IllegalStateException error) {
            historial.descartar(registro);
            throw new IllegalStateException(error.getMessage() + ". " + ACCION_DESCARTADA, error);
        }
    }

    private Carrito aplicar(Connection conexion, CarritoBloqueado carrito, ComandoCarrito comando,
            HistorialComandosCarrito historial) throws SQLException {
        comando.ejecutar(carritoDAO, conexion);
        long revision = carritoDAO.incrementarRevision(conexion, carrito.id());
        // Solo una acción confirmada entra al historial: si la transacción se revierte, no hay nada que deshacer.
        ejecutorTransaccion.trasConfirmar(() -> historial.registrar(comando, revision));
        return carritoDAO.leerCarrito(conexion, carrito.id(), revision);
    }

    private int cantidadExistente(Connection conexion, CarritoBloqueado carrito, Long productoId)
            throws SQLException {
        int cantidad = carritoDAO.leerCantidad(conexion, carrito.id(), productoId);
        if (cantidad == 0) {
            throw new NoSuchElementException(NO_ESTA_EN_CARRITO);
        }
        return cantidad;
    }
}
