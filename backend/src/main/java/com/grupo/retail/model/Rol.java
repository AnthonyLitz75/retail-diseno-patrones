package com.grupo.retail.model;

import java.util.Arrays;
import java.util.Optional;

/**
 * Roles del sistema. En la base y en la sesión se guardan como texto (columna
 * {@code usuario.rol}); este enum evita repetir esos textos en el código.
 */
public enum Rol {
    CLIENTE, ADMIN, VENDEDOR, ALMACEN, SOPORTE;

    /** {@code true} si el texto guardado corresponde a este rol. */
    public boolean es(String valor) {
        return name().equals(valor);
    }

    /** Rol correspondiente al texto, o vacío si no es un rol válido. */
    public static Optional<Rol> desde(String valor) {
        return Arrays.stream(values()).filter(rol -> rol.es(valor)).findFirst();
    }
}
