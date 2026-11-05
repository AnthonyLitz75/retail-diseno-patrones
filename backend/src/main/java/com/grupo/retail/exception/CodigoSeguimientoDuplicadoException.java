package com.grupo.retail.exception;

public class CodigoSeguimientoDuplicadoException extends RuntimeException {
    public CodigoSeguimientoDuplicadoException(Throwable causa) {
        super("El código de seguimiento ya está asociado a otro pedido", causa);
    }
}
