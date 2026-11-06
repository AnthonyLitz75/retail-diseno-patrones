package com.grupo.retail.exception;

/**
 * Falla de infraestructura al acceder a la base de datos (conexión caída, SQL inválido,
 * timeout, etc.). No es un conflicto de negocio: se responde como 500 y se registra en el log.
 */
public class ErrorAccesoDatosException extends RuntimeException {

    public ErrorAccesoDatosException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
