package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 007, T013 (US3) con PostgreSQL y HTTP reales: una entrada de mercadería admite hasta
 * 100 productos por lote; con 101 se rechaza entera y no cambia ningún stock.
 */
class LoteInventarioTest extends BaseCompraIntegracion {

    private List<Long> productos(int cantidad) {
        List<Long> ids = new ArrayList<>();
        for (int i = 0; i < cantidad; i++) {
            ids.add(datos.crearProducto(new BigDecimal("5.00"), 1));
        }
        return ids;
    }

    private static String lote(List<Long> ids) {
        return "{\"motivo\":\"Reposición de prueba\",\"productos\":["
                + ids.stream().map(id -> "{\"productoId\":" + id + ",\"cantidad\":2}").collect(Collectors.joining(","))
                + "]}";
    }

    @Test
    @DisplayName("US3: un lote de 100 productos se registra completo")
    void loteDeCien() {
        List<Long> ids = productos(100);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));

        ClienteHttp.Respuesta respuesta = almacen.postJson("/api/inventario/entradas", lote(ids));

        assertEquals(201, respuesta.estado(), respuesta.toString());
        assertTrue(ids.stream().allMatch(id -> datos.stock(id) == 3));
        assertTrue(ids.stream().allMatch(id -> datos.movimientosDeTipo(id, "ENTRADA") == 1));
    }

    @Test
    @DisplayName("US3: un lote de 101 productos se rechaza entero con mensaje claro")
    void loteDeCientoUno() {
        List<Long> ids = productos(101);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));

        ClienteHttp.Respuesta respuesta = almacen.postJson("/api/inventario/entradas", lote(ids));

        assertEquals(400, respuesta.estado(), respuesta.toString());
        assertTrue(respuesta.cuerpo().contains("No se pueden registrar más de 100 productos por lote"), respuesta.cuerpo());
        assertEquals(0, ids.stream().filter(id -> datos.stock(id) != 1).count(), "Ningún stock cambió");
    }
}
