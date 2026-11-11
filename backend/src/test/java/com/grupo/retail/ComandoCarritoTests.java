package com.grupo.retail;

import com.grupo.retail.dao.CarritoDAO;
import com.grupo.retail.exception.StockInsuficienteException;
import com.grupo.retail.patterns.command.AgregarProductoComando;
import com.grupo.retail.patterns.command.ComandoCarrito;
import com.grupo.retail.patterns.command.EliminarProductoComando;
import com.grupo.retail.patterns.command.HistorialComandosCarrito;
import com.grupo.retail.patterns.command.ModificarCantidadComando;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

import java.io.ByteArrayOutputStream;
import java.io.ObjectOutputStream;
import java.sql.Connection;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * Spec 005, T011 (US4, US5, US6): cada acción del carrito es un comando con ejecutar y
 * deshacer que guarda solo datos simples; el historial por sesión conserva las 20 últimas.
 */
class ComandoCarritoTests {

    private CarritoDAO dao;
    private Connection conexion;

    @BeforeEach
    void setUp() {
        dao = mock(CarritoDAO.class);
        conexion = mock(Connection.class);
    }

    @Test
    void agregarValidaStockYDeshacerRetiraElProductoNuevo() throws Exception {
        when(dao.stockSiActivo(conexion, 7L)).thenReturn(Optional.of(10));
        ComandoCarrito comando = new AgregarProductoComando(1L, 7L, 0, 3);

        comando.ejecutar(dao, conexion);
        comando.deshacer(dao, conexion);

        verify(dao).fijarCantidad(conexion, 1L, 7L, 3);
        verify(dao).fijarCantidad(conexion, 1L, 7L, 0); // 0 = retirar la línea
    }

    @Test
    void agregarSobreUnaLineaExistenteDeshaceALaCantidadAnterior() throws Exception {
        when(dao.stockSiActivo(conexion, 7L)).thenReturn(Optional.of(10));
        ComandoCarrito comando = new AgregarProductoComando(1L, 7L, 2, 5);

        comando.ejecutar(dao, conexion);
        comando.deshacer(dao, conexion);

        verify(dao).fijarCantidad(conexion, 1L, 7L, 5);
        verify(dao).fijarCantidad(conexion, 1L, 7L, 2);
    }

    @Test
    void agregarMasQueElStockSeRechazaConLaReglaHabitual() throws Exception {
        when(dao.stockSiActivo(conexion, 7L)).thenReturn(Optional.of(2));

        assertThrows(IllegalArgumentException.class,
                () -> new AgregarProductoComando(1L, 7L, 0, 3).ejecutar(dao, conexion));
        verify(dao, never()).fijarCantidad(any(), anyLong(), anyLong(), anyInt());
    }

    @Test
    void agregarUnProductoInactivoResponde404() throws Exception {
        when(dao.stockSiActivo(conexion, 7L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class,
                () -> new AgregarProductoComando(1L, 7L, 0, 1).ejecutar(dao, conexion));
    }

    @Test
    void modificarCantidadEjecutaYDeshaceEntreLasDosCantidades() throws Exception {
        when(dao.stockSiActivo(conexion, 8L)).thenReturn(Optional.of(10));
        ComandoCarrito comando = new ModificarCantidadComando(1L, 8L, 1, 5);

        comando.ejecutar(dao, conexion);
        comando.deshacer(dao, conexion);

        verify(dao).fijarCantidad(conexion, 1L, 8L, 5);
        verify(dao).fijarCantidad(conexion, 1L, 8L, 1);
    }

    @Test
    void eliminarYDeshacerRestauranLaCantidadQueHabia() throws Exception {
        when(dao.stockSiActivo(conexion, 9L)).thenReturn(Optional.of(10));
        ComandoCarrito comando = new EliminarProductoComando(1L, 9L, 2);

        comando.ejecutar(dao, conexion);
        comando.deshacer(dao, conexion);

        verify(dao).fijarCantidad(conexion, 1L, 9L, 0);
        verify(dao).fijarCantidad(conexion, 1L, 9L, 2);
    }

    @Test
    void deshacerUnaEliminacionDeUnProductoDesactivadoResponde409ConMotivo() throws Exception {
        when(dao.stockSiActivo(conexion, 9L)).thenReturn(Optional.empty());

        IllegalStateException error = assertThrows(IllegalStateException.class,
                () -> new EliminarProductoComando(1L, 9L, 2).deshacer(dao, conexion));

        assertTrue(error.getMessage().contains("ya no está disponible"), error.getMessage());
        verify(dao, never()).fijarCantidad(any(), anyLong(), anyLong(), anyInt());
    }

    @Test
    void deshacerSinStockSuficienteResponde409() throws Exception {
        when(dao.stockSiActivo(conexion, 9L)).thenReturn(Optional.of(1));

        assertThrows(StockInsuficienteException.class,
                () -> new EliminarProductoComando(1L, 9L, 2).deshacer(dao, conexion));
        verify(dao, never()).fijarCantidad(any(), anyLong(), anyLong(), anyInt());
    }

    @Test
    void deshacerUnAgregadoNoConsultaStockPorqueSoloRetira() throws Exception {
        new AgregarProductoComando(1L, 7L, 0, 3).deshacer(dao, conexion);

        verify(dao, never()).stockSiActivo(any(), anyLong());
        verify(dao).fijarCantidad(eq(conexion), eq(1L), eq(7L), eq(0));
    }

    @Test
    void losComandosGuardanSoloDatosSimplesYSonSerializables() throws Exception {
        try (ObjectOutputStream salida = new ObjectOutputStream(new ByteArrayOutputStream())) {
            salida.writeObject(new AgregarProductoComando(1L, 7L, 0, 3));
            salida.writeObject(new ModificarCantidadComando(1L, 8L, 1, 5));
            salida.writeObject(new EliminarProductoComando(1L, 9L, 2));
            HistorialComandosCarrito historial = new HistorialComandosCarrito();
            historial.registrar(new EliminarProductoComando(1L, 9L, 2), 4L);
            salida.writeObject(historial);
        }
    }

    @Test
    void elHistorialDevuelveLaUltimaAccionYLaQuita() {
        HistorialComandosCarrito historial = new HistorialComandosCarrito();
        ComandoCarrito primero = new AgregarProductoComando(1L, 7L, 0, 1);
        ComandoCarrito segundo = new EliminarProductoComando(1L, 7L, 1);
        historial.registrar(primero, 1L);
        historial.registrar(segundo, 2L);

        HistorialComandosCarrito.Registro ultimo = historial.ultimo().orElseThrow();
        assertEquals(segundo, ultimo.comando());
        assertEquals(2L, ultimo.revision());
        assertEquals(2L, historial.revisionEsperada());

        historial.quitar(ultimo, 3L);
        assertEquals(primero, historial.ultimo().orElseThrow().comando());
        historial.quitar(ultimo, 9L); // quitar un registro que ya no está arriba no cambia nada
        assertEquals(1, historial.tamanio());
        assertEquals(3L, historial.revisionEsperada());
    }

    @Test
    void deshacerSubeLaRevisionYElSiguienteDeshacerLaEspera() {
        HistorialComandosCarrito historial = new HistorialComandosCarrito();
        historial.registrar(new AgregarProductoComando(1L, 7L, 0, 1), 5L);
        historial.registrar(new ModificarCantidadComando(1L, 7L, 1, 4), 6L);

        historial.quitar(historial.ultimo().orElseThrow(), 7L); // el deshacer dejó la revisión 7

        assertEquals(7L, historial.revisionEsperada(),
                "El siguiente deshacer compara contra la revisión que dejó el deshacer anterior");
        historial.registrar(new EliminarProductoComando(1L, 7L, 1), 8L);
        assertEquals(8L, historial.revisionEsperada());
    }

    @Test
    void elHistorialConservaSoloLasVeinteUltimasAcciones() {
        HistorialComandosCarrito historial = new HistorialComandosCarrito();
        for (int i = 1; i <= 25; i++) {
            historial.registrar(new ModificarCantidadComando(1L, 7L, i, i + 1), i);
        }

        assertEquals(HistorialComandosCarrito.MAX_HISTORIAL_CARRITO, historial.tamanio());
        assertEquals(20, HistorialComandosCarrito.MAX_HISTORIAL_CARRITO);
        int deshechas = 0;
        while (historial.ultimo().isPresent()) {
            historial.quitar(historial.ultimo().get(), 100L + deshechas);
            deshechas++;
        }
        assertEquals(20, deshechas);
    }

    @Test
    void elHistorialVivenEnLaSesionYSeLimpia() {
        MockHttpSession sesion = new MockHttpSession();

        HistorialComandosCarrito historial = HistorialComandosCarrito.de(sesion);
        historial.registrar(new AgregarProductoComando(1L, 7L, 0, 1), 1L);

        assertSame(historial, HistorialComandosCarrito.de(sesion));
        HistorialComandosCarrito.limpiarEn(sesion);
        assertTrue(HistorialComandosCarrito.de(sesion).ultimo().isEmpty());
        HistorialComandosCarrito.limpiarEn(null); // sin sesión no hay nada que limpiar
    }

    private static <T> T any() {
        return org.mockito.ArgumentMatchers.any();
    }
}
