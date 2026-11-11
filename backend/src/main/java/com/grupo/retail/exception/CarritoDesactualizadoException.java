package com.grupo.retail.exception;

/**
 * El carrito cambió desde otra sesión después de la acción que se quiere deshacer
 * (la revisión no coincide). Se responde 409 y no se modifica nada.
 */
public class CarritoDesactualizadoException extends RuntimeException {

    public CarritoDesactualizadoException() {
        super("El carrito cambió; actualiza e intenta de nuevo");
    }
}
