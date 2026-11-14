package com.grupo.retail.exception;

/**
 * Excepción de dominio cuando falla la autenticación de credenciales de usuario (HTTP 401).
 */
public class CredencialesInvalidasException extends ReglaNegocioException {

    public CredencialesInvalidasException(String mensaje) {
        super(mensaje);
    }
}
