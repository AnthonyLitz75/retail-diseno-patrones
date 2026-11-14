package com.grupo.retail.exception;

/**
 * Excepción base de dominio para operaciones que violan reglas o restricciones del negocio (HTTP 400).
 */
public class ReglaNegocioException extends RuntimeException {

    public ReglaNegocioException(String mensaje) {
        super(mensaje);
    }

    public ReglaNegocioException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
