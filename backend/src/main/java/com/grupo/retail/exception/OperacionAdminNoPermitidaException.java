package com.grupo.retail.exception;

public class OperacionAdminNoPermitidaException extends RuntimeException {
    public OperacionAdminNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}