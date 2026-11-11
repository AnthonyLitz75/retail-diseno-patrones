package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.Callable;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Spec 004, US5 (T013): las transiciones de estado son atómicas. Cuando dos operaciones
 * compiten por el mismo pedido, solo una transición es válida y la otra recibe 409, y el
 * pedido queda coherente con la transición ganadora.
 */
class TransicionesConcurrentesTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("210.00");
    private static final int STOCK_INICIAL = 8;
    private static final int CANTIDAD = 2;
    /** La carrera se repite para que ambos órdenes de llegada tengan ocasión de ocurrir. */
    private static final int REPETICIONES = 5;

    @Test
    @DisplayName("US5.1: preparar y cancelar a la vez; solo una transición es válida")
    void prepararContraCancelar() throws Exception {
        DatosIntegracion.Cliente almacenero = datos.crearEmpleado("ALMACEN");
        for (int i = 0; i < REPETICIONES; i++) {
            Compra compra = comprar(PRECIO, STOCK_INICIAL, CANTIDAD);
            ClienteHttp almacen = sesionDe(almacenero);
            ClienteHttp cliente = sesionDe(compra.cliente());
            List<Callable<ClienteHttp.Respuesta>> carrera = List.of(
                    () -> almacen.put("/api/pedidos/" + compra.pedido() + "/preparar"),
                    () -> cliente.put("/api/pedidos/" + compra.pedido() + "/cancelar"));

            List<ClienteHttp.Respuesta> respuestas = enParalelo(carrera);

            assertEquals(1, respuestas.stream().filter(r -> r.estado() == 204).count(),
                    "Exactamente una transición gana: " + respuestas);
            assertEquals(1, respuestas.stream().filter(r -> r.estado() == 409).count(),
                    "La otra recibe 409: " + respuestas);
            String estadoFinal = datos.estadoPedido(compra.pedido());
            if ("EN_PREPARACION".equals(estadoFinal)) {
                assertEquals(204, respuestas.get(0).estado());
                assertEquals(STOCK_INICIAL - CANTIDAD, datos.stock(compra.producto()));
                assertEquals(1, datos.pagosEnEstado(compra.pedido(), "APROBADO"));
                assertEquals(0, datos.movimientosDeTipo(compra.producto(), "CANCELACION"));
                assertEquals(0, datos.historialDe(compra.pedido(), "CANCELADO"));
            } else {
                assertEquals("CANCELADO", estadoFinal);
                assertEquals(204, respuestas.get(1).estado());
                assertEquals(STOCK_INICIAL, datos.stock(compra.producto()));
                assertEquals(1, datos.pagosEnEstado(compra.pedido(), "REVERSADO"));
                assertEquals(0, datos.historialDe(compra.pedido(), "EN_PREPARACION"));
            }
        }
    }

    @Test
    @DisplayName("US5.1: dos operarios preparan el mismo pedido; uno lo logra y el otro recibe 409")
    void dosOperariosPreparanAlaVez() throws Exception {
        DatosIntegracion.Cliente almacenero = datos.crearEmpleado("ALMACEN");
        Compra compra = comprar(PRECIO, STOCK_INICIAL, CANTIDAD);
        ClienteHttp operario1 = sesionDe(almacenero);
        ClienteHttp operario2 = sesionDe(almacenero);
        String ruta = "/api/pedidos/" + compra.pedido() + "/preparar";

        List<ClienteHttp.Respuesta> respuestas = enParalelo(List.of(
                () -> operario1.put(ruta), () -> operario2.put(ruta)));

        assertEquals(1, respuestas.stream().filter(r -> r.estado() == 204).count(), respuestas.toString());
        assertEquals(1, respuestas.stream().filter(r -> r.estado() == 409).count(), respuestas.toString());
        assertEquals("EN_PREPARACION", datos.estadoPedido(compra.pedido()));
        assertEquals(1, datos.historialDe(compra.pedido(), "EN_PREPARACION"));
    }

    @Test
    @DisplayName("Flujo completo de almacén: preparar, despachar y entregar dejan un historial por paso")
    void flujoCompletoDeAlmacen() {
        DatosIntegracion.Cliente almacenero = datos.crearEmpleado("ALMACEN");
        Compra compra = comprar(PRECIO, STOCK_INICIAL, CANTIDAD);
        ClienteHttp almacen = sesionDe(almacenero);
        String base = "/api/pedidos/" + compra.pedido();

        // State: no se puede despachar ni entregar un pedido que no se ha preparado.
        assertEquals(409, almacen.putJson(base + "/despachar",
                "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"X\"}").estado());
        assertEquals(409, almacen.put(base + "/entregar").estado());

        assertEquals(204, almacen.put(base + "/preparar").estado());
        String codigo = "OLV-" + compra.pedido() + "-" + System.nanoTime();
        assertEquals(204, almacen.putJson(base + "/despachar",
                "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"" + codigo + "\"}").estado());
        assertEquals(204, almacen.put(base + "/entregar").estado());
        // Un estado terminal no admite repetir la entrega.
        assertEquals(409, almacen.put(base + "/entregar").estado());

        assertEquals("ENTREGADO", datos.estadoPedido(compra.pedido()));
        assertEquals(1, datos.historialDe(compra.pedido(), "EN_PREPARACION"));
        assertEquals(1, datos.historialDe(compra.pedido(), "DESPACHADO"));
        assertEquals(1, datos.historialDe(compra.pedido(), "ENTREGADO"));
        assertEquals(1, datos.enviosEntregados(compra.pedido()));
    }
}
