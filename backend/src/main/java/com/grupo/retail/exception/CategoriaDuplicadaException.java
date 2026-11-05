package com.grupo.retail.exception;

public class CategoriaDuplicadaException extends RuntimeException {
    public CategoriaDuplicadaException() {
        super("Ya existe una categoría con ese nombre");
    }
}