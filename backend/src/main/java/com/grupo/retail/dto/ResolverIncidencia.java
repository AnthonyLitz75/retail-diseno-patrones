package com.grupo.retail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * RF28: el administrador resuelve un reclamo escalado, o con devolver = true lo devuelve a
 * Soporte (EN_ATENCION) con la resolución como instrucciones.
 */
public record ResolverIncidencia(
        @NotBlank(message = "La resolución es obligatoria")
        @Size(max = 2000, message = "La resolución no puede superar 2000 caracteres")
        String resolucion,
        Boolean devolver) {

    public boolean devolverASoporte() {
        return Boolean.TRUE.equals(devolver);
    }
}
