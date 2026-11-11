package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 004, US2 (T003 y T004): la última unidad se vende una sola vez y el stock nunca
 * queda negativo, aunque varios clientes confirmen a la vez.
 */
class CompraConcurrenteTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("49.90");

    @Test
    @DisplayName("US2.1: dos clientes compran la última unidad; uno confirma y el otro recibe 409")
    void ultimaUnidadSeVendeUnaSolaVez() throws Exception {
        long producto = datos.crearProducto(PRECIO, 1);
        List<Callable<ClienteHttp.Respuesta>> compras = comprasDeUnaUnidad(producto, 2);

        List<ClienteHttp.Respuesta> respuestas = enParalelo(compras);

        assertEquals(1, contar(respuestas, 201), "Debe confirmarse exactamente una compra: " + respuestas);
        assertEquals(1, contar(respuestas, 409), "La compra perdedora debe recibir 409: " + respuestas);
        assertEquals(0, datos.stock(producto));
        assertEquals(1, datos.unidadesVendidas(producto));
    }

    @Test
    @DisplayName("US2.2: 20 compras simultáneas sobre stock 10 confirman exactamente 10 unidades")
    void veinteComprasSobreStockDiez() throws Exception {
        long producto = datos.crearProducto(PRECIO, 10);
        List<Callable<ClienteHttp.Respuesta>> compras = comprasDeUnaUnidad(producto, 20);

        List<ClienteHttp.Respuesta> respuestas = enParalelo(compras);

        assertEquals(10, contar(respuestas, 201), "Deben confirmarse 10 compras: " + respuestas);
        assertEquals(10, contar(respuestas, 409), "Las 10 restantes deben recibir 409: " + respuestas);
        assertEquals(0, datos.stock(producto), "El stock final debe ser 0, nunca negativo");
        assertEquals(10, datos.unidadesVendidas(producto));
    }

    @Test
    @DisplayName("T004: carritos con los mismos productos en orden distinto no producen interbloqueo")
    void bloqueoCruzadoSinInterbloqueo() throws Exception {
        long productoA = datos.crearProducto(PRECIO, 50);
        long productoB = datos.crearProducto(PRECIO, 50);
        List<Callable<ClienteHttp.Respuesta>> compras = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            DatosIntegracion.Cliente cliente = datos.crearCliente();
            // La mitad agrega A y luego B; la otra mitad, B y luego A.
            Map<Long, Integer> lineas = i % 2 == 0
                    ? new java.util.LinkedHashMap<>(Map.of(productoA, 1))
                    : new java.util.LinkedHashMap<>(Map.of(productoB, 1));
            lineas.put(i % 2 == 0 ? productoB : productoA, 1);
            datos.crearCarritoActivo(cliente.id(), lineas);
            ClienteHttp sesion = sesionDe(cliente);
            compras.add(() -> sesion.confirmarCompra("PRUEBA_APROBADA", null));
        }

        List<ClienteHttp.Respuesta> respuestas = enParalelo(compras);

        assertEquals(10, contar(respuestas, 201), "Todas deben confirmarse sin interbloqueo: " + respuestas);
        assertEquals(40, datos.stock(productoA));
        assertEquals(40, datos.stock(productoB));
    }

    private List<Callable<ClienteHttp.Respuesta>> comprasDeUnaUnidad(long producto, int clientes) {
        List<Callable<ClienteHttp.Respuesta>> compras = new ArrayList<>();
        for (int i = 0; i < clientes; i++) {
            DatosIntegracion.Cliente cliente = datos.crearCliente();
            datos.crearCarritoActivo(cliente.id(), Map.of(producto, 1));
            // La sesión se abre antes de la barrera: solo la confirmación compite.
            ClienteHttp sesion = sesionDe(cliente);
            compras.add(() -> sesion.confirmarCompra("PRUEBA_APROBADA", null));
        }
        return compras;
    }

    private static long contar(List<ClienteHttp.Respuesta> respuestas, int estado) {
        long total = respuestas.stream().filter(r -> r.estado() == estado).count();
        assertTrue(respuestas.stream().noneMatch(r -> r.estado() >= 500),
                "Ninguna compra debe fallar con error de servidor: " + respuestas);
        return total;
    }
}
