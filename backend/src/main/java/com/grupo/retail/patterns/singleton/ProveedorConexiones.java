package com.grupo.retail.patterns.singleton;

import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;

/**
 * Proveedor singleton administrado por Spring que delega al pool configurado.
 * Cada llamada obtiene una conexión prestada que el consumidor debe cerrar.
 */
@Component
public class ProveedorConexiones {

    private final DataSource dataSource;

    public ProveedorConexiones(DataSource dataSource) {
        this.dataSource = Objects.requireNonNull(dataSource, "dataSource no puede ser null");
    }

    public Connection obtenerConexion() throws SQLException {
        return dataSource.getConnection();
    }
}
