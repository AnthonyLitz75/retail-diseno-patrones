package com.grupo.retail.exception;

/**
 * La clave de confirmación ya pertenece a un pedido de otro cliente. Se responde 409
 * sin revelar ningún dato de ese pedido.
 */
public class ClaveConfirmacionEnUsoException extends RuntimeException {

    public ClaveConfirmacionEnUsoException() {
        super("La clave de confirmación ya fue utilizada; genera una nueva e inténtalo de nuevo");
    }
}
