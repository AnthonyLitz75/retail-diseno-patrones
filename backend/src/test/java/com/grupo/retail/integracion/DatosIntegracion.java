package com.grupo.retail.integracion;

import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Fábrica de datos para las pruebas de integración del spec 004 (T002).
 * Cada llamada crea registros con identificadores únicos, de modo que las clases de
 * prueba pueden compartir el mismo contenedor PostgreSQL sin interferir entre sí.
 */
public final class DatosIntegracion {

    /** Contraseña de todas las cuentas de prueba (solo existe en el contenedor efímero). */
    public static final String CLAVE_PRUEBA = "ClavePrueba123";

    private final DataSource dataSource;
    private final String claveHash;

    public DatosIntegracion(DataSource dataSource, PasswordEncoder passwordEncoder) {
        this.dataSource = dataSource;
        this.claveHash = passwordEncoder.encode(CLAVE_PRUEBA);
    }

    public record Cliente(long id, String correo) {
    }

    public Cliente crearCliente() {
        String correo = "cliente-" + UUID.randomUUID() + "@prueba.test";
        long id = insertarYDevolverId(
                "INSERT INTO usuario (nombre, correo, clave_hash, rol) VALUES (?, ?, ?, 'CLIENTE') "
                        + "RETURNING id_usuario",
                "Cliente de prueba", correo, claveHash);
        return new Cliente(id, correo);
    }

    public long crearProducto(BigDecimal precio, int stock) {
        String sku = "IT-" + UUID.randomUUID().toString().substring(0, 18);
        return insertarYDevolverId(
                "INSERT INTO producto (sku, nombre, precio, stock) VALUES (?, ?, ?, ?) RETURNING id",
                sku, "Producto " + sku, precio, stock);
    }

    /** Crea el carrito ACTIVO del cliente con las líneas indicadas (productoId -> cantidad). */
    public long crearCarritoActivo(long clienteId, Map<Long, Integer> lineas) {
        long carritoId = insertarYDevolverId(
                "INSERT INTO carrito (usuario_id) VALUES (?) RETURNING id_carrito", clienteId);
        for (Map.Entry<Long, Integer> linea : new LinkedHashMap<>(lineas).entrySet()) {
            ejecutar("INSERT INTO carrito_detalle (carrito_id, producto_id, cantidad) VALUES (?, ?, ?)",
                    carritoId, linea.getKey(), linea.getValue());
        }
        return carritoId;
    }

    public int stock(long productoId) {
        return contar("SELECT stock FROM producto WHERE id = ?", productoId);
    }

    public int pedidosDe(long clienteId) {
        return contar("SELECT COUNT(*) FROM pedido WHERE usuario_id = ?", clienteId);
    }

    public int unidadesVendidas(long productoId) {
        return contar("SELECT COALESCE(SUM(cantidad), 0) FROM pedido_detalle WHERE producto_id = ?", productoId);
    }

    public int movimientosDe(long productoId) {
        return contar("SELECT COUNT(*) FROM movimiento_inventario WHERE producto_id = ?", productoId);
    }

    public int pagosDe(long clienteId) {
        return contar("""
                SELECT COUNT(*) FROM pago pg JOIN pedido p ON p.id_pedido = pg.pedido_id
                WHERE p.usuario_id = ?
                """, clienteId);
    }

    public int lineasCarrito(long carritoId) {
        return contar("SELECT COUNT(*) FROM carrito_detalle WHERE carrito_id = ?", carritoId);
    }

    public String estadoCarrito(long carritoId) {
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(
                     "SELECT estado FROM carrito WHERE id_carrito = ?")) {
            consulta.setLong(1, carritoId);
            try (ResultSet rs = consulta.executeQuery()) {
                rs.next();
                return rs.getString(1);
            }
        } catch (SQLException error) {
            throw new IllegalStateException(error);
        }
    }

    /** Ejecuta DDL o DML auxiliar de una prueba (por ejemplo, un trigger que fuerza un fallo). */
    public void ejecutar(String sql, Object... parametros) {
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            asignar(consulta, parametros);
            consulta.execute();
        } catch (SQLException error) {
            throw new IllegalStateException(error);
        }
    }

    private int contar(String sql, Object... parametros) {
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            asignar(consulta, parametros);
            try (ResultSet rs = consulta.executeQuery()) {
                rs.next();
                return rs.getInt(1);
            }
        } catch (SQLException error) {
            throw new IllegalStateException(error);
        }
    }

    private long insertarYDevolverId(String sql, Object... parametros) {
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            asignar(consulta, parametros);
            try (ResultSet rs = consulta.executeQuery()) {
                rs.next();
                return rs.getLong(1);
            }
        } catch (SQLException error) {
            throw new IllegalStateException(error);
        }
    }

    private static void asignar(PreparedStatement consulta, Object... parametros) throws SQLException {
        for (int i = 0; i < parametros.length; i++) {
            consulta.setObject(i + 1, parametros[i]);
        }
    }
}
