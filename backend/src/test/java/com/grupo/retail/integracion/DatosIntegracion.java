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

    /** Cuenta de personal (ALMACEN, VENDEDOR, ADMIN o SOPORTE) para iniciar sesión en pruebas. */
    public Cliente crearEmpleado(String rol) {
        String correo = rol.toLowerCase() + "-" + UUID.randomUUID() + "@prueba.test";
        long id = insertarYDevolverId(
                "INSERT INTO usuario (nombre, correo, clave_hash, rol) VALUES (?, ?, ?, ?) "
                        + "RETURNING id_usuario",
                "Empleado de prueba", correo, claveHash, rol);
        return new Cliente(id, correo);
    }

    /** Responsable registrado en el historial para ese estado del pedido. */
    public long responsableDe(long pedidoId, String estado) {
        return contar("SELECT responsable_id FROM pedido_historial_estado WHERE pedido_id = ? AND estado = ?",
                pedidoId, estado);
    }

    /** Registros de auditoría de esa acción para un correo (actor o correo intentado). */
    public int auditoriasDe(String accion, String correo) {
        return contar("SELECT COUNT(*) FROM registro_auditoria WHERE accion = ? AND usuario_correo = ?",
                accion, correo);
    }

    /** Detalle del último registro de esa acción sobre una entidad. */
    public String detalleAuditoria(String accion, String entidad, long entidadId) {
        return texto("SELECT detalle FROM registro_auditoria WHERE accion = ? AND entidad = ? AND entidad_id = ? "
                + "ORDER BY id_auditoria DESC LIMIT 1", accion, entidad, entidadId);
    }

    /** Correo del actor del último registro de esa acción sobre una entidad. */
    public String actorAuditoria(String accion, String entidad, long entidadId) {
        return texto("SELECT usuario_correo FROM registro_auditoria WHERE accion = ? AND entidad = ? AND entidad_id = ? "
                + "ORDER BY id_auditoria DESC LIMIT 1", accion, entidad, entidadId);
    }

    public int notificacionesDe(long usuarioId, long pedidoId, String estado) {
        return contar("SELECT COUNT(*) FROM notificacion WHERE usuario_id = ? AND pedido_id = ? AND estado = ?",
                usuarioId, pedidoId, estado);
    }

    /** Id de la alerta de ese estado para el pedido (la crea el observador in-app). */
    public long idNotificacion(long pedidoId, String estado) {
        return contar("SELECT id_notificacion FROM notificacion WHERE pedido_id = ? AND estado = ?",
                pedidoId, estado);
    }

    public boolean notificacionLeida(long idNotificacion) {
        return "t".equals(texto("SELECT leida FROM notificacion WHERE id_notificacion = ?", idNotificacion));
    }

    /** Cantidad del producto en el carrito ACTIVO del cliente (0 si no está). */
    public int cantidadEnCarrito(long clienteId, long productoId) {
        return contar("""
                SELECT COALESCE(SUM(cd.cantidad), 0) FROM carrito_detalle cd
                JOIN carrito c ON c.id_carrito = cd.carrito_id
                WHERE c.usuario_id = ? AND c.estado = 'ACTIVO' AND cd.producto_id = ?
                """, clienteId, productoId);
    }

    public int revisionCarrito(long clienteId) {
        return contar("SELECT revision FROM carrito WHERE usuario_id = ? AND estado = 'ACTIVO'", clienteId);
    }

    public void desactivarProducto(long productoId) {
        ejecutar("UPDATE producto SET activo = FALSE WHERE id = ?", productoId);
    }

    /** Desactiva a los administradores activos salvo los indicados y devuelve sus ids para restaurarlos. */
    public java.util.List<Long> desactivarAdminsExcepto(long... conservar) {
        java.util.List<Long> desactivados = new java.util.ArrayList<>();
        Long[] excluidos = java.util.Arrays.stream(conservar).boxed().toArray(Long[]::new);
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(
                     "UPDATE usuario SET activo = FALSE WHERE rol = 'ADMIN' AND activo "
                             + "AND NOT (id_usuario = ANY (?)) RETURNING id_usuario")) {
            consulta.setArray(1, conexion.createArrayOf("bigint", excluidos));
            try (ResultSet rs = consulta.executeQuery()) {
                while (rs.next()) {
                    desactivados.add(rs.getLong(1));
                }
            }
        } catch (SQLException error) {
            throw new IllegalStateException(error);
        }
        return desactivados;
    }

    public void reactivarUsuarios(java.util.List<Long> ids) {
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(
                     "UPDATE usuario SET activo = TRUE WHERE id_usuario = ANY (?)")) {
            consulta.setArray(1, conexion.createArrayOf("bigint", ids.toArray(Long[]::new)));
            consulta.executeUpdate();
        } catch (SQLException error) {
            throw new IllegalStateException(error);
        }
    }

    public int adminsActivos() {
        return contar("SELECT COUNT(*) FROM usuario WHERE rol = 'ADMIN' AND activo");
    }

    public boolean usuarioActivo(long id) {
        return "t".equals(texto("SELECT activo FROM usuario WHERE id_usuario = ?", id));
    }

    /** Categoría activa con nombre único; devuelve su nombre. */
    public String crearCategoria() {
        String nombre = "Cat-" + UUID.randomUUID().toString().substring(0, 8);
        ejecutar("INSERT INTO categoria (nombre) VALUES (?)", nombre);
        return nombre;
    }

    public String nombreEnPedido(long pedidoId, long productoId) {
        return texto("SELECT nombre_producto || '|' || precio_unitario FROM pedido_detalle "
                + "WHERE pedido_id = ? AND producto_id = ?", pedidoId, productoId);
    }

    public String skuDe(long productoId) {
        return texto("SELECT sku FROM producto WHERE id = ?", productoId);
    }

    /** Fija la fecha de creación del pedido (escenarios de reportes con rango de fechas). */
    public void fecharPedido(long pedidoId, String fechaIso) {
        ejecutar("UPDATE pedido SET creado_en = ?::timestamptz WHERE id_pedido = ?", fechaIso, pedidoId);
    }

    /** Fija la fecha de todos los movimientos del producto. */
    public void fecharMovimientos(long productoId, String fechaIso) {
        ejecutar("UPDATE movimiento_inventario SET fecha = ?::timestamptz WHERE producto_id = ?", fechaIso, productoId);
    }

    public long idDetallePedido(long pedidoId, long productoId) {
        return contar("SELECT id_detalle FROM pedido_detalle WHERE pedido_id = ? AND producto_id = ?",
                pedidoId, productoId);
    }

    public long idDetalleDevolucion(long devolucionId, long pedidoDetalleId) {
        return contar("SELECT id_detalle_devolucion FROM detalle_devolucion "
                + "WHERE devolucion_id = ? AND pedido_detalle_id = ?", devolucionId, pedidoDetalleId);
    }

    public String estadoDevolucion(long devolucionId) {
        return texto("SELECT estado FROM devolucion WHERE id_devolucion = ?", devolucionId);
    }

    public boolean devolucionTieneFechaCierre(long devolucionId) {
        return contar("SELECT COUNT(*) FROM devolucion WHERE id_devolucion = ? AND fecha_cierre IS NOT NULL",
                devolucionId) == 1;
    }

    /** Monto reembolsado del pago del pedido, en céntimos para comparar sin decimales. */
    public long centimosReembolsados(long pedidoId) {
        return contar("SELECT COALESCE(SUM(monto_reembolsado * 100), 0)::bigint FROM pago WHERE pedido_id = ?",
                pedidoId);
    }

    public String estadoReclamo(long idReclamo) {
        return texto("SELECT estado FROM reclamo WHERE id_reclamo = ?", idReclamo);
    }

    /** Responsable de soporte o administrador del reclamo (0 si no hay). */
    public long responsableReclamo(long idReclamo, String columna) {
        if (!columna.equals("soporte_id") && !columna.equals("admin_id")) {
            throw new IllegalArgumentException("Columna no permitida: " + columna);
        }
        return contar("SELECT COALESCE(" + columna + ", 0) FROM reclamo WHERE id_reclamo = ?", idReclamo);
    }

    public int notificacionesDeEstado(long usuarioId, long pedidoId, String estado) {
        return notificacionesDe(usuarioId, pedidoId, estado);
    }

    public int enviosDe(long pedidoId) {
        return contar("SELECT COUNT(*) FROM envio WHERE pedido_id = ?", pedidoId);
    }

    public int enviosEntregados(long pedidoId) {
        return contar("SELECT COUNT(*) FROM envio WHERE pedido_id = ? AND entregado_en IS NOT NULL", pedidoId);
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

    public int movimientosDeTipo(long productoId, String tipo) {
        return contar("SELECT COUNT(*) FROM movimiento_inventario WHERE producto_id = ? AND tipo = ?",
                productoId, tipo);
    }

    public int historialDe(long pedidoId, String estado) {
        return contar("SELECT COUNT(*) FROM pedido_historial_estado WHERE pedido_id = ? AND estado = ?",
                pedidoId, estado);
    }

    public int pagosEnEstado(long pedidoId, String estado) {
        return contar("SELECT COUNT(*) FROM pago WHERE pedido_id = ? AND estado = ?", pedidoId, estado);
    }

    public String estadoPedido(long pedidoId) {
        return texto("SELECT estado FROM pedido WHERE id_pedido = ?", pedidoId);
    }

    /** Lleva un pedido a otro estado sin pasar por la API (preparación de escenarios). */
    public void forzarEstadoPedido(long pedidoId, String estado) {
        ejecutar("UPDATE pedido SET estado = ? WHERE id_pedido = ?", estado, pedidoId);
    }

    public int lineasCarrito(long carritoId) {
        return contar("SELECT COUNT(*) FROM carrito_detalle WHERE carrito_id = ?", carritoId);
    }

    public String estadoCarrito(long carritoId) {
        return texto("SELECT estado FROM carrito WHERE id_carrito = ?", carritoId);
    }

    private String texto(String sql, Object... parametros) {
        try (Connection conexion = dataSource.getConnection();
             PreparedStatement consulta = conexion.prepareStatement(sql)) {
            asignar(consulta, parametros);
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
