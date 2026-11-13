package com.grupo.retail.service.exportacion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Spec 007, T005 (US7, RF06): reglas de escritura de los CSV de reportes. */
class EscritorCsvTest {

    /** CSV de una columna "a" con una sola celda de texto. */
    private static String una(String celda) {
        return new EscritorCsv("a").fila(celda).toString();
    }

    @Test
    @DisplayName("Cabecera sin comillas y filas terminadas en CRLF")
    void cabeceraYFinDeLinea() {
        String csv = new EscritorCsv("id", "nombre").fila(1, "Mouse").fila(2, "Teclado").toString();
        assertEquals("id,nombre\r\n1,\"Mouse\"\r\n2,\"Teclado\"\r\n", csv);
    }

    @Test
    @DisplayName("Comas, comillas y saltos de línea quedan dentro de una celda entrecomillada")
    void escapeDeTexto() {
        assertEquals("a\r\n\"Mouse, inalámbrico\"\r\n", una("Mouse, inalámbrico"));
        assertEquals("a\r\n\"Cliente \"\"Uno\"\"\"\r\n", una("Cliente \"Uno\""));
        assertEquals("a\r\n\"línea 1\nlínea 2\"\r\n", una("línea 1\nlínea 2"));
    }

    @Test
    @DisplayName("El texto que empieza con =, +, -, @, tabulador o retorno se neutraliza con apóstrofo")
    void neutralizaFormulas() {
        for (String peligroso : new String[] {"=1+1", "+51 999", "-SUM(A1:A3)", "@macro", "\tx", "\rx"}) {
            assertEquals("a\r\n\"'" + peligroso + "\"\r\n", una(peligroso), peligroso);
        }
        assertEquals("a\r\n\"Mouse=bueno\"\r\n", una("Mouse=bueno"), "Solo importa el primer carácter");
    }

    @Test
    @DisplayName("Números, fechas, booleanos y nulos se escriben sin neutralizar")
    void valoresNoTextuales() {
        String csv = new EscritorCsv("cantidad", "monto", "activo", "fecha", "vacio")
                .fila(-3, new BigDecimal("1E+2"), true, OffsetDateTime.parse("2026-11-01T10:00:00-05:00"), null)
                .toString();
        assertEquals("cantidad,monto,activo,fecha,vacio\r\n-3,100,true,2026-11-01T10:00-05:00,\r\n", csv,
                "Un movimiento negativo es un número, no una fórmula");
    }

    @Test
    @DisplayName("Una fila con más o menos celdas que la cabecera es un error de programación")
    void filaDeTamanoDistinto() {
        EscritorCsv escritor = new EscritorCsv("a", "b");
        assertThrows(IllegalArgumentException.class, () -> escritor.fila("solo una"));
        assertThrows(IllegalArgumentException.class, () -> new EscritorCsv());
        assertEquals(Arrays.asList("a", "b"), escritor.cabecera());
    }
}
