package com.grupo.retail.integracion;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.datasource.DelegatingDataSource;

import javax.sql.DataSource;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Spec 004, T015 (FR-006, SC-003): ningún caso de uso abre una segunda conexión mientras
 * tiene otra abierta. Un contador envuelve el DataSource solo en esta prueba y registra,
 * por hilo, el máximo de conexiones prestadas al mismo tiempo durante cada petición.
 * Antes del spec 004 la confirmación abría una segunda conexión en su flujo de error.
 */
@Import(ConexionesPorCasoDeUsoTest.ContadorDeConexiones.class)
class ConexionesPorCasoDeUsoTest extends BaseCompraIntegracion {

    private static final BigDecimal PRECIO = new BigDecimal("15.00");

    @BeforeEach
    void reiniciarContador() {
        DataSourceContador.MAXIMO_SIMULTANEAS_POR_HILO.set(0);
    }

    @Test
    @DisplayName("Compra, reintento con la misma clave, conflicto y pago rechazado usan una conexión a la vez")
    void compraUsaUnaSolaConexion() {
        long producto = datos.crearProducto(PRECIO, 3);
        DatosIntegracion.Cliente cliente = datos.crearCliente();
        datos.crearCarritoActivo(cliente.id(), Map.of(producto, 1));
        DatosIntegracion.Cliente rechazado = datos.crearCliente();
        datos.crearCarritoActivo(rechazado.id(), Map.of(producto, 1));
        DatosIntegracion.Cliente sinStock = datos.crearCliente();
        datos.crearCarritoActivo(sinStock.id(), Map.of(producto, 50));
        ClienteHttp sesion = sesionDe(cliente);
        ClienteHttp sesionRechazada = sesionDe(rechazado);
        ClienteHttp sesionSinStock = sesionDe(sinStock);
        String clave = UUID.randomUUID().toString();

        medir(() -> assertEquals(201, sesion.confirmarCompra("PRUEBA_APROBADA", clave).estado()));
        medir(() -> assertEquals(201, sesion.confirmarCompra("PRUEBA_APROBADA", clave).estado()));
        medir(() -> assertEquals(402, sesionRechazada.confirmarCompra("PRUEBA_RECHAZADA", null).estado()));
        medir(() -> assertEquals(409, sesionSinStock.confirmarCompra("PRUEBA_APROBADA", null).estado()));
        // Flujo de error con clave: antes abría una segunda conexión para releer el pedido.
        medir(() -> assertEquals(409, sesionSinStock.confirmarCompra(
                "PRUEBA_APROBADA", UUID.randomUUID().toString()).estado()));
    }

    @Test
    @DisplayName("Cancelar y las transiciones de almacén usan una conexión a la vez")
    void transicionesUsanUnaSolaConexion() {
        Compra aCancelar = comprar(PRECIO, 5, 1);
        Compra aDespachar = comprar(PRECIO, 5, 1);
        ClienteHttp cliente = sesionDe(aCancelar.cliente());
        ClienteHttp almacen = sesionDe(datos.crearEmpleado("ALMACEN"));
        String base = "/api/pedidos/" + aDespachar.pedido();

        medir(() -> assertEquals(204, cliente.put("/api/pedidos/" + aCancelar.pedido() + "/cancelar").estado()));
        medir(() -> assertEquals(204, almacen.put(base + "/preparar").estado()));
        medir(() -> assertEquals(204, almacen.putJson(base + "/despachar",
                "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"CNX-" + aDespachar.pedido() + "\"}").estado()));
        medir(() -> assertEquals(204, almacen.put(base + "/entregar").estado()));
        medir(() -> assertEquals(409, almacen.put(base + "/entregar").estado()));
    }

    private static void medir(Runnable peticion) {
        DataSourceContador.MAXIMO_SIMULTANEAS_POR_HILO.set(0);
        peticion.run();
        assertEquals(1, DataSourceContador.MAXIMO_SIMULTANEAS_POR_HILO.get(),
                "Un hilo de petición nunca debe tener más de una conexión prestada a la vez");
    }

    @TestConfiguration
    static class ContadorDeConexiones {
        @Bean
        static BeanPostProcessor envolverDataSourceConContador() {
            return new BeanPostProcessor() {
                @Override
                public Object postProcessAfterInitialization(Object bean, String nombre) {
                    return bean instanceof DataSource ds && !(bean instanceof DataSourceContador)
                            ? new DataSourceContador(ds)
                            : bean;
                }
            };
        }
    }

    /** DataSource que cuenta, por hilo, cuántas conexiones prestadas siguen abiertas. */
    static final class DataSourceContador extends DelegatingDataSource {

        static final AtomicInteger MAXIMO_SIMULTANEAS_POR_HILO = new AtomicInteger();
        private static final ThreadLocal<int[]> ABIERTAS = ThreadLocal.withInitial(() -> new int[1]);

        DataSourceContador(DataSource destino) {
            super(destino);
        }

        @Override
        public Connection getConnection() throws SQLException {
            return contar(super.getConnection());
        }

        @Override
        public Connection getConnection(String usuario, String clave) throws SQLException {
            return contar(super.getConnection(usuario, clave));
        }

        private static Connection contar(Connection real) {
            int[] abiertas = ABIERTAS.get();
            abiertas[0]++;
            MAXIMO_SIMULTANEAS_POR_HILO.accumulateAndGet(abiertas[0], Math::max);
            AtomicBoolean cerrada = new AtomicBoolean();
            return (Connection) Proxy.newProxyInstance(
                    Connection.class.getClassLoader(), new Class<?>[] {Connection.class},
                    (proxy, metodo, argumentos) -> {
                        if ("close".equals(metodo.getName()) && cerrada.compareAndSet(false, true)) {
                            abiertas[0]--;
                        }
                        try {
                            return metodo.invoke(real, argumentos);
                        } catch (InvocationTargetException error) {
                            throw error.getCause();
                        }
                    });
        }
    }
}
