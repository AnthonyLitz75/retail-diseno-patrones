package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Spec 004, T014b: regresión del spec inicial 001 (envíos y trazabilidad) con base de
 * datos real, después de migrar las transiciones de almacén al ejecutor de transacciones.
 */
class EnvioRegresionTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("99.00");

    @Test
    @DisplayName("Despachar con transportista o código vacío responde 400 y no crea envío")
    void despachoConDatosVaciosResponde400() {
        Compra compra = comprar(PRECIO, 5, 1);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));
        String base = "/api/pedidos/" + compra.pedido();
        assertEquals(204, almacen.put(base + "/preparar").estado());

        assertEquals(400, almacen.putJson(base + "/despachar",
                "{\"transportista\":\"  \",\"codigoSeguimiento\":\"OLV-1\"}").estado());
        assertEquals(400, almacen.putJson(base + "/despachar",
                "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"\"}").estado());

        assertEquals("EN_PREPARACION", datos.estadoPedido(compra.pedido()));
        assertEquals(0, datos.enviosDe(compra.pedido()));
    }

    @Test
    @DisplayName("Un cliente o un vendedor no pueden despachar ni entregar (403)")
    void clienteYVendedorNoDespachanNiEntregan() {
        Compra compra = comprar(PRECIO, 5, 1);
        ClienteHttp cliente = sesionDe(compra.cliente());
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));
        String base = "/api/pedidos/" + compra.pedido();
        datos.forzarEstadoPedido(compra.pedido(), "EN_PREPARACION");
        String cuerpo = "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"OLV-403\"}";

        for (ClienteHttp sinPermiso : new ClienteHttp[] {cliente, vendedor}) {
            assertEquals(403, sinPermiso.putJson(base + "/despachar", cuerpo).estado());
            assertEquals(403, sinPermiso.put(base + "/entregar").estado());
        }
        assertEquals("EN_PREPARACION", datos.estadoPedido(compra.pedido()));
        assertEquals(0, datos.enviosDe(compra.pedido()));
    }

    @Test
    @DisplayName("Un cliente no ve el pedido ni el envío de otro cliente (404)")
    void clienteNoVeEnvioAjeno() {
        Compra compra = comprar(PRECIO, 5, 1);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));
        String base = "/api/pedidos/" + compra.pedido();
        almacen.put(base + "/preparar");
        almacen.putJson(base + "/despachar",
                "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"OLV-AJENO-" + compra.pedido() + "\"}");

        ClienteHttp.Respuesta ajena = sesionDe(datos.crearCliente()).get(base);
        ClienteHttp.Respuesta propia = sesionDe(compra.cliente()).get(base);

        assertEquals(404, ajena.estado(), ajena.toString());
        assertFalse(ajena.cuerpo().contains("OLV-AJENO"), "No debe exponer el código de seguimiento");
        assertEquals(200, propia.estado(), propia.toString());
    }

    @Test
    @DisplayName("Despacho y entrega dejan al operario responsable en el historial")
    void despachoYEntregaRegistranResponsable() {
        Compra compra = comprar(PRECIO, 5, 1);
        DatosIntegracion.Cliente almacenero = datos.crearEmpleado("ALMACEN");
        ClienteHttp almacen = sesionDe(almacenero);
        String base = "/api/pedidos/" + compra.pedido();

        assertEquals(204, almacen.put(base + "/preparar").estado());
        assertEquals(204, almacen.putJson(base + "/despachar",
                "{\"transportista\":\"Shalom\",\"codigoSeguimiento\":\"SHA-" + compra.pedido() + "\"}").estado());
        assertEquals(204, almacen.put(base + "/entregar").estado());

        assertEquals(almacenero.id(), datos.responsableDe(compra.pedido(), "EN_PREPARACION"));
        assertEquals(almacenero.id(), datos.responsableDe(compra.pedido(), "DESPACHADO"));
        assertEquals(almacenero.id(), datos.responsableDe(compra.pedido(), "ENTREGADO"));
        assertEquals(compra.cliente().id(), datos.responsableDe(compra.pedido(), "PENDIENTE"),
                "La creación del pedido queda a nombre del cliente");
    }

    @Test
    @DisplayName("Un código de seguimiento repetido responde 409 y no despacha el segundo pedido")
    void codigoDeSeguimientoRepetidoResponde409() {
        Compra primera = comprar(PRECIO, 5, 1);
        Compra segunda = comprar(PRECIO, 5, 1);
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));
        String codigo = "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"OLV-DUP-" + primera.pedido() + "\"}";
        almacen.put("/api/pedidos/" + primera.pedido() + "/preparar");
        almacen.put("/api/pedidos/" + segunda.pedido() + "/preparar");

        assertEquals(204, almacen.putJson("/api/pedidos/" + primera.pedido() + "/despachar", codigo).estado());
        assertEquals(409, almacen.putJson("/api/pedidos/" + segunda.pedido() + "/despachar", codigo).estado());

        assertEquals("EN_PREPARACION", datos.estadoPedido(segunda.pedido()),
                "El rollback deja el segundo pedido como estaba");
        assertEquals(0, datos.historialDe(segunda.pedido(), "DESPACHADO"));
    }
}
