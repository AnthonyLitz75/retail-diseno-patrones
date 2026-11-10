package com.grupo.retail.integracion;

import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Clase base para pruebas de integracion con PostgreSQL real.
 * Utiliza un contenedor PostgreSQL compartido por toda la ejecucion
 * y autoconfigurado mediante @ServiceConnection.
 */
public abstract class BaseIntegracionPostgres {

    @ServiceConnection
    protected static final PostgreSQLContainer<?> postgres;

    static {
        postgres = new PostgreSQLContainer<>("postgres:15-alpine")
                .withDatabaseName("retail_diseno_patrones_test")
                .withUsername("test_user")
                .withPassword("test_pass")
                .withReuse(false);
        postgres.start();
    }
}
