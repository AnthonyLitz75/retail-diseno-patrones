package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Locale;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Formulario "Nuevo producto" (boceto del panel vendedor) con PostgreSQL y HTTP reales:
 * ficha completa, código generado o elegido (único), descuento válido y stock de apertura
 * registrado como ENTRADA en el kardex.
 */
class CreacionProductoTest extends BaseCompraIntegracion {

    private static String codigo() {
        return "NP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private static String ficha(String sku, String categoria, String precio, String precioAnterior, String imagen) {
        return "{\"nombre\":\"Teclado mecánico 60% RGB\",\"categoria\":\"" + categoria + "\","
                + "\"precio\":" + precio + ",\"stock\":7,"
                + "\"sku\":" + (sku == null ? "null" : "\"" + sku + "\"") + ","
                + "\"marca\":\"Logitech\",\"descripcion\":\"Switches lineales y cable USB-C\","
                + "\"imagen\":" + (imagen == null ? "null" : "\"" + imagen + "\"") + ","
                + "\"precioAnterior\":" + (precioAnterior == null ? "null" : precioAnterior) + ","
                + "\"nuevo\":true}";
    }

    @Test
    @DisplayName("El vendedor publica la ficha completa y el stock de apertura entra al kardex")
    void fichaCompleta() {
        String categoria = datos.crearCategoria();
        String sku = codigo();
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));

        ClienteHttp.Respuesta creado = vendedor.postJson("/api/productos",
                ficha(sku.toLowerCase(Locale.ROOT), categoria, "399.00", "459.00", "https://cdn.ejemplo.pe/teclado.webp"));

        assertEquals(201, creado.estado(), creado.toString());
        String cuerpo = creado.cuerpo();
        assertTrue(cuerpo.contains("\"sku\":\"" + sku + "\""), "el código se guarda en mayúsculas: " + cuerpo);
        assertTrue(cuerpo.contains("\"marca\":\"Logitech\""), cuerpo);
        assertTrue(cuerpo.contains("\"descripcion\":\"Switches lineales y cable USB-C\""), cuerpo);
        assertTrue(cuerpo.contains("\"imagen\":\"https://cdn.ejemplo.pe/teclado.webp\""), cuerpo);
        assertTrue(cuerpo.contains("\"precioAnterior\":459.00"), cuerpo);
        assertTrue(cuerpo.contains("\"nuevo\":true"), cuerpo);
        long id = creado.campoNumerico("id");
        assertEquals(7, datos.stock(id));
        String kardex = vendedor.get("/api/productos/" + id + "/movimientos").cuerpo();
        assertTrue(kardex.contains("ENTRADA") && kardex.contains("Stock inicial al crear producto"), kardex);
    }

    @Test
    @DisplayName("Sin código, se genera PA-NNNN a partir del id")
    void codigoGenerado() {
        String categoria = datos.crearCategoria();

        ClienteHttp.Respuesta creado = sesionDe(datos.crearEmpleado("ADMIN"))
                .postJson("/api/productos", ficha(null, categoria, "120.00", null, null));

        assertEquals(201, creado.estado(), creado.toString());
        long id = creado.campoNumerico("id");
        assertEquals(String.format("PA-%04d", id), datos.skuDe(id));
    }

    @Test
    @DisplayName("Código repetido, descuento inválido o imagen insegura responden 400; el cliente no puede crear")
    void validaciones() {
        String categoria = datos.crearCategoria();
        String sku = codigo();
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));
        assertEquals(201, vendedor.postJson("/api/productos", ficha(sku, categoria, "50.00", null, null)).estado());

        ClienteHttp.Respuesta repetido = vendedor.postJson("/api/productos", ficha(sku, categoria, "50.00", null, null));
        ClienteHttp.Respuesta descuento = vendedor.postJson("/api/productos", ficha(codigo(), categoria, "50.00", "40.00", null));
        ClienteHttp.Respuesta imagen = vendedor.postJson("/api/productos",
                ficha(codigo(), categoria, "50.00", null, "javascript:alert(1)"));
        ClienteHttp.Respuesta cliente = sesionDe(datos.crearCliente())
                .postJson("/api/productos", ficha(codigo(), categoria, "50.00", null, null));

        assertEquals(400, repetido.estado(), repetido.toString());
        assertTrue(repetido.cuerpo().contains("Ya existe un producto con el código " + sku), repetido.cuerpo());
        assertEquals(400, descuento.estado(), descuento.toString());
        assertTrue(descuento.cuerpo().contains("El precio anterior debe ser mayor que el precio actual"), descuento.cuerpo());
        assertEquals(400, imagen.estado(), imagen.toString());
        assertEquals(403, cliente.estado(), cliente.toString());
    }
}
