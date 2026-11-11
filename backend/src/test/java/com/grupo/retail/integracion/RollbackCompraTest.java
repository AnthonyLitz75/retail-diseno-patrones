package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Spec 004, US3 (T006 y T007): la compra es todo o nada. Un fallo después de insertar
 * el pedido, o un pago rechazado, no deja pedido, detalle, pago, movimientos ni
 * descuento de stock, y el carrito sigue activo.
 */
class RollbackCompraTest extends BaseCompraIntegracion {

    /** Precio exclusivo de esta prueba: el trigger solo falla con este monto. */
    private static final BigDecimal MONTO_QUE_FALLA = new BigDecimal("777.77");

    @Test
    @DisplayName("US3.1: un fallo forzado tras insertar el pedido revierte toda la compra")
    void falloTrasInsertarPedidoRevierteTodo() {
        long producto = datos.crearProducto(MONTO_QUE_FALLA, 5);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        long carrito = datos.crearCarritoActivo(cliente.id(), Map.of(producto, 1));
        ClienteHttp sesion = sesionDe(cliente);

        // El pago se inserta después del pedido, el detalle, el descuento de stock y el
        // movimiento: si falla ahí, todo lo anterior debe deshacerse.
        datos.ejecutar("""
                CREATE OR REPLACE FUNCTION prueba_forzar_fallo_pago() RETURNS trigger AS $$
                BEGIN
                    IF NEW.monto = 777.77 THEN
                        RAISE EXCEPTION 'Fallo forzado por RollbackCompraTest';
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql
                """);
        datos.ejecutar("""
                CREATE TRIGGER prueba_forzar_fallo_pago BEFORE INSERT ON pago
                FOR EACH ROW EXECUTE FUNCTION prueba_forzar_fallo_pago()
                """);
        ClienteHttp.Respuesta respuesta;
        try {
            respuesta = sesion.confirmarCompra("PRUEBA_APROBADA", null);
        } finally {
            datos.ejecutar("DROP TRIGGER IF EXISTS prueba_forzar_fallo_pago ON pago");
            datos.ejecutar("DROP FUNCTION IF EXISTS prueba_forzar_fallo_pago()");
        }

        assertEquals(500, respuesta.estado(), respuesta.toString());
        assertEquals(0, datos.pedidosDe(cliente.id()), "No debe quedar pedido");
        assertEquals(0, datos.unidadesVendidas(producto), "No debe quedar detalle");
        assertEquals(0, datos.pagosDe(cliente.id()), "No debe quedar pago");
        assertEquals(0, datos.movimientosDe(producto), "No debe quedar movimiento de inventario");
        assertEquals(5, datos.stock(producto), "El stock no cambia");
        assertEquals("ACTIVO", datos.estadoCarrito(carrito));
        assertEquals(1, datos.lineasCarrito(carrito), "El carrito conserva su línea");
    }

    @Test
    @DisplayName("US3.2: un pago rechazado no crea pedido ni descuenta stock")
    void pagoRechazadoNoTieneEfectos() {
        long producto = datos.crearProducto(new BigDecimal("35.50"), 4);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        long carrito = datos.crearCarritoActivo(cliente.id(), Map.of(producto, 2));

        ClienteHttp.Respuesta respuesta = sesionDe(cliente).confirmarCompra("PRUEBA_RECHAZADA", null);

        assertEquals(402, respuesta.estado(), respuesta.toString());
        assertEquals(0, datos.pedidosDe(cliente.id()));
        assertEquals(0, datos.movimientosDe(producto));
        assertEquals(4, datos.stock(producto));
        assertEquals("ACTIVO", datos.estadoCarrito(carrito));
        assertEquals(1, datos.lineasCarrito(carrito));
    }
}
