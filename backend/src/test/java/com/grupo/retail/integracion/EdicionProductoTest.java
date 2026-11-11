package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 007, T014a (RF16) con PostgreSQL y HTTP reales: el personal edita la ficha del
 * producto y lo activa o desactiva (nunca lo borra); los pedidos conservan el nombre y el
 * precio con que se vendieron.
 */
class EdicionProductoTest extends BaseCompraIntegracion {

    private String ficha(String nombre, String categoria, String imagen) {
        return "{\"nombre\":\"" + nombre + "\",\"marca\":\"Logitech\",\"descripcion\":\"Inalámbrico, 2.4 GHz\","
                + "\"imagen\":" + (imagen == null ? "null" : "\"" + imagen + "\"")
                + ",\"categoria\":\"" + categoria + "\"}";
    }

    @Test
    @DisplayName("RF16: el vendedor edita la ficha y el pedido anterior conserva nombre y precio históricos")
    void editarFicha() {
        Compra compra = comprar(new BigDecimal("33.00"), 10, 1);
        String antes = datos.nombreEnPedido(compra.pedido(), compra.producto());
        String categoria = datos.crearCategoria();
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));

        ClienteHttp.Respuesta respuesta = vendedor.putJson("/api/productos/" + compra.producto(),
                ficha("Mouse M170 renovado", categoria, "https://cdn.ejemplo.pe/m170.webp"));

        assertEquals(200, respuesta.estado(), respuesta.toString());
        String publico = sesionDe(datos.crearCliente()).get("/api/productos/" + compra.producto()).cuerpo();
        assertTrue(publico.contains("\"nombre\":\"Mouse M170 renovado\""), publico);
        assertTrue(publico.contains("\"marca\":\"Logitech\""), publico);
        assertTrue(publico.contains("\"categoria\":\"" + categoria + "\""), publico);
        assertTrue(publico.contains("\"imagen\":\"https://cdn.ejemplo.pe/m170.webp\""), publico);
        assertEquals(antes, datos.nombreEnPedido(compra.pedido(), compra.producto()),
                "El detalle del pedido no cambia al editar la ficha");
    }

    @Test
    @DisplayName("Validaciones: categoría inexistente, nombre vacío o imagen no http(s) 400; producto inexistente 404")
    void validaciones() {
        long producto = datos.crearProducto(new BigDecimal("10.00"), 1);
        String categoria = datos.crearCategoria();
        ClienteHttp admin = sesionDe(datos.crearEmpleado("ADMIN"));
        String ruta = "/api/productos/" + producto;

        assertEquals(400, admin.putJson(ruta, ficha("Teclado", "No-existe-" + producto, null)).estado());
        assertEquals(400, admin.putJson(ruta, ficha(" ", categoria, null)).estado());
        assertEquals(400, admin.putJson(ruta, ficha("Teclado", categoria, "javascript:alert(1)")).estado());
        assertEquals(404, admin.putJson("/api/productos/999999999", ficha("Teclado", categoria, null)).estado());
        assertEquals(400, admin.patchJson(ruta + "/estado", "{}").estado(), "activo es obligatorio");
        assertEquals(404, admin.patchJson("/api/productos/999999999/estado", "{\"activo\":false}").estado());
    }

    @Test
    @DisplayName("RF16: desactivar lo saca del catálogo sin borrarlo; el personal lo ve y lo reactiva")
    void desactivarYReactivar() {
        long producto = datos.crearProducto(new BigDecimal("15.00"), 4);
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));
        ClienteHttp cliente = sesionDe(datos.crearCliente());
        String ruta = "/api/productos/" + producto;

        ClienteHttp.Respuesta desactivado = vendedor.patchJson(ruta + "/estado", "{\"activo\":false}");

        assertEquals(200, desactivado.estado(), desactivado.toString());
        assertTrue(desactivado.cuerpo().contains("\"activo\":false"), desactivado.cuerpo());
        assertEquals(404, cliente.get(ruta).estado(), "Fuera del catálogo público");
        assertFalse(cliente.get("/api/productos").cuerpo().contains("\"id\":" + producto + ","));
        assertEquals(4, datos.stock(producto), "No se borra: conserva su stock");
        String gestion = vendedor.get("/api/productos/gestion").cuerpo();
        assertTrue(gestion.contains("\"id\":" + producto + ","), "El personal ve los desactivados");

        assertEquals(200, vendedor.patchJson(ruta + "/estado", "{\"activo\":true}").estado());
        assertEquals(200, cliente.get(ruta).estado(), "Vuelve al catálogo");
    }
}
