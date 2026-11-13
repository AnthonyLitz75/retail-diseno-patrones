package com.grupo.retail.service.exportacion;

import java.math.BigDecimal;
import java.util.List;

/**
 * Spec 007 (T007, RF06): escritor de CSV para los reportes del administrador (GRASP Pure
 * Fabrication: no es un concepto del dominio, existe para que las reglas de escape vivan
 * en un solo lugar en lugar de repetirse en cada reporte).
 *
 * <ul>
 *   <li>La cabecera va sin comillas; cada fila termina en CRLF (RFC 4180).</li>
 *   <li>El texto va siempre entrecomillado y sus comillas se duplican, de modo que comas y
 *   saltos de línea quedan dentro de la celda.</li>
 *   <li>El texto que empieza con {@code = + - @}, tabulador o retorno se prefija con un
 *   apóstrofo para que una hoja de cálculo no lo ejecute como fórmula (CSV injection).</li>
 *   <li>Números, booleanos y fechas se escriben tal cual: un movimiento de -3 es un número,
 *   no una fórmula. Un nulo es una celda vacía.</li>
 * </ul>
 */
public final class EscritorCsv {

    private static final String FIN_DE_LINEA = "\r\n";

    private final List<String> cabecera;
    private final StringBuilder contenido = new StringBuilder();

    public EscritorCsv(String... columnas) {
        if (columnas.length == 0) {
            throw new IllegalArgumentException("Un CSV necesita al menos una columna");
        }
        this.cabecera = List.of(columnas);
        contenido.append(String.join(",", cabecera)).append(FIN_DE_LINEA);
    }

    public List<String> cabecera() {
        return cabecera;
    }

    public EscritorCsv fila(Object... celdas) {
        if (celdas.length != cabecera.size()) {
            throw new IllegalArgumentException(
                    "La fila tiene " + celdas.length + " celdas y la cabecera " + cabecera.size());
        }
        for (int i = 0; i < celdas.length; i++) {
            if (i > 0) {
                contenido.append(',');
            }
            contenido.append(celda(celdas[i]));
        }
        contenido.append(FIN_DE_LINEA);
        return this;
    }

    @Override
    public String toString() {
        return contenido.toString();
    }

    static String celda(Object valor) {
        if (valor == null) {
            return "";
        }
        if (valor instanceof BigDecimal decimal) {
            return decimal.toPlainString();
        }
        if (valor instanceof Number || valor instanceof Boolean) {
            return valor.toString();
        }
        if (valor instanceof CharSequence texto) {
            return texto(texto.toString());
        }
        // Fechas y otros valores con representación ISO estable: sin comillas ni neutralizar.
        return valor.toString();
    }

    private static String texto(String valor) {
        String seguro = empiezaComoFormula(valor) ? "'" + valor : valor;
        return "\"" + seguro.replace("\"", "\"\"") + "\"";
    }

    private static boolean empiezaComoFormula(String valor) {
        if (valor.isEmpty()) {
            return false;
        }
        char primero = valor.charAt(0);
        return primero == '=' || primero == '+' || primero == '-' || primero == '@'
                || primero == '\t' || primero == '\r';
    }
}
