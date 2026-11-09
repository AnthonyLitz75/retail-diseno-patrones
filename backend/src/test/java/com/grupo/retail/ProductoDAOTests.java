package com.grupo.retail;

import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.model.Producto;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class ProductoDAOTests {

    private ProveedorConexiones proveedorConexiones;
    private Connection conexion;
    private PreparedStatement psUpdate;
    private PreparedStatement psSelect;
    private ResultSet rsSelect;
    private ProductoDAO productoDAO;

    @BeforeEach
    void setUp() throws SQLException {
        proveedorConexiones = mock(ProveedorConexiones.class);
        conexion = mock(Connection.class);
        psUpdate = mock(PreparedStatement.class);
        psSelect = mock(PreparedStatement.class);
        rsSelect = mock(ResultSet.class);

        when(proveedorConexiones.obtenerConexion()).thenReturn(conexion);
    }

    @Test
    void actualizarPrecioPreservaPrecioAnteriorComoHistoricoAlReducirPrecio() throws SQLException {
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);

        when(conexion.prepareStatement(anyString())).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.contains("UPDATE producto")) {
                return psUpdate;
            }
            if (sql.contains("FROM producto")) {
                return psSelect;
            }
            return mock(PreparedStatement.class);
        });

        when(psUpdate.executeUpdate()).thenReturn(1);
        when(psSelect.executeQuery()).thenReturn(rsSelect);
        when(rsSelect.next()).thenReturn(true);
        when(rsSelect.getLong("id")).thenReturn(5L);
        when(rsSelect.getString("sku")).thenReturn("PA-0005");
        when(rsSelect.getString("nombre")).thenReturn("Mouse Gamer RGB");
        when(rsSelect.getString("marca")).thenReturn("Logitech");
        when(rsSelect.getString("categoria")).thenReturn("Periféricos");
        when(rsSelect.getLong("categoria_id")).thenReturn(1L);
        when(rsSelect.getString("descripcion")).thenReturn("Mouse óptico");
        when(rsSelect.getBigDecimal("precio")).thenReturn(new BigDecimal("79.90"));
        when(rsSelect.getBigDecimal("precio_anterior")).thenReturn(new BigDecimal("99.90"));
        when(rsSelect.getInt("stock")).thenReturn(15);
        when(rsSelect.getBoolean("nuevo")).thenReturn(false);
        when(rsSelect.getString("imagen")).thenReturn("mouse.webp");
        when(rsSelect.getBoolean("activo")).thenReturn(true);

        productoDAO = new ProductoDAO(proveedorConexiones);
        Optional<Producto> resultado = productoDAO.actualizarPrecio(5L, new BigDecimal("79.90"));

        assertTrue(resultado.isPresent(), "Debe retornar el producto actualizado");
        assertEquals(new BigDecimal("79.90"), resultado.get().precio());
        assertEquals(new BigDecimal("99.90"), resultado.get().precioAnterior());

        // Verificar que la sentencia UPDATE contempla precio_anterior para ofertas y descuentos
        verify(conexion, atLeastOnce()).prepareStatement(sqlCaptor.capture());
        String updateSql = sqlCaptor.getAllValues().stream()
                .filter(sql -> sql.contains("UPDATE producto"))
                .findFirst()
                .orElse("");

        assertTrue(updateSql.contains("precio_anterior"),
                "El UPDATE de precio debe gestionar precio_anterior para preservar el precio regular en ofertas");
        assertTrue(updateSql.contains("CASE"),
                "Debe usar condicional CASE para actualizar precio_anterior solo cuando aplique reducción");
    }
}
