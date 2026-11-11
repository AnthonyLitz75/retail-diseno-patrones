package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("dev")
class DatosDevTest extends BaseIntegracionPostgres {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("US2: El perfil 'dev' ejecuta los seeds de db/dev y carga 5 cuentas y 32 productos demo")
    void debeCargarDatosDemoConPerfilDev() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            // Verificar las 5 cuentas demo
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COUNT(*) FROM usuario WHERE correo IN (" +
                    "'registro.web@example.com', 'admin.prueba@example.com', 'vendedor.prueba@example.com', " +
                    "'almacen.prueba@example.com', 'soporte.prueba@example.com')")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    assertTrue(rs.next());
                    assertEquals(5, rs.getInt(1), "Deben existir exactamente las 5 cuentas de prueba");
                }
            }

            // Verificar los 32 productos demo
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COUNT(*) FROM producto WHERE sku LIKE 'PA-%'")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    assertTrue(rs.next());
                    assertEquals(32, rs.getInt(1), "Deben cargarse los 32 productos demo del catalogo");
                }
            }

            // H2 (spec 005): el carrito demo solo trae productos activos y al menos uno comprable
            try (PreparedStatement stmt = conn.prepareStatement("""
                    SELECT COUNT(*) FILTER (WHERE p.activo = FALSE) AS inactivos,
                           COUNT(*) FILTER (WHERE p.activo = TRUE AND p.stock >= cd.cantidad) AS comprables
                    FROM carrito c
                    JOIN usuario u ON u.id_usuario = c.usuario_id
                    JOIN carrito_detalle cd ON cd.carrito_id = c.id_carrito
                    JOIN producto p ON p.id = cd.producto_id
                    WHERE u.correo = 'registro.web@example.com' AND c.estado = 'ACTIVO'
                    """)) {
                try (ResultSet rs = stmt.executeQuery()) {
                    assertTrue(rs.next());
                    assertEquals(0, rs.getInt("inactivos"), "El carrito demo no debe contener productos inactivos");
                    assertTrue(rs.getInt("comprables") >= 1, "El carrito demo debe traer un producto comprable");
                }
            }

            // Verificar la jerarquia composite de Perifericos
            try (PreparedStatement stmt = conn.prepareStatement(
                    "SELECT COUNT(*) FROM categoria WHERE categoria_padre_id = (" +
                    "  SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos'" +
                    ")")) {
                try (ResultSet rs = stmt.executeQuery()) {
                    assertTrue(rs.next());
                    assertEquals(4, rs.getInt(1), "Perifericos debe ser padre de 4 subcategorias (Teclados, Mouse, Audio, Camaras)");
                }
            }
        }
    }
}
