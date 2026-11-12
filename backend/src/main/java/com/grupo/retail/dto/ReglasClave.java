package com.grupo.retail.dto;

/**
 * Regla de contraseña de las cuentas nuevas (cliente y personal), la misma que el formulario
 * de registro muestra en vivo: de 8 a 72 caracteres, al menos una mayúscula y un número.
 * El límite de 72 es el de BCrypt.
 */
public final class ReglasClave {

    public static final String PATRON = "^(?=.*\\p{Lu})(?=.*\\d).*$";
    public static final String MENSAJE = "La contraseña debe tener al menos una letra mayúscula y un número";

    private ReglasClave() {
    }
}
