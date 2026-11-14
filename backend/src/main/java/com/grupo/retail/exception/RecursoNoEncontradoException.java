package com.grupo.retail.exception;

import java.util.NoSuchElementException;

/**
 * Excepción de dominio para recursos no encontrados en el sistema (HTTP 404).
 * Extiende de {@link NoSuchElementException} para preservar compatibilidad hacia atrás
 * con aserciones y contratos preexistentes.
 */
public class RecursoNoEncontradoException extends NoSuchElementException {

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
