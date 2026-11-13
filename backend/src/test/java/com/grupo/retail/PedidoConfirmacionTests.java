package com.grupo.retail;

import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dto.SolicitudConfirmarPedido;
import com.grupo.retail.exception.ClaveConfirmacionEnUsoException;
import com.grupo.retail.exception.PagoRechazadoException;
import com.grupo.retail.exception.StockInsuficienteException;
import com.grupo.retail.patterns.facade.CheckoutFacade;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.ProductoEnCompra;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.adapter.PuertoPago;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.transaccion.EjecutorTransaccion;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.math.BigDecimal;
import java.sql.Connection;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

class PedidoConfirmacionTests {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private PedidoDAO dao;
    private InventarioDAO inventario;
    private PuertoPago puerto;
    private Connection conexion;
    private PublicadorEventosPedido publicador;
    private CheckoutFacade facade;

    @BeforeEach
    void setUp() throws Exception {
        dao = mock(PedidoDAO.class);
        inventario = mock(InventarioDAO.class);
        // Por defecto el stock alcanza; las pruebas de carrera lo cambian.
        when(inventario.descontarStock(any(), anyLong(), anyInt())).thenReturn(true);
        puerto = mock(PuertoPago.class);
        conexion = mock(Connection.class);
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        // Ejecutor real sobre una conexión simulada: se verifica commit y rollback.
        publicador = mock(PublicadorEventosPedido.class);
        facade = new CheckoutFacade(dao, inventario, puerto, new EjecutorTransaccion(proveedor), publicador);
    }

    @Test
    void solicitudConfirmarPedidoValidaUUIDYLongitudes() {
        String uuidValido = UUID.randomUUID().toString();
        var valida = new SolicitudConfirmarPedido(
                "PRUEBA_APROBADA", uuidValido, "Juan Pérez", "Av. Javier Prado 1234");
        assertTrue(validator.validate(valida).isEmpty());

        // Clave vacía o nula es permitida para retrocompatibilidad
        var sinClave = new SolicitudConfirmarPedido("PRUEBA_APROBADA", null, null, null);
        assertTrue(validator.validate(sinClave).isEmpty());

        // UUID inválido
        var uuidInvalido = new SolicitudConfirmarPedido("PRUEBA_APROBADA", "invalido-123", null, null);
        assertFalse(validator.validate(uuidInvalido).isEmpty());

        // Destinatario superior a 120 caracteres
        var destinatarioLargo = new SolicitudConfirmarPedido(
                "PRUEBA_APROBADA", uuidValido, "A".repeat(121), "Dirección válida");
        assertFalse(validator.validate(destinatarioLargo).isEmpty());

        // Dirección superior a 250 caracteres
        var direccionLarga = new SolicitudConfirmarPedido(
                "PRUEBA_APROBADA", uuidValido, "Juan Pérez", "D".repeat(251));
        assertFalse(validator.validate(direccionLarga).isEmpty());

        // Método de pago no soportado
        var metodoInvalido = new SolicitudConfirmarPedido("OTRO_METODO", uuidValido, null, null);
        assertFalse(validator.validate(metodoInvalido).isEmpty());
    }

    @Test
    void checkoutFacadeOrquestaLaCompraEnUnaSolaTransaccion() throws Exception {
        String clave = UUID.randomUUID().toString();
        ProductoEnCompra mouse = new ProductoEnCompra(1L, "Mouse", new BigDecimal("50.00"), 10, true, 2);
        ProductoEnCompra teclado = new ProductoEnCompra(2L, "Teclado", new BigDecimal("80.50"), 5, true, 1);
        ResultadoPago aprobado = new ResultadoPago(true, "SIMULADO", "APROBADO", "REF-1", "OK");
        PedidoConfirmado esperado = pedido(10L, clave);
        when(dao.buscarPorClaveConfirmacion(conexion, 5L, clave)).thenReturn(Optional.empty());
        when(dao.claveConfirmacionRegistrada(conexion, clave)).thenReturn(false);
        when(dao.bloquearCarritoActivo(conexion, 5L)).thenReturn(77L);
        when(dao.leerYBloquearProductos(conexion, 77L)).thenReturn(List.of(mouse, teclado));
        when(puerto.procesar(new BigDecimal("180.50"), "PRUEBA_APROBADA")).thenReturn(aprobado);
        when(dao.registrarCompra(conexion, 5L, new BigDecimal("180.50"), aprobado,
                List.of(mouse, teclado), 77L, clave, "Juan", "Av. Perú 123")).thenReturn(esperado);

        PedidoConfirmado resultado = facade.confirmarCompra(
                5L, " PRUEBA_APROBADA ", " " + clave + " ", " Juan ", "Av. Perú 123");

        assertSame(esperado, resultado);
        // Todos los pasos usan la misma conexión: el cliente se bloquea antes de leer la clave.
        InOrder orden = inOrder(dao, puerto, conexion);
        orden.verify(conexion).setAutoCommit(false);
        orden.verify(dao).bloquearClienteParaCompra(conexion, 5L);
        orden.verify(dao).buscarPorClaveConfirmacion(conexion, 5L, clave);
        orden.verify(dao).bloquearCarritoActivo(conexion, 5L);
        orden.verify(puerto).procesar(new BigDecimal("180.50"), "PRUEBA_APROBADA");
        orden.verify(dao).registrarCompra(any(), anyLong(), any(), any(), any(), anyLong(), any(), any(), any());
        orden.verify(conexion).commit();
        // Inventario: cada línea descuenta su stock y deja un movimiento SALIDA ligado al pedido.
        verify(inventario).descontarStock(conexion, 1L, 2);
        verify(inventario).descontarStock(conexion, 2L, 1);
        var movimientos = org.mockito.ArgumentCaptor.forClass(RegistroMovimiento.class);
        verify(inventario, org.mockito.Mockito.times(2)).registrarMovimiento(eq(conexion), movimientos.capture());
        assertEquals(List.of(-2, -1), movimientos.getAllValues().stream().map(RegistroMovimiento::cantidadFirmada).toList());
        assertEquals(List.of(10L, 10L), movimientos.getAllValues().stream().map(RegistroMovimiento::pedidoId).toList());
        assertEquals(RegistroMovimiento.TipoMovimiento.SALIDA, movimientos.getValue().tipo());
        verify(conexion, never()).rollback();

        // Observer: la confirmación publica el evento de creación con la conexión de la compra.
        var evento = org.mockito.ArgumentCaptor.forClass(EventoPedido.class);
        verify(publicador).publicar(eq(conexion), evento.capture());
        assertEquals(10L, evento.getValue().pedidoId());
        assertEquals(5L, evento.getValue().clienteId());
        assertNull(evento.getValue().estadoAnterior());
        assertEquals("PENDIENTE", evento.getValue().estadoNuevo());
    }

    @Test
    void checkoutFacadeDevuelveElPedidoExistenteSinTocarCarritoNiPago() throws Exception {
        String clave = UUID.randomUUID().toString();
        PedidoConfirmado existente = pedido(99L, clave);
        when(dao.buscarPorClaveConfirmacion(conexion, 7L, clave)).thenReturn(Optional.of(existente));

        PedidoConfirmado resultado = facade.confirmarCompra(7L, "PRUEBA_APROBADA", clave, null, null);

        assertSame(existente, resultado);
        verify(dao, never()).bloquearCarritoActivo(any(), anyLong());
        verifyNoInteractions(puerto, publicador); // un reintento no vuelve a notificar
        verify(conexion).commit();
    }

    @Test
    void checkoutFacadeRechazaLaClaveDeOtroClienteCon409() throws Exception {
        String clave = UUID.randomUUID().toString();
        when(dao.buscarPorClaveConfirmacion(conexion, 7L, clave)).thenReturn(Optional.empty());
        when(dao.claveConfirmacionRegistrada(conexion, clave)).thenReturn(true);

        assertThrows(ClaveConfirmacionEnUsoException.class,
                () -> facade.confirmarCompra(7L, "PRUEBA_APROBADA", clave, null, null));

        verify(dao, never()).bloquearCarritoActivo(any(), anyLong());
        verifyNoInteractions(puerto);
        verify(conexion).rollback();
    }

    @Test
    void checkoutFacadeRechazaStockInsuficienteSinCobrar() throws Exception {
        when(dao.bloquearCarritoActivo(conexion, 3L)).thenReturn(8L);
        when(dao.leerYBloquearProductos(conexion, 8L)).thenReturn(List.of(
                new ProductoEnCompra(1L, "Monitor", new BigDecimal("900.00"), 1, true, 2)));

        StockInsuficienteException error = assertThrows(StockInsuficienteException.class,
                () -> facade.confirmarCompra(3L, "PRUEBA_APROBADA"));

        assertTrue(error.getMessage().contains("Monitor"));
        verifyNoInteractions(puerto);
        verify(conexion).rollback();
    }

    @Test
    void checkoutFacadeRechazaCarritoVacioYProductoInactivo() throws Exception {
        when(dao.bloquearCarritoActivo(conexion, 3L)).thenReturn(8L);
        when(dao.leerYBloquearProductos(conexion, 8L)).thenReturn(List.of());
        assertThrows(IllegalArgumentException.class, () -> facade.confirmarCompra(3L, "PRUEBA_APROBADA"));

        when(dao.leerYBloquearProductos(conexion, 8L)).thenReturn(List.of(
                new ProductoEnCompra(1L, "Parlante", new BigDecimal("40.00"), 9, false, 1)));
        assertThrows(IllegalArgumentException.class, () -> facade.confirmarCompra(3L, "PRUEBA_APROBADA"));
        verifyNoInteractions(puerto);
    }

    @Test
    void checkoutFacadeRevierteSiElPagoEsRechazado() throws Exception {
        when(dao.bloquearCarritoActivo(conexion, 3L)).thenReturn(8L);
        when(dao.leerYBloquearProductos(conexion, 8L)).thenReturn(List.of(
                new ProductoEnCompra(1L, "Mouse", new BigDecimal("50.00"), 9, true, 1)));
        when(puerto.procesar(any(), any())).thenReturn(
                new ResultadoPago(false, "SIMULADO", "RECHAZADO", "REF-X", "Pago rechazado por el banco simulado"));

        assertThrows(PagoRechazadoException.class, () -> facade.confirmarCompra(3L, "PRUEBA_RECHAZADA"));

        verify(dao, never()).registrarCompra(any(), anyLong(), any(), any(), any(), anyLong(), any(), any(), any());
        verify(conexion).rollback();
    }

    @Test
    void checkoutFacadeRechazaUsuarioNuloOMetodoPagoInvalido() {
        assertThrows(IllegalArgumentException.class,
                () -> facade.confirmarCompra(null, "PRUEBA_APROBADA"));
        assertThrows(IllegalArgumentException.class,
                () -> facade.confirmarCompra(1L, "   "));
        assertThrows(IllegalArgumentException.class,
                () -> facade.confirmarCompra(1L, null));
        verifyNoInteractions(dao, puerto);
    }

    @Test
    void productoEnCompraCalculaSuSubtotal() {
        assertEquals(new BigDecimal("150.00"),
                new ProductoEnCompra(1L, "Mouse", new BigDecimal("50.00"), 9, true, 3).subtotal());
    }

    private static PedidoConfirmado pedido(long id, String clave) {
        return new PedidoConfirmado(
                id, "PENDIENTE", BigDecimal.valueOf(100), OffsetDateTime.now(),
                "SIMULADO", "APROBADO", "REF-" + id, List.of(), clave, "Juan", "Av. Perú 123");
    }
}
