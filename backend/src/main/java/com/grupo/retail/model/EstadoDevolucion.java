package com.grupo.retail.model;

import java.util.Arrays;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Ciclo de vida de la devolución (spec 006, FR-001):
 * SOLICITADA -> APROBADA | RECHAZADA y APROBADA -> CERRADA. RECHAZADA y CERRADA son
 * terminales. Mismo criterio que {@link EstadoReclamo}: enum con mapa de transiciones; una
 * transición no permitida lanza IllegalStateException (409).
 */
public enum EstadoDevolucion {
    SOLICITADA,
    APROBADA,
    RECHAZADA,
    CERRADA;

    private static final Map<EstadoDevolucion, Set<EstadoDevolucion>> TRANSICIONES = Map.of(
            SOLICITADA, EnumSet.of(APROBADA, RECHAZADA),
            APROBADA, EnumSet.of(CERRADA),
            RECHAZADA, EnumSet.noneOf(EstadoDevolucion.class),
            CERRADA, EnumSet.noneOf(EstadoDevolucion.class));

    public void validarTransicion(EstadoDevolucion destino) {
        if (!TRANSICIONES.get(this).contains(destino)) {
            throw new IllegalStateException(
                    "Una devolución " + this + " no puede pasar a " + destino);
        }
    }

    /** Solo RECHAZADA libera las unidades: las demás consumen el saldo devolvible (FR-003). */
    public boolean comprometeSaldo() {
        return this != RECHAZADA;
    }

    /** Convierte el filtro de la bandeja; un valor desconocido es un error del cliente (400). */
    public static EstadoDevolucion desdeFiltro(String valor) {
        return Arrays.stream(values())
                .filter(estado -> estado.name().equals(valor))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Estado de devolución no válido: " + valor));
    }
}
