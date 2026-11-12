package com.grupo.retail;

import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.PagoDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.LineaReposicion;
import com.grupo.retail.model.PagoReembolsable;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.Producto;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.model.RegistroMovimiento.TipoMovimiento;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.pago.PuertoPago;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.service.ProductoService;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.sql.Connection;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Refactor de la revisión de buenas prácticas (puntos 1 a 3): los servicios son dueños de
 * la transacción y de las reglas; los DAO solo ejecutan SQL; el kardex se escribe solo por
 * {@link InventarioDAO#registrarMovimiento}.
 */
class TransaccionesEnServiciosTests {

    private final Connection conexion = mock(Connection.class);
    private final InventarioDAO inventario = mock(InventarioDAO.class);

    private EjecutorTransaccion ejecutor() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        return new EjecutorTransaccion(proveedor);
    }

    private static Producto mouse(int stock) {
        return new Producto(6L, "Mouse inalámbrico M170", "Mouse", new BigDecimal("49.00"), stock, true);
    }

    // ---------- Productos

    @Test
    void crearProductoConStockRegistraLaEntradaEnLaMismaTransaccion() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        NuevoProducto datos = new NuevoProducto("Mouse inalámbrico M170", "Mouse", new BigDecimal("49.00"), 12);
        when(productos.insertar(conexion, datos)).thenReturn(Optional.of(mouse(12)));

        new ProductoService(productos, mock(CategoriaDAO.class), inventario, ejecutor(), mock(AuditoriaService.class)).crearProducto(datos, 3L);

        ArgumentCaptor<RegistroMovimiento> movimiento = ArgumentCaptor.forClass(RegistroMovimiento.class);
        verify(inventario).registrarMovimiento(eq(conexion), movimiento.capture());
        assertEquals(TipoMovimiento.ENTRADA, movimiento.getValue().tipo());
        assertEquals(12, movimiento.getValue().cantidadFirmada());
        assertEquals(3L, movimiento.getValue().responsableId());
        verify(conexion).commit();
    }

    @Test
    void crearProductoSinStockNoEscribeEnElKardex() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        NuevoProducto datos = new NuevoProducto("Mouse", "Mouse", new BigDecimal("49.00"), 0);
        when(productos.insertar(conexion, datos)).thenReturn(Optional.of(mouse(0)));

        new ProductoService(productos, mock(CategoriaDAO.class), inventario, ejecutor(), mock(AuditoriaService.class)).crearProducto(datos, 3L);

        verifyNoInteractions(inventario);
    }

    @Test
    void crearProductoEnCategoriaInvalidaResponde400YRevierte() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        NuevoProducto datos = new NuevoProducto("Mouse", "No existe", new BigDecimal("49.00"), 5);
        when(productos.insertar(conexion, datos)).thenReturn(Optional.empty());
        ProductoService servicio = new ProductoService(productos, mock(CategoriaDAO.class), inventario, ejecutor(), mock(AuditoriaService.class));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.crearProducto(datos, 3L));

        assertEquals("La categoría seleccionada no existe o está inactiva", error.getMessage());
        verify(conexion).rollback();
        verifyNoInteractions(inventario);
    }

    @Test
    void ajustarStockRegistraLaDiferenciaComoAjuste() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        when(productos.bloquearActivo(conexion, 6L)).thenReturn(Optional.of(mouse(10)));

        Optional<Producto> resultado = new ProductoService(productos, mock(CategoriaDAO.class), inventario, ejecutor(), mock(AuditoriaService.class))
                .actualizarStock(6L, 7, "Conteo físico", 4L);

        assertEquals(7, resultado.orElseThrow().stock());
        verify(inventario).sumarStock(conexion, 6L, -3);
        ArgumentCaptor<RegistroMovimiento> movimiento = ArgumentCaptor.forClass(RegistroMovimiento.class);
        verify(inventario).registrarMovimiento(eq(conexion), movimiento.capture());
        assertEquals(TipoMovimiento.AJUSTE, movimiento.getValue().tipo());
        assertEquals(-3, movimiento.getValue().cantidadFirmada());
        verify(conexion).commit();
    }

    @Test
    void ajustarAlMismoStockNoEscribeNada() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        when(productos.bloquearActivo(conexion, 6L)).thenReturn(Optional.of(mouse(10)));

        Optional<Producto> resultado = new ProductoService(productos, mock(CategoriaDAO.class), inventario, ejecutor(), mock(AuditoriaService.class))
                .actualizarStock(6L, 10, "Sin cambios", 4L);

        assertEquals(10, resultado.orElseThrow().stock());
        verifyNoInteractions(inventario);
    }

    @Test
    void ajustarStockDeUnProductoInactivoDevuelveVacio() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        when(productos.bloquearActivo(conexion, 6L)).thenReturn(Optional.empty());

        assertTrue(new ProductoService(productos, mock(CategoriaDAO.class), inventario, ejecutor(), mock(AuditoriaService.class))
                .actualizarStock(6L, 3, "Conteo", 4L).isEmpty());
        verifyNoInteractions(inventario);
    }

    @Test
    void unMovimientoDeCeroUnidadesNoSePuedeConstruir() {
        assertThrows(IllegalArgumentException.class,
                () -> RegistroMovimiento.simple(6L, TipoMovimiento.AJUSTE, 0, "Nada", 1L));
    }

    // ---------- Cancelación

    private PedidoService pedidoService(PedidoDAO pedidos, PagoDAO pagos, PuertoPago puerto) throws Exception {
        return new PedidoService(pedidos, pagos, inventario, puerto, ejecutor(), mock(PublicadorEventosPedido.class));
    }

    private PagoDAO pagoAprobado() throws Exception {
        PagoDAO pagos = mock(PagoDAO.class);
        when(pagos.bloquearPagoAprobado(conexion, 91L)).thenReturn(Optional.of(
                new PagoReembolsable(7L, new BigDecimal("98.00"), BigDecimal.ZERO, "SIM-9")));
        when(pagos.marcarReversado(conexion, 7L)).thenReturn(true);
        return pagos;
    }

    private static PuertoPago reembolsoAceptado() {
        PuertoPago puerto = mock(PuertoPago.class);
        when(puerto.reembolsar(any(), any(), any()))
                .thenReturn(new ResultadoPago(true, "SIMULADO", "REEMBOLSADO", "REM-9", "ok"));
        return puerto;
    }

    @Test
    void cancelarReponeCadaLineaConUnMovimientoLigadoAlPedido() throws Exception {
        PedidoDAO pedidos = mock(PedidoDAO.class);
        when(pedidos.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        when(pedidos.bloquearLineasPedido(conexion, 91L)).thenReturn(List.of(
                new LineaReposicion(6L, 2), new LineaReposicion(9L, 1)));
        when(pedidos.marcarCancelado(conexion, 91L, "CANCELADO")).thenReturn(true);
        when(inventario.sumarStock(any(), anyLong(), anyInt())).thenReturn(true);

        pedidoService(pedidos, pagoAprobado(), reembolsoAceptado()).cancelarPedidoComoCliente(91L, 42L);

        verify(inventario).sumarStock(conexion, 6L, 2);
        verify(inventario).sumarStock(conexion, 9L, 1);
        ArgumentCaptor<RegistroMovimiento> movimientos = ArgumentCaptor.forClass(RegistroMovimiento.class);
        verify(inventario, times(2)).registrarMovimiento(eq(conexion), movimientos.capture());
        for (RegistroMovimiento movimiento : movimientos.getAllValues()) {
            assertEquals(TipoMovimiento.CANCELACION, movimiento.tipo());
            assertEquals(91L, movimiento.pedidoId());
            assertEquals(42L, movimiento.responsableId());
        }
        verify(conexion).commit();
    }

    @Test
    void cancelarUnPedidoSinLineasResponde409SinTocarElPago() throws Exception {
        PedidoDAO pedidos = mock(PedidoDAO.class);
        when(pedidos.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        when(pedidos.bloquearLineasPedido(conexion, 91L)).thenReturn(List.of());
        PagoDAO pagos = pagoAprobado();
        PuertoPago puerto = mock(PuertoPago.class);

        assertThrows(IllegalStateException.class,
                () -> pedidoService(pedidos, pagos, puerto).cancelarPedidoComoCliente(91L, 42L));

        verify(pagos, never()).marcarReversado(any(), anyLong());
        verifyNoInteractions(puerto);
        verify(conexion).rollback();
    }

    @Test
    void siElPedidoDejoDeEstarPendienteLaCancelacionSeRevierte() throws Exception {
        PedidoDAO pedidos = mock(PedidoDAO.class);
        when(pedidos.bloquearEstadoPedido(conexion, 91L, 42L)).thenReturn(Optional.of(new PedidoBloqueado("PENDIENTE", 42L)));
        when(pedidos.bloquearLineasPedido(conexion, 91L)).thenReturn(List.of(new LineaReposicion(6L, 2)));
        when(pedidos.marcarCancelado(conexion, 91L, "CANCELADO")).thenReturn(false);
        when(inventario.sumarStock(any(), anyLong(), anyInt())).thenReturn(true);
        PuertoPago puerto = mock(PuertoPago.class);

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> pedidoService(pedidos, pagoAprobado(), puerto).cancelarPedidoComoCliente(91L, 42L));

        assertEquals("El pedido dejó de estar pendiente", error.getMessage());
        verifyNoInteractions(puerto);
        verify(conexion).rollback();
    }
}
