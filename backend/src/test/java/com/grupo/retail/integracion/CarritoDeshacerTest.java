package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Spec 005, T012 (US4, US5, US6, SC-003) con PostgreSQL y HTTP reales:
 * {@code POST /api/carrito/deshacer} restaura exactamente el estado previo de las tres
 * acciones, exige que la revisión del carrito no haya cambiado y respeta sus límites.
 */
class CarritoDeshacerTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("25.00");

    @Test
    @DisplayName("US4.1: deshacer una eliminación devuelve el producto con sus 2 unidades y sube la revisión")
    void deshacerEliminacion() {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        sesion.agregarAlCarrito(producto, 2);
        assertEquals(204, sesion.quitarDelCarrito(producto).estado());
        int revisionAntes = datos.revisionCarrito(cliente.id());

        ClienteHttp.Respuesta respuesta = sesion.deshacerCarrito();

        assertEquals(200, respuesta.estado(), respuesta.toString());
        assertTrue(respuesta.cuerpo().contains("\"revision\":" + (revisionAntes + 1)), respuesta.cuerpo());
        assertEquals(2, datos.cantidadEnCarrito(cliente.id(), producto));
        assertEquals(revisionAntes + 1, datos.revisionCarrito(cliente.id()));
    }

    @Test
    @DisplayName("US5: deshacer un cambio de cantidad vuelve a 1 y deshacer un agregado lo retira")
    void deshacerCambioYAgregado() {
        long b = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        sesion.agregarAlCarrito(b, 1);
        sesion.cambiarCantidad(b, 5);

        assertEquals(200, sesion.deshacerCarrito().estado());
        assertEquals(1, datos.cantidadEnCarrito(cliente.id(), b), "Deshacer el cambio vuelve a 1");
        assertEquals(200, sesion.deshacerCarrito().estado());
        assertEquals(0, datos.cantidadEnCarrito(cliente.id(), b), "Deshacer el agregado lo retira");
    }

    @Test
    @DisplayName("SC-003: tres acciones distintas se deshacen en orden inverso hasta el estado inicial")
    void tresAccionesSeDeshacenEnOrdenInverso() {
        long a = datos.crearProducto(PRECIO, 10);
        long b = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        sesion.agregarAlCarrito(a, 2);
        sesion.agregarAlCarrito(b, 1);
        int revisionInicial = datos.revisionCarrito(cliente.id());

        sesion.agregarAlCarrito(a, 3);      // A: 2 -> 5
        sesion.cambiarCantidad(b, 4);       // B: 1 -> 4
        sesion.quitarDelCarrito(a);         // A: 5 -> 0

        sesion.deshacerCarrito();
        assertEquals(5, datos.cantidadEnCarrito(cliente.id(), a));
        sesion.deshacerCarrito();
        assertEquals(1, datos.cantidadEnCarrito(cliente.id(), b));
        sesion.deshacerCarrito();
        assertEquals(2, datos.cantidadEnCarrito(cliente.id(), a));
        assertEquals(revisionInicial + 6, datos.revisionCarrito(cliente.id()),
                "Cada cambio y cada deshacer incrementan la revisión");
    }

    @Test
    @DisplayName("US6.2: con el historial vacío responde 400 'No hay acciones para deshacer'")
    void historialVacioResponde400() {
        ClienteHttp sesion = sesionDe(datos.crearCliente());

        ClienteHttp.Respuesta respuesta = sesion.deshacerCarrito();

        assertEquals(400, respuesta.estado(), respuesta.toString());
        assertTrue(respuesta.cuerpo().contains("No hay acciones para deshacer"), respuesta.cuerpo());
    }

    @Test
    @DisplayName("US6.1: si el carrito cambió en otra sesión, deshacer responde 409 y no cambia nada")
    void revisionCambiadaResponde409() {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp pestania = sesionDe(cliente);
        ClienteHttp otroDispositivo = sesionDe(cliente);
        pestania.agregarAlCarrito(producto, 1);
        otroDispositivo.cambiarCantidad(producto, 3);

        ClienteHttp.Respuesta respuesta = pestania.deshacerCarrito();

        assertEquals(409, respuesta.estado(), respuesta.toString());
        assertTrue(respuesta.cuerpo().contains("El carrito cambió"), respuesta.cuerpo());
        assertEquals(3, datos.cantidadEnCarrito(cliente.id(), producto), "Nada cambia");
    }

    @Test
    @DisplayName("H1: tras un 409 por producto no disponible se descarta esa acción y se puede seguir deshaciendo")
    void trasUn409PorProductoSeSigueDeshaciendo() {
        long desactivado = datos.crearProducto(PRECIO, 10);
        long activo = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        sesion.agregarAlCarrito(desactivado, 2);
        sesion.agregarAlCarrito(activo, 1);
        sesion.cambiarCantidad(activo, 3);
        sesion.quitarDelCarrito(desactivado);
        datos.desactivarProducto(desactivado);

        ClienteHttp.Respuesta fallido = sesion.deshacerCarrito();
        ClienteHttp.Respuesta siguiente = sesion.deshacerCarrito();

        assertEquals(409, fallido.estado(), fallido.toString());
        assertTrue(fallido.cuerpo().contains("Se descartó esa acción"), fallido.cuerpo());
        assertEquals(200, siguiente.estado(), "La acción anterior se puede deshacer: " + siguiente);
        assertEquals(1, datos.cantidadEnCarrito(cliente.id(), activo), "Deshacer el cambio vuelve a 1");
        assertEquals(0, datos.cantidadEnCarrito(cliente.id(), desactivado));
    }

    @Test
    @DisplayName("US6.5: deshacer la eliminación de un producto desactivado responde 409 con el motivo")
    void productoDesactivadoResponde409() {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        sesion.agregarAlCarrito(producto, 2);
        sesion.quitarDelCarrito(producto);
        datos.desactivarProducto(producto);

        ClienteHttp.Respuesta respuesta = sesion.deshacerCarrito();

        assertEquals(409, respuesta.estado(), respuesta.toString());
        assertTrue(respuesta.cuerpo().contains("ya no está disponible"), respuesta.cuerpo());
        assertEquals(0, datos.cantidadEnCarrito(cliente.id(), producto));
    }

    @Test
    @DisplayName("US6.3: con más de 20 acciones solo se deshacen las 20 últimas")
    void soloSeDeshacenLasVeinteUltimas() {
        long producto = datos.crearProducto(PRECIO, 100);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        for (int cantidad = 1; cantidad <= 22; cantidad++) {
            if (cantidad == 1) {
                sesion.agregarAlCarrito(producto, 1);
            } else {
                sesion.cambiarCantidad(producto, cantidad);
            }
        }

        for (int i = 0; i < 20; i++) {
            assertEquals(200, sesion.deshacerCarrito().estado(), "deshacer #" + (i + 1));
        }
        assertEquals(400, sesion.deshacerCarrito().estado());
        assertEquals(2, datos.cantidadEnCarrito(cliente.id(), producto),
                "Quedan las 2 primeras acciones (agregar 1 y cambiar a 2), fuera del historial");
    }

    @Test
    @DisplayName("US6.4: confirmar la compra limpia el historial")
    void confirmarCompraLimpiaElHistorial() {
        long producto = datos.crearProducto(PRECIO, 10);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        ClienteHttp sesion = sesionDe(cliente);
        sesion.agregarAlCarrito(producto, 1);
        assertEquals(201, sesion.confirmarCompra("PRUEBA_APROBADA", null).estado());

        assertEquals(400, sesion.deshacerCarrito().estado());
    }

    @Test
    @DisplayName("Un vendedor no puede usar el deshacer del carrito (403)")
    void vendedorNoUsaDeshacer() {
        ClienteHttp vendedor = sesionDe(datos.crearEmpleado("VENDEDOR"));

        assertEquals(403, vendedor.deshacerCarrito().estado());
    }
}
