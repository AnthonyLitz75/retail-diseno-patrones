package com.grupo.retail.integracion;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class MigracionesTest extends BaseIntegracionPostgres {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private Flyway flyway;

    @Test
    @DisplayName("US1: Flyway migra base vacia y crea las 16 tablas esperadas con sus columnas objetivo")
    void debeCrearTodasLasTablasYColumnasEsperadas() throws Exception {
        Set<String> tablasEsperadas = Set.of(
                "usuario", "categoria", "producto", "movimiento_inventario",
                "carrito", "carrito_detalle", "pedido", "pedido_detalle",
                "pago", "pedido_historial_estado", "consulta_producto",
                "notificacion", "envio", "reclamo", "devolucion", "detalle_devolucion"
        );

        Set<String> tablasReales = new HashSet<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData metaData = conn.getMetaData();
            try (ResultSet rs = metaData.getTables(null, "public", "%", new String[]{"TABLE"})) {
                while (rs.next()) {
                    tablasReales.add(rs.getString("TABLE_NAME").toLowerCase());
                }
            }

            assertTrue(tablasReales.containsAll(tablasEsperadas),
                    "Faltan tablas en el esquema. Esperadas: " + tablasEsperadas + ", encontradas: " + tablasReales);

            // Verificar columna revision en carrito
            try (ResultSet rs = metaData.getColumns(null, "public", "carrito", "revision")) {
                assertTrue(rs.next(), "La tabla carrito debe tener la columna revision para control de concurrencia optimista");
            }

            // Verificar columna monto_reembolsado en pago
            try (ResultSet rs = metaData.getColumns(null, "public", "pago", "monto_reembolsado")) {
                assertTrue(rs.next(), "La tabla pago debe tener la columna monto_reembolsado");
            }

            // Verificar columna entregado_en en envio
            try (ResultSet rs = metaData.getColumns(null, "public", "envio", "entregado_en")) {
                assertTrue(rs.next(), "La tabla envio debe tener la columna entregado_en");
            }
        }
    }

    @Test
    @DisplayName("US1: Ejecucion repetida de migraciones no falla ni reaplica esquemas")
    void debeSerIdempotenteAlReejecutarMigraciones() {
        int migracionesAplicadas = flyway.migrate().migrationsExecuted;
        assertEquals(0, migracionesAplicadas, "Una segunda ejecucion de flyway.migrate() no debe reaplicar migraciones");
    }
}
