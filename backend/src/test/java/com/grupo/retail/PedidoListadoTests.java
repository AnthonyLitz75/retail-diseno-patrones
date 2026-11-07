package com.grupo.retail;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.model.EventoEstadoPedido;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.sql.Array;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PedidoListadoTests {

    private static final OffsetDateTime FECHA = OffsetDateTime.parse("2026-11-06T10:00:00Z");

    @Test
    void listarPendientesCargaDetallesEHistorialConTresConsultasSinImportarCuantosPedidosHay() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement psPedidos = mock(PreparedStatement.class);
        PreparedStatement psDetalles = mock(PreparedStatement.class);
        PreparedStatement psHistorial = mock(PreparedStatement.class);
        ResultSet rsPedidos = mock(ResultSet.class);
        ResultSet rsDetalles = mock(ResultSet.class);
        ResultSet rsHistorial = mock(ResultSet.class);
        Array arregloIds = mock(Array.class);

        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.createArrayOf(eq("bigint"), any(Object[].class))).thenReturn(arregloIds);
        when(conexion.prepareStatement(contains("WHERE p.estado = 'PENDIENTE'"))).thenReturn(psPedidos);
        when(conexion.prepareStatement(contains("FROM pedido_detalle"))).thenReturn(psDetalles);
        when(conexion.prepareStatement(contains("FROM pedido_historial_estado"))).thenReturn(psHistorial);
        when(psPedidos.executeQuery()).thenReturn(rsPedidos);
        when(psDetalles.executeQuery()).thenReturn(rsDetalles);
        when(psHistorial.executeQuery()).thenReturn(rsHistorial);

        // Dos pedidos: sin transportista asignado (transportista = null en el mock).
        when(rsPedidos.next()).thenReturn(true, true, false);
        when(rsPedidos.getLong("id_pedido")).thenReturn(1L, 2L);
        when(rsPedidos.getString("cliente_nombre")).thenReturn("Ana", "Beto");
        when(rsPedidos.getString("cliente_correo")).thenReturn("ana@example.com", "beto@example.com");
        when(rsPedidos.getString("estado")).thenReturn("PENDIENTE");
        when(rsPedidos.getBigDecimal("total")).thenReturn(new BigDecimal("30.00"), new BigDecimal("50.00"));
        when(rsPedidos.getObject("creado_en", OffsetDateTime.class)).thenReturn(FECHA);

        // Detalles ordenados por pedido: el pedido 1 tiene dos productos y el 2 uno.
        when(rsDetalles.next()).thenReturn(true, true, true, false);
        when(rsDetalles.getLong("pedido_id")).thenReturn(1L, 1L, 2L);
        when(rsDetalles.getLong("producto_id")).thenReturn(11L, 12L, 13L);
        when(rsDetalles.getString("nombre_producto")).thenReturn("Mouse", "Cable", "Teclado");
        when(rsDetalles.getBigDecimal("precio_unitario")).thenReturn(new BigDecimal("10.00"));
        when(rsDetalles.getInt("cantidad")).thenReturn(1, 2, 1);
        when(rsDetalles.getBigDecimal("subtotal")).thenReturn(
                new BigDecimal("10.00"), new BigDecimal("20.00"), new BigDecimal("50.00"));

        // Historial: solo el pedido 2 tiene eventos.
        when(rsHistorial.next()).thenReturn(true, true, false);
        when(rsHistorial.getLong("pedido_id")).thenReturn(2L, 2L);
        when(rsHistorial.getString("estado")).thenReturn("PENDIENTE", "EN_PREPARACION");
        when(rsHistorial.getString("responsable")).thenReturn("Beto", "Almacén");
        when(rsHistorial.getString("comentario")).thenReturn("Pedido creado", "Preparando");
        when(rsHistorial.getObject("fecha", OffsetDateTime.class)).thenReturn(FECHA);

        List<PedidoVista> pedidos = new PedidoDAO(proveedor).listarPendientes();

        verify(conexion, times(3)).prepareStatement(anyString());
        assertEquals(2, pedidos.size());

        PedidoVista primero = pedidos.get(0);
        assertEquals(1L, primero.idPedido());
        assertNull(primero.envio());
        assertEquals(List.of("Mouse", "Cable"),
                primero.productos().stream().map(producto -> producto.nombreProducto()).toList());
        assertTrue(primero.historial().isEmpty());

        PedidoVista segundo = pedidos.get(1);
        assertEquals(2L, segundo.idPedido());
        assertEquals(1, segundo.productos().size());
        assertEquals("Teclado", segundo.productos().get(0).nombreProducto());
        assertEquals(List.of("PENDIENTE", "EN_PREPARACION"),
                segundo.historial().stream().map(EventoEstadoPedido::estado).toList());
    }

    @Test
    void listarPendientesSinPedidosNoConsultaDetallesNiHistorial() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement psPedidos = mock(PreparedStatement.class);
        ResultSet rsPedidos = mock(ResultSet.class);

        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("WHERE p.estado = 'PENDIENTE'"))).thenReturn(psPedidos);
        when(psPedidos.executeQuery()).thenReturn(rsPedidos);
        when(rsPedidos.next()).thenReturn(false);

        List<PedidoVista> pedidos = new PedidoDAO(proveedor).listarPendientes();

        assertTrue(pedidos.isEmpty());
        verify(conexion, times(1)).prepareStatement(anyString());
        verify(conexion, never()).createArrayOf(anyString(), any(Object[].class));
    }
}
