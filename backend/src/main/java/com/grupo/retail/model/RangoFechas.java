package com.grupo.retail.model;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;

/**
 * Rango de fechas opcional de los filtros administrativos (reportes y auditoría).
 * Acepta {@code yyyy-MM-dd} (un día completo en la hora de la tienda) o ISO-8601 con zona.
 * Cualquiera de los extremos puede ser {@code null} (sin límite).
 */
public record RangoFechas(OffsetDateTime desde, OffsetDateTime hasta) {

    private static final ZoneId ZONA_TIENDA = ZoneId.of("America/Lima");

    /** @throws IllegalArgumentException si una fecha no es válida o desde es posterior a hasta */
    public static RangoFechas de(String desdeTexto, String hastaTexto) {
        OffsetDateTime desde = parsear("desde", desdeTexto, false);
        OffsetDateTime hasta = parsear("hasta", hastaTexto, true);
        if (desde != null && hasta != null && desde.isAfter(hasta)) {
            throw new IllegalArgumentException("La fecha desde no puede ser posterior a hasta");
        }
        return new RangoFechas(desde, hasta);
    }

    /**
     * Una fecha sola cubre el día completo: {@code desde} es su primer instante y
     * {@code hasta} el último microsegundo (la precisión de PostgreSQL), así el rango es
     * inclusivo sin redondear al día siguiente.
     */
    private static OffsetDateTime parsear(String campo, String texto, boolean finDelDia) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        String valor = texto.strip();
        try {
            if (valor.length() == 10) {
                LocalDate dia = LocalDate.parse(valor);
                return finDelDia
                        ? dia.plusDays(1).atStartOfDay(ZONA_TIENDA).toOffsetDateTime().minusNanos(1_000)
                        : dia.atStartOfDay(ZONA_TIENDA).toOffsetDateTime();
            }
            return OffsetDateTime.parse(valor);
        } catch (DateTimeParseException error) {
            throw new IllegalArgumentException(
                    "El parámetro " + campo + " debe ser una fecha yyyy-MM-dd o ISO-8601 con zona", error);
        }
    }
}
