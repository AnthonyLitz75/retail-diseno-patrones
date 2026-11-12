package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 007, T017 (US9, RNF07) con PostgreSQL y HTTP reales: con 5000 productos más y 5
 * usuarios simultáneos, el 95 % de las búsquedas del catálogo responde en menos de 3 s.
 * El resultado se guarda en target/rendimiento/busqueda.txt para documentarlo
 * (docs/calidad/rendimiento.md). Los productos sembrados se borran al terminar.
 */
class RendimientoBusquedaTest extends BaseCompraIntegracion {

    private static final int USUARIOS = 5;
    private static final int BUSQUEDAS_POR_USUARIO = 30;
    private static final long LIMITE_P95_MS = 3_000;

    /** Mezcla de búsquedas reales del catálogo público (invitado), incluido el catálogo completo. */
    private static final Map<String, String> BUSQUEDAS = new LinkedHashMap<>();

    static {
        BUSQUEDAS.put("Por nombre", "/api/productos?nombre=mouse");
        BUSQUEDAS.put("Marca y precio máximo", "/api/productos?nombre=razer&precioMax=300");
        BUSQUEDAS.put("Por SKU", "/api/productos?nombre=PERF-04");
        BUSQUEDAS.put("Por categoría", "/api/productos?categoria=Audio");
        BUSQUEDAS.put("Rango de precio", "/api/productos?precioMin=100&precioMax=500");
        BUSQUEDAS.put("Catálogo completo", "/api/productos");
    }

    private record Medicion(String busqueda, long milisegundos, int estado) {
    }

    private static String recurso(String ruta) throws IOException {
        try (InputStream entrada = RendimientoBusquedaTest.class.getResourceAsStream(ruta)) {
            if (entrada == null) {
                throw new IllegalStateException("No existe el recurso " + ruta);
            }
            return new String(entrada.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private List<Medicion> recorrido(int usuario) {
        ClienteHttp invitado = new ClienteHttp(puerto);
        List<String> nombres = new ArrayList<>(BUSQUEDAS.keySet());
        List<Medicion> mediciones = new ArrayList<>();
        for (int i = 0; i < BUSQUEDAS_POR_USUARIO; i++) {
            String busqueda = nombres.get((i + usuario) % nombres.size());
            long inicio = System.nanoTime();
            ClienteHttp.Respuesta respuesta = invitado.get(BUSQUEDAS.get(busqueda));
            mediciones.add(new Medicion(busqueda, (System.nanoTime() - inicio) / 1_000_000, respuesta.estado()));
        }
        return mediciones;
    }

    private static long percentil(List<Long> valores, double p) {
        List<Long> ordenados = valores.stream().sorted().toList();
        int indice = (int) Math.ceil(p * ordenados.size()) - 1;
        return ordenados.get(Math.max(0, indice));
    }

    @Test
    @DisplayName("RNF07: 5000 productos y 5 usuarios simultáneos; p95 de las búsquedas < 3 s")
    void busquedasConCincoMilProductos() throws Exception {
        datos.ejecutar(recurso("/rendimiento/siembra-5000-productos.sql"));
        try {
            ClienteHttp calentamiento = new ClienteHttp(puerto);
            BUSQUEDAS.values().forEach(calentamiento::get);
            assertTrue(calentamiento.get("/api/productos?nombre=PERF-").cuerpo().split("\"sku\":\"PERF-").length > 5000,
                    "Los 5000 productos sembrados están en el catálogo");

            List<Callable<List<Medicion>>> usuarios = new ArrayList<>();
            for (int u = 0; u < USUARIOS; u++) {
                int usuario = u;
                usuarios.add(() -> recorrido(usuario));
            }
            List<Medicion> mediciones = enParalelo(usuarios).stream().flatMap(List::stream).toList();

            assertEquals(USUARIOS * BUSQUEDAS_POR_USUARIO, mediciones.size());
            assertTrue(mediciones.stream().allMatch(m -> m.estado() == 200), "Todas las búsquedas responden 200");
            List<Long> todas = mediciones.stream().map(Medicion::milisegundos).toList();
            long p95 = percentil(todas, 0.95);
            guardarResultado(mediciones, p95);
            assertTrue(p95 < LIMITE_P95_MS, "p95 = " + p95 + " ms");
        } finally {
            datos.ejecutar(recurso("/rendimiento/limpieza-5000-productos.sql"));
        }
    }

    private static void guardarResultado(List<Medicion> mediciones, long p95) throws IOException {
        StringBuilder texto = new StringBuilder();
        texto.append("Usuarios simultáneos: ").append(USUARIOS)
                .append(" | búsquedas por usuario: ").append(BUSQUEDAS_POR_USUARIO)
                .append(" | total: ").append(mediciones.size()).append('\n');
        texto.append(String.format("%-24s %6s %6s %6s %6s%n", "Búsqueda", "n", "p50", "p95", "máx"));
        for (String busqueda : BUSQUEDAS.keySet()) {
            List<Long> tiempos = mediciones.stream()
                    .filter(m -> m.busqueda().equals(busqueda)).map(Medicion::milisegundos).toList();
            texto.append(String.format("%-24s %6d %6d %6d %6d%n", busqueda, tiempos.size(),
                    percentil(tiempos, 0.5), percentil(tiempos, 0.95),
                    tiempos.stream().mapToLong(Long::longValue).max().orElse(0)));
        }
        List<Long> todas = mediciones.stream().map(Medicion::milisegundos).toList();
        texto.append(String.format("%-24s %6d %6d %6d %6d%n", "TOTAL (ms)", todas.size(),
                percentil(todas, 0.5), p95, todas.stream().mapToLong(Long::longValue).max().orElse(0)));
        Path destino = Path.of("target", "rendimiento", "busqueda.txt");
        Files.createDirectories(destino.getParent());
        Files.writeString(destino, texto.toString(), StandardCharsets.UTF_8);
        System.out.println(texto);
    }
}
