package com.grupo.retail.patterns.command;

import jakarta.servlet.http.HttpSession;

import java.io.Serial;
import java.io.Serializable;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Optional;

/**
 * Patrón Command (GoF) - Historial de comandos ejecutados (pila de deshacer).
 *
 * <p>Vive en la sesión HTTP: es una comodidad temporal que se pierde al cerrar sesión o al
 * reiniciar el servidor, sin afectar las líneas del carrito guardadas en PostgreSQL. El
 * historial recuerda la revisión que dejó la última acción o el último deshacer de esta
 * sesión; deshacer solo procede si el carrito sigue en esa revisión (nadie lo cambió desde
 * otra sesión).</p>
 */
public final class HistorialComandosCarrito implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** Máximo de acciones que se pueden deshacer. */
    public static final int MAX_HISTORIAL_CARRITO = 20;
    static final String ATRIBUTO_SESION = "HISTORIAL_CARRITO";

    /** Comando ejecutado y la revisión del carrito que dejó. */
    public record Registro(ComandoCarrito comando, long revision) implements Serializable {
    }

    private final Deque<Registro> pila = new ArrayDeque<>();
    /**
     * Revisión que debe tener el carrito para que el último registro se pueda deshacer.
     * Cambia al registrar una acción y también al deshacer, porque deshacer sube la revisión.
     */
    private long revisionEsperada;

    public synchronized void registrar(ComandoCarrito comando, long revision) {
        pila.push(new Registro(comando, revision));
        revisionEsperada = revision;
        if (pila.size() > MAX_HISTORIAL_CARRITO) {
            pila.removeLast();
        }
    }

    public synchronized Optional<Registro> ultimo() {
        return Optional.ofNullable(pila.peek());
    }

    public synchronized long revisionEsperada() {
        return revisionEsperada;
    }

    /**
     * Retira el registro ya deshecho y anota la revisión que dejó el deshacer. Solo actúa
     * si el registro sigue siendo el último (un doble clic no quita dos).
     */
    public synchronized void quitar(Registro registro, long revisionTrasDeshacer) {
        if (registro != null && registro == pila.peek()) {
            pila.pop();
            revisionEsperada = revisionTrasDeshacer;
        }
    }

    public synchronized void limpiar() {
        pila.clear();
    }

    public synchronized int tamanio() {
        return pila.size();
    }

    /** Historial de la sesión; lo crea la primera vez. */
    public static HistorialComandosCarrito de(HttpSession sesion) {
        synchronized (sesion) {
            Object actual = sesion.getAttribute(ATRIBUTO_SESION);
            if (actual instanceof HistorialComandosCarrito historial) {
                return historial;
            }
            HistorialComandosCarrito nuevo = new HistorialComandosCarrito();
            sesion.setAttribute(ATRIBUTO_SESION, nuevo);
            return nuevo;
        }
    }

    /** Se llama al confirmar la compra; al cerrar sesión la sesión entera se invalida. */
    public static void limpiarEn(HttpSession sesion) {
        if (sesion != null && sesion.getAttribute(ATRIBUTO_SESION) instanceof HistorialComandosCarrito historial) {
            historial.limpiar();
        }
    }
}
