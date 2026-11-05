package com.grupo.retail;

import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import javax.sql.DataSource;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertSame;

class ProveedorConexionesTests {

    @Test
    void springMantieneUnProveedorSingletonQueSolicitaConexionesAlPool() throws SQLException {
        AtomicInteger conexionesSolicitadas = new AtomicInteger();
        DataSource pool = (DataSource) Proxy.newProxyInstance(
                DataSource.class.getClassLoader(),
                new Class<?>[] { DataSource.class },
                (proxy, method, args) -> {
                    if (method.getName().equals("getConnection")) {
                        conexionesSolicitadas.incrementAndGet();
                        return Proxy.newProxyInstance(
                                Connection.class.getClassLoader(),
                                new Class<?>[] { Connection.class },
                                (connection, connectionMethod, connectionArgs) -> null);
                    }
                    throw new UnsupportedOperationException(method.getName());
                });

        try (var contexto = new AnnotationConfigApplicationContext()) {
            contexto.registerBean(DataSource.class, () -> pool);
            contexto.register(ProveedorConexiones.class);
            contexto.refresh();

            ProveedorConexiones proveedor = contexto.getBean(ProveedorConexiones.class);
            assertSame(proveedor, contexto.getBean(ProveedorConexiones.class));

            Connection primera = proveedor.obtenerConexion();
            Connection segunda = proveedor.obtenerConexion();

            assertNotSame(primera, segunda);
            assertEquals(2, conexionesSolicitadas.get());
        }
    }
}
