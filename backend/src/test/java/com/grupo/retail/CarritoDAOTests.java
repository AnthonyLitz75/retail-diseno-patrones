package com.grupo.retail;

import com.grupo.retail.dao.CarritoDAO;
import com.grupo.retail.model.Carrito;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CarritoDAOTests {

    private ProveedorConexiones proveedorConexiones;
    private Connection conexion;
    private PreparedStatement psCrearCarrito;
    private PreparedStatement psLeerCarrito;
    private ResultSet rsCrearCarrito;
    private ResultSet rsLeerCarrito;
    private CarritoDAO carritoDAO;

    @BeforeEach
    void setUp() throws SQLException {
        proveedorConexiones = mock(ProveedorConexiones.class);
        conexion = mock(Connection.class);
        psCrearCarrito = mock(PreparedStatement.class);
        psLeerCarrito = mock(PreparedStatement.class);
        rsCrearCarrito = mock(ResultSet.class);
        rsLeerCarrito = mock(ResultSet.class);

        when(proveedorConexiones.obtenerConexion()).thenReturn(conexion);
    }

    @Test
    void leerCarritoUtilizaLeftJoinYCoalesceParaProductosSinCategoria() throws SQLException {
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);

        when(conexion.prepareStatement(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.contains("INSERT INTO carrito")) {
                return psCrearCarrito;
            }
            if (sql.contains("FROM carrito_detalle")) {
                return psLeerCarrito;
            }
            return mock(PreparedStatement.class);
        });

        when(psCrearCarrito.executeQuery()).thenReturn(rsCrearCarrito);
        when(rsCrearCarrito.next()).thenReturn(true);
        when(rsCrearCarrito.getLong("id_carrito")).thenReturn(10L);

        when(psLeerCarrito.executeQuery()).thenReturn(rsLeerCarrito);
        // Simular un producto que no tiene categoria asociada (categoria null o "Otros")
        when(rsLeerCarrito.next()).thenReturn(true, false);
        when(rsLeerCarrito.getLong("producto_id")).thenReturn(99L);
        when(rsLeerCarrito.getString("nombre")).thenReturn("Accesorio genérico");
        when(rsLeerCarrito.getString("categoria")).thenReturn("Otros");
        when(rsLeerCarrito.getBigDecimal("precio")).thenReturn(new BigDecimal("15.00"));
        when(rsLeerCarrito.getInt("cantidad")).thenReturn(2);
        when(rsLeerCarrito.getBigDecimal("subtotal")).thenReturn(new BigDecimal("30.00"));
        when(rsLeerCarrito.getInt("stock")).thenReturn(5);

        carritoDAO = new CarritoDAO(proveedorConexiones);
        Carrito carrito = carritoDAO.obtener(1L);

        assertNotNull(carrito);
        assertEquals(1, carrito.productos().size());
        assertEquals("Otros", carrito.productos().getFirst().categoria());
        assertEquals(new BigDecimal("30.00"), carrito.total());

        // Verificar que la consulta SQL usa LEFT JOIN categoria y no INNER JOIN
        verify(conexion, atLeastOnce()).prepareStatement(sqlCaptor.capture());
        String sqlEjecutado = sqlCaptor.getAllValues().stream()
                .filter(sql -> sql.contains("FROM carrito_detalle"))
                .findFirst()
                .orElse("");

        assertTrue(sqlEjecutado.contains("LEFT JOIN categoria"),
                "La consulta debe usar LEFT JOIN categoria para no descartar productos huérfanos o con categoria_id nula");
        assertTrue(sqlEjecutado.contains("COALESCE"),
                "La consulta debe usar COALESCE para proveer fallback de categoría");
    }
}
