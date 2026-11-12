package com.grupo.retail.exception;

/** Demasiados inicios de sesión fallidos para un correo (429 con cabecera Retry-After). */
public class DemasiadosIntentosException extends RuntimeException {

    private final long segundosEspera;

    public DemasiadosIntentosException(long segundosEspera) {
        super("Demasiados intentos fallidos. Vuelve a intentarlo en "
                + Math.max(1, (segundosEspera + 59) / 60) + " minuto(s)");
        this.segundosEspera = segundosEspera;
    }

    public long segundosEspera() {
        return segundosEspera;
    }
}
