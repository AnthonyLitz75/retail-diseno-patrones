package com.grupo.retail.exception;

/**
 * El stock disponible no alcanza para la cantidad pedida (por ejemplo, otro cliente
 * compró la última unidad). Es un conflicto con el estado actual: se responde 409.
 */
public class StockInsuficienteException extends RuntimeException {

    public StockInsuficienteException(String mensaje) {
        super(mensaje);
    }
}
