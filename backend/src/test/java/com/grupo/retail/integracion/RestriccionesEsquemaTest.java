package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.postgresql.util.PSQLException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class RestriccionesEsquemaTest extends BaseIntegracionPostgres {

    @Autowired
    private DataSource dataSource;

    @Test
    @DisplayName("US3: El esquema impide stock negativo mediante CHECK (stock >= 0)")
    void debeImpedirStockNegativo() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            assertThrows(PSQLException.class, () -> {
                try (PreparedStatement stmt = conn.prepareStatement(
                        "INSERT INTO producto (nombre, precio, stock) VALUES ('Prod Invalido', 10.0, -1)")) {
                    stmt.executeUpdate();
                }
            });
        }
    }

    @Test
    @DisplayName("US3: El esquema impide correos duplicados en usuario")
    void debeImpedirCorreoDuplicado() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            String correo = "duplicado.test@example.com";
            try (PreparedStatement stmt = conn.prepareStatement(
                    "INSERT INTO usuario (nombre, correo, clave_hash, rol) VALUES ('U1', ?, 'hash', 'CLIENTE')")) {
                stmt.setString(1, correo);
                stmt.executeUpdate();
            }

            assertThrows(PSQLException.class, () -> {
                try (PreparedStatement stmt = conn.prepareStatement(
                        "INSERT INTO usuario (nombre, correo, clave_hash, rol) VALUES ('U2', ?, 'hash', 'CLIENTE')")) {
                    stmt.setString(1, correo);
                    stmt.executeUpdate();
                }
            });
        }
    }

    @Test
    @DisplayName("US3: El indice parcial impide mas de un pago APROBADO por pedido")
    void debeImpedirMasDeUnPagoAprobadoPorPedido() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            long usuarioId;
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("INSERT INTO usuario (nombre, correo, clave_hash, rol) VALUES ('Comprador', 'comprador@pago.com', 'h', 'CLIENTE') RETURNING id_usuario")) {
                assertTrue(rs.next());
                usuarioId = rs.getLong(1);
            }

            long pedidoId;
            try (PreparedStatement st = conn.prepareStatement("INSERT INTO pedido (usuario_id, total) VALUES (?, 100.0) RETURNING id_pedido")) {
                st.setLong(1, usuarioId);
                try (ResultSet rs = st.executeQuery()) {
                    assertTrue(rs.next());
                    pedidoId = rs.getLong(1);
                }
            }

            // Primer pago APROBADO: OK
            try (PreparedStatement st = conn.prepareStatement(
                    "INSERT INTO pago (pedido_id, metodo, estado, monto, referencia) VALUES (?, 'SIMULADO', 'APROBADO', 100.0, 'REF-1')")) {
                st.setLong(1, pedidoId);
                st.executeUpdate();
            }

            // Segundo pago APROBADO: debe violar uq_pago_aprobado_por_pedido
            assertThrows(PSQLException.class, () -> {
                try (PreparedStatement st = conn.prepareStatement(
                        "INSERT INTO pago (pedido_id, metodo, estado, monto, referencia) VALUES (?, 'SIMULADO', 'APROBADO', 100.0, 'REF-2')")) {
                    st.setLong(1, pedidoId);
                    st.executeUpdate();
                }
            });
        }
    }

    @Test
    @DisplayName("US3: El esquema impide que monto_reembolsado sea superior al monto original")
    void debeImpedirReembolsoMayorAlMonto() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            long usuarioId;
            try (Statement st = conn.createStatement();
                 ResultSet rs = st.executeQuery("INSERT INTO usuario (nombre, correo, clave_hash, rol) VALUES ('Comprador2', 'comprador2@pago.com', 'h', 'CLIENTE') RETURNING id_usuario")) {
                assertTrue(rs.next());
                usuarioId = rs.getLong(1);
            }

            long pedidoId;
            try (PreparedStatement st = conn.prepareStatement("INSERT INTO pedido (usuario_id, total) VALUES (?, 50.0) RETURNING id_pedido")) {
                st.setLong(1, usuarioId);
                try (ResultSet rs = st.executeQuery()) {
                    assertTrue(rs.next());
                    pedidoId = rs.getLong(1);
                }
            }

            assertThrows(PSQLException.class, () -> {
                try (PreparedStatement st = conn.prepareStatement(
                        "INSERT INTO pago (pedido_id, metodo, estado, monto, monto_reembolsado, referencia) VALUES (?, 'SIMULADO', 'APROBADO', 50.0, 60.0, 'REF-EXCESO')")) {
                    st.setLong(1, pedidoId);
                    st.executeUpdate();
                }
            });
        }
    }

    @Test
    @DisplayName("US3: El esquema impide cantidad menor o igual a cero en detalle de pedido")
    void debeImpedirCantidadCeroEnDetallePedido() throws Exception {
        try (Connection conn = dataSource.getConnection()) {
            assertThrows(PSQLException.class, () -> {
                try (PreparedStatement st = conn.prepareStatement(
                        "INSERT INTO pedido_detalle (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad) VALUES (1, 1, 'X', 10.0, 0)")) {
                    st.executeUpdate();
                }
            });
        }
    }
}
