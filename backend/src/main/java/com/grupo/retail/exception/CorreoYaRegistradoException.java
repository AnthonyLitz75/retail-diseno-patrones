package com.grupo.retail.exception;

public class CorreoYaRegistradoException extends RuntimeException {

    public CorreoYaRegistradoException() {
        super("Ya existe una cuenta registrada con ese correo");
    }
}