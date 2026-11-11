package com.grupo.retail;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Spec 004, T008: el ejecutor es el dueño de la transacción. Abre la conexión,
 * desactiva autoCommit, hace commit si la operación termina y rollback ante cualquier
 * fallo, y siempre devuelve la conexión al pool.
 */
class EjecutorTransaccionTests {

    private Connection conexion;
    private EjecutorTransaccion ejecutor;

    @BeforeEach
    void setUp() throws SQLException {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        conexion = mock(Connection.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        ejecutor = new EjecutorTransaccion(proveedor);
    }

    @Test
    void confirmaLaTransaccionYDevuelveElResultado() throws SQLException {
        String resultado = ejecutor.ejecutar("fallo", c -> {
            assertSame(conexion, c, "La operación recibe la conexión de la transacción");
            return "ok";
        });

        assertEquals("ok", resultado);
        InOrder orden = inOrder(conexion);
        orden.verify(conexion).setAutoCommit(false);
        orden.verify(conexion).commit();
        orden.verify(conexion).close();
        verify(conexion, never()).rollback();
    }

    @Test
    void revierteYPropagaUnaExcepcionDeNegocio() throws SQLException {
        IllegalStateException negocio = new IllegalStateException("regla incumplida");

        IllegalStateException lanzada = assertThrows(IllegalStateException.class,
                () -> ejecutor.ejecutar("fallo", c -> {
                    throw negocio;
                }));

        assertSame(negocio, lanzada, "La excepción de negocio llega intacta al manejador HTTP");
        verify(conexion).rollback();
        verify(conexion, never()).commit();
        verify(conexion).close();
    }

    @Test
    void revierteYTraduceUnErrorSql() throws SQLException {
        SQLException sql = new SQLException("falló el INSERT");

        ErrorAccesoDatosException lanzada = assertThrows(ErrorAccesoDatosException.class,
                () -> ejecutor.ejecutar("No se pudo confirmar la compra", c -> {
                    throw sql;
                }));

        assertEquals("No se pudo confirmar la compra", lanzada.getMessage());
        assertSame(sql, lanzada.getCause());
        verify(conexion).rollback();
        verify(conexion).close();
    }

    @Test
    void unFalloAlRevertirNoOcultaElErrorOriginal() throws SQLException {
        SQLException alRevertir = new SQLException("conexión perdida");
        doThrow(alRevertir).when(conexion).rollback();
        IllegalStateException original = new IllegalStateException("regla incumplida");

        IllegalStateException lanzada = assertThrows(IllegalStateException.class,
                () -> ejecutor.ejecutar("fallo", c -> {
                    throw original;
                }));

        assertSame(original, lanzada);
        assertEquals(1, lanzada.getSuppressed().length);
        assertSame(alRevertir, lanzada.getSuppressed()[0]);
        verify(conexion).close();
    }
}
