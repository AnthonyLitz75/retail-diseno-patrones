package com.grupo.retail.integracion;

import java.io.IOException;
import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Navegador mínimo para pruebas de integración: conserva sus propias cookies de sesión
 * y sigue el mismo flujo que la SPA (token CSRF, inicio de sesión y escrituras con la
 * cabecera X-XSRF-TOKEN). Cada comprador simultáneo usa su propia instancia.
 */
public final class ClienteHttp {

    private static final Pattern TOKEN = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]*)\"");
    private static final Pattern ID_PEDIDO = Pattern.compile("\"idPedido\"\\s*:\\s*(\\d+)");

    private final String base;
    private final HttpClient http;
    private String tokenCsrf;

    public record Respuesta(int estado, String cuerpo) {
        public long idPedido() {
            Matcher m = ID_PEDIDO.matcher(cuerpo);
            if (!m.find()) {
                throw new IllegalStateException("La respuesta no contiene idPedido: " + cuerpo);
            }
            return Long.parseLong(m.group(1));
        }
    }

    public ClienteHttp(int puerto) {
        this.base = "http://localhost:" + puerto;
        this.http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
    }

    /** Inicia sesión como en la SPA y deja listo el token CSRF de la sesión nueva. */
    public ClienteHttp iniciarSesion(String correo, String clave) {
        renovarCsrf();
        Respuesta login = post("/api/auth/login",
                "{\"correo\":\"" + correo + "\",\"clave\":\"" + clave + "\"}");
        if (login.estado() != 200) {
            throw new IllegalStateException("No se pudo iniciar sesión: " + login);
        }
        // El login crea una sesión nueva (protección contra fijación): se pide su token.
        renovarCsrf();
        return this;
    }

    public Respuesta confirmarCompra(String metodoPago, String claveConfirmacion) {
        String clave = claveConfirmacion == null ? "" : claveConfirmacion;
        return post("/api/pedidos/confirmar",
                "{\"metodoPago\":\"" + metodoPago + "\",\"claveConfirmacion\":\"" + clave + "\","
                        + "\"destinatario\":\"Destinatario de prueba\","
                        + "\"direccionEnvio\":\"Av. Prueba 123\"}");
    }

    public Respuesta put(String ruta) {
        return enviar(HttpRequest.newBuilder(URI.create(base + ruta))
                .header("X-XSRF-TOKEN", tokenCsrf)
                .PUT(HttpRequest.BodyPublishers.noBody()));
    }

    private void renovarCsrf() {
        Respuesta respuesta = enviar(HttpRequest.newBuilder(URI.create(base + "/api/auth/csrf")).GET());
        Matcher m = TOKEN.matcher(respuesta.cuerpo());
        if (respuesta.estado() != 200 || !m.find()) {
            throw new IllegalStateException("No se obtuvo el token CSRF: " + respuesta);
        }
        tokenCsrf = m.group(1);
    }

    private Respuesta post(String ruta, String json) {
        return enviar(HttpRequest.newBuilder(URI.create(base + ruta))
                .header("Content-Type", "application/json")
                .header("X-XSRF-TOKEN", tokenCsrf)
                .POST(HttpRequest.BodyPublishers.ofString(json)));
    }

    private Respuesta enviar(HttpRequest.Builder peticion) {
        try {
            HttpResponse<String> r = http.send(peticion.build(), HttpResponse.BodyHandlers.ofString());
            return new Respuesta(r.statusCode(), r.body());
        } catch (IOException error) {
            throw new IllegalStateException(error);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(error);
        }
    }
}
