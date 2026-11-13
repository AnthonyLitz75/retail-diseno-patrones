package com.grupo.retail.service.exportacion;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Respuesta HTTP de un CSV descargable, compartida por reportes y auditoría: UTF-8 con BOM
 * (Excel la usa para mostrar bien las tildes) y fechas en la hora de la tienda.
 */
public final class RespuestaCsv {

    /** Marca de orden de bytes: Excel la usa para detectar UTF-8. */
    private static final String BOM = String.valueOf((char) 0xFEFF);
    private static final MediaType CSV_UTF8 = new MediaType("text", "csv", StandardCharsets.UTF_8);
    /** Fechas legibles en Excel y en la hora de la tienda (la base las devuelve en UTC). */
    private static final DateTimeFormatter FECHA_CSV =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("America/Lima"));

    private RespuestaCsv() {
    }

    public static ResponseEntity<byte[]> adjunto(String nombre, String csv) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=" + nombre)
                .contentType(CSV_UTF8)
                .body((BOM + csv).getBytes(StandardCharsets.UTF_8));
    }

    public static String fecha(OffsetDateTime valor) {
        return valor == null ? null : FECHA_CSV.format(valor);
    }
}
