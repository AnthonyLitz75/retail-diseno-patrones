package com.grupo.retail.model;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Ciclo de vida del reclamo (spec 006, FR-001):
 * ABIERTO -> EN_ATENCION -> RESUELTO | ESCALADO, y ESCALADO -> EN_ATENCION | RESUELTO.
 *
 * <p>Se usa un enum con un mapa de transiciones en lugar del patrón State completo
 * (decisión de research.md del spec 006): dos ciclos simples no justifican una clase por
 * estado. Una transición no permitida lanza IllegalStateException (409).</p>
 */
public enum EstadoReclamo {
    ABIERTO,
    EN_ATENCION,
    RESUELTO,
    ESCALADO;

    private static final Map<EstadoReclamo, Set<EstadoReclamo>> TRANSICIONES = Map.of(
            ABIERTO, EnumSet.of(EN_ATENCION),
            EN_ATENCION, EnumSet.of(RESUELTO, ESCALADO),
            ESCALADO, EnumSet.of(EN_ATENCION, RESUELTO),
            RESUELTO, EnumSet.noneOf(EstadoReclamo.class));

    public void validarTransicion(EstadoReclamo destino) {
        if (!TRANSICIONES.get(this).contains(destino)) {
            throw new IllegalStateException(
                    "Un reclamo " + this + " no puede pasar a " + destino);
        }
    }

    /** Convierte el filtro de la bandeja; un valor desconocido es un error del cliente (400). */
    public static EstadoReclamo desdeFiltro(String valor) {
        return Arrays.stream(values())
                .filter(estado -> estado.name().equals(valor))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Estado de reclamo no válido: " + valor));
    }
}
