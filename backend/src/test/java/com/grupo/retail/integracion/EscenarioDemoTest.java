package com.grupo.retail.integracion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Escenario unificado de desarrollo y demostración (perfil «dev»: migraciones db/dev y db/demo).
 *
 * <p>Levanta su propia base PostgreSQL: no comparte la de {@link BaseIntegracionPostgres}, porque
 * las migraciones demo no deben aplicarse sobre la base de las demás pruebas (Flyway rechazaría las
 * migraciones aplicadas que ya no encuentra) ni sumar datos que alteren sus conteos. Solo corre con
 * el perfil {@code dev}; los perfiles normales nunca cargan estas migraciones.</p>
 */
@SpringBootTest
@ActiveProfiles("dev")
class EscenarioDemoTest {

    private static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("retail_demo_test")
            .withUsername("demo_user")
            .withPassword("demo_pass")
            .withReuse(false);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void propiedades(DynamicPropertyRegistry registro) {
        registro.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registro.add("spring.datasource.username", POSTGRES::getUsername);
        registro.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private DataSource dataSource;

    private long numero(String sql) throws SQLException {
        try (Connection conexion = dataSource.getConnection();
                Statement consulta = conexion.createStatement();
                ResultSet resultado = consulta.executeQuery(sql)) {
            resultado.next();
            return resultado.getLong(1);
        }
    }

    /** Pares clave → valor de una consulta de dos columnas, en el orden devuelto. */
    private Map<String, Long> conteos(String sql) throws SQLException {
        Map<String, Long> mapa = new LinkedHashMap<>();
        try (Connection conexion = dataSource.getConnection();
                Statement consulta = conexion.createStatement();
                ResultSet resultado = consulta.executeQuery(sql)) {
            while (resultado.next()) {
                mapa.put(resultado.getString(1), resultado.getLong(2));
            }
        }
        return mapa;
    }

    private List<String> texto(String sql) throws SQLException {
        List<String> filas = new ArrayList<>();
        try (Connection conexion = dataSource.getConnection();
                Statement consulta = conexion.createStatement();
                ResultSet resultado = consulta.executeQuery(sql)) {
            while (resultado.next()) {
                filas.add(resultado.getString(1));
            }
        }
        return filas;
    }

    private void sinFilas(String descripcion, String sqlQueDevuelveInfracciones) throws SQLException {
        assertEquals(List.of(), texto(sqlQueDevuelveInfracciones), descripcion);
    }

    @Test
    @DisplayName("Cuentas: las 12 cuentas del escenario existen, activas y con su rol")
    void cuentasConSuRol() throws SQLException {
        Map<String, String> roles = new LinkedHashMap<>();
        roles.put("lucia.paredes@pixelandino.example", "ADMIN");
        roles.put("diego.salazar@pixelandino.example", "VENDEDOR");
        roles.put("marco.huaman@pixelandino.example", "ALMACEN");
        roles.put("andrea.flores@pixelandino.example", "SOPORTE");
        roles.put("javier.ccori@pixelandino.example", "SOPORTE");
        roles.put("carmen.vargas@correo.example", "CLIENTE");
        roles.put("renzo.gutierrez@correo.example", "CLIENTE");
        roles.put("sofia.medina@correo.example", "CLIENTE");
        roles.put("luis.chavez@correo.example", "CLIENTE");
        roles.put("valeria.rojas@correo.example", "CLIENTE");
        roles.put("oscar.ticona@correo.example", "CLIENTE");
        for (Map.Entry<String, String> cuenta : roles.entrySet()) {
            assertEquals(1, numero("SELECT COUNT(*) FROM usuario WHERE correo = '" + cuenta.getKey()
                    + "' AND rol = '" + cuenta.getValue() + "' AND activo"), cuenta.getKey());
        }
        assertEquals(11, numero("SELECT COUNT(*) FROM usuario"), "solo las cuentas del escenario");
        assertEquals("Lucía Paredes Quispe", texto("SELECT nombre FROM usuario WHERE correo = 'lucia.paredes@pixelandino.example'").get(0));
        assertEquals("Carmen Vargas Lozano", texto("SELECT nombre FROM usuario WHERE correo = 'carmen.vargas@correo.example'").get(0));
        // Las cuentas con correo viejo de V1000 ya no existen y todas comparten la misma clave (mismo hash).
        assertEquals(0, numero("SELECT COUNT(*) FROM usuario WHERE correo LIKE '%.prueba@example.com' OR correo = 'registro.web@example.com'"));
        assertEquals(1, numero("SELECT COUNT(DISTINCT clave_hash) FROM usuario"));
    }

    @Test
    @DisplayName("Kardex: el stock es la suma de sus movimientos, nunca negativo, ni en ningún momento del tiempo")
    void stockCoincideConKardex() throws SQLException {
        sinFilas("stock distinto de la suma del kardex", """
                SELECT p.sku FROM producto p
                WHERE p.stock <> COALESCE((SELECT SUM(m.cantidad_firmada) FROM movimiento_inventario m WHERE m.producto_id = p.id), 0)
                """);
        assertEquals(0, numero("SELECT COUNT(*) FROM producto WHERE stock < 0"));
        sinFilas("saldo negativo en algún momento", """
                SELECT producto_id::text FROM (
                    SELECT producto_id, SUM(cantidad_firmada) OVER (PARTITION BY producto_id ORDER BY fecha, id) AS saldo
                    FROM movimiento_inventario) t
                WHERE saldo < 0
                """);
        // Signos como los registra la aplicación.
        sinFilas("tipo y signo del movimiento", """
                SELECT id::text FROM movimiento_inventario
                WHERE (tipo = 'SALIDA' AND cantidad_firmada >= 0)
                   OR (tipo IN ('CANCELACION', 'DEVOLUCION', 'ENTRADA') AND cantidad_firmada <= 0)
                """);
    }

    @Test
    @DisplayName("Pedidos: el total es la suma del detalle y del pago, y el estado es el último del historial")
    void totalesYEstados() throws SQLException {
        sinFilas("total distinto de la suma del detalle", """
                SELECT p.id_pedido::text FROM pedido p
                WHERE p.total <> (SELECT SUM(d.subtotal) FROM pedido_detalle d WHERE d.pedido_id = p.id_pedido)
                   OR p.total <> (SELECT SUM(g.monto) FROM pago g WHERE g.pedido_id = p.id_pedido)
                """);
        sinFilas("estado distinto del último del historial", """
                SELECT p.id_pedido::text FROM pedido p
                WHERE p.estado <> (SELECT h.estado FROM pedido_historial_estado h WHERE h.pedido_id = p.id_pedido
                                   ORDER BY h.fecha DESC, h.id_historial DESC LIMIT 1)
                """);
        sinFilas("secuencia de estados no válida", """
                SELECT pedido_id::text FROM (
                    SELECT pedido_id, string_agg(estado, '>' ORDER BY fecha, id_historial) AS camino
                    FROM pedido_historial_estado GROUP BY pedido_id) t
                WHERE camino NOT IN ('PENDIENTE', 'PENDIENTE>EN_PREPARACION', 'PENDIENTE>EN_PREPARACION>DESPACHADO',
                                     'PENDIENTE>EN_PREPARACION>DESPACHADO>ENTREGADO', 'PENDIENTE>CANCELADO')
                """);
        // Pago aprobado, salvo los cancelados (reversado, como PedidoService.cancelarPedido).
        sinFilas("estado del pago", """
                SELECT p.id_pedido::text FROM pedido p JOIN pago g ON g.pedido_id = p.id_pedido
                WHERE (p.estado = 'CANCELADO' AND g.estado <> 'REVERSADO') OR (p.estado <> 'CANCELADO' AND g.estado <> 'APROBADO')
                """);
        // Envío con transportista real y código de seguimiento en cuanto se despacha.
        sinFilas("envío de pedidos despachados o entregados", """
                SELECT p.id_pedido::text FROM pedido p LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE (p.estado IN ('DESPACHADO', 'ENTREGADO')) <> (e.pedido_id IS NOT NULL)
                   OR (e.pedido_id IS NOT NULL AND e.transportista NOT IN ('Olva Courier', 'Shalom', 'Serpost'))
                   OR (p.estado = 'ENTREGADO') <> (e.entregado_en IS NOT NULL)
                """);
        sinFilas("avisos al cliente por cambio de estado", """
                SELECT h.pedido_id::text FROM pedido_historial_estado h
                LEFT JOIN notificacion n ON n.pedido_id = h.pedido_id AND n.estado = h.estado AND n.creada_en = h.fecha
                WHERE n.id_notificacion IS NULL
                """);
    }

    @Test
    @DisplayName("Conteos exactos: inventario (2 agotados, 3 con stock bajo), pedidos (20) y atención")
    void conteosExactos() throws SQLException {
        // Punto 5: productos activos, SKU V1001 y jerarquía Composite de Periféricos (heredado de DatosDevTest)
        assertEquals(2, numero("SELECT COUNT(*) FROM producto WHERE activo AND stock = 0"), "agotados");
        assertEquals(3, numero("SELECT COUNT(*) FROM producto WHERE activo AND stock BETWEEN 1 AND 5"), "stock bajo");
        assertEquals(32, numero("SELECT COUNT(*) FROM producto WHERE activo"), "el catálogo es el de V1001");
        assertEquals(32, numero("SELECT COUNT(*) FROM producto WHERE sku BETWEEN 'PA-0001' AND 'PA-0032' AND length(sku) = 7"),
                "deben cargarse los 32 SKU demo");
        assertEquals(4, numero("SELECT COUNT(*) FROM categoria WHERE categoria_padre_id = (SELECT id_categoria FROM categoria WHERE nombre = 'Periféricos')"),
                "Periféricos debe ser padre de 4 subcategorías");
        assertEquals(0, numero("""
                SELECT COUNT(*) FROM carrito c
                JOIN usuario u ON u.id_usuario = c.usuario_id
                JOIN carrito_detalle cd ON cd.carrito_id = c.id_carrito
                JOIN producto p ON p.id = cd.producto_id
                WHERE u.correo = 'carmen.vargas@correo.example' AND c.estado = 'ACTIVO' AND p.activo = FALSE
                """), "el carrito demo no debe contener productos inactivos");
        assertTrue(numero("""
                SELECT COUNT(*) FROM carrito c
                JOIN usuario u ON u.id_usuario = c.usuario_id
                JOIN carrito_detalle cd ON cd.carrito_id = c.id_carrito
                JOIN producto p ON p.id = cd.producto_id
                WHERE u.correo = 'carmen.vargas@correo.example' AND c.estado = 'ACTIVO'
                  AND p.activo = TRUE AND p.stock >= cd.cantidad
                """) >= 1, "el carrito demo debe traer al menos un producto comprable");
        // Punto 6: pedidos
        assertEquals(20, numero("SELECT COUNT(*) FROM pedido"));
        assertEquals(Map.of("PENDIENTE", 4L, "EN_PREPARACION", 3L, "DESPACHADO", 2L, "ENTREGADO", 9L, "CANCELADO", 2L),
                conteos("SELECT estado, COUNT(*) FROM pedido GROUP BY estado"));
        assertEquals(6, numero("SELECT COUNT(DISTINCT usuario_id) FROM pedido"), "repartidos entre los 6 clientes");
        assertEquals(1, numero("""
                SELECT COUNT(*) FROM pedido_historial_estado h JOIN usuario u ON u.id_usuario = h.responsable_id
                WHERE h.estado = 'CANCELADO' AND u.rol = 'CLIENTE'"""), "cancelado por el cliente");
        assertEquals(1, numero("""
                SELECT COUNT(*) FROM pedido_historial_estado h JOIN usuario u ON u.id_usuario = h.responsable_id
                WHERE h.estado = 'CANCELADO' AND u.rol = 'VENDEDOR'"""), "cancelado por el vendedor");
        assertEquals(2, numero("SELECT COUNT(DISTINCT pedido_id) FROM movimiento_inventario WHERE tipo = 'CANCELACION'"),
                "los dos cancelados reponen stock");
        // Punto 7: reclamos, devoluciones y consultas
        assertEquals(6, numero("SELECT COUNT(*) FROM reclamo"));
        assertEquals(Map.of("ABIERTO", 2L, "EN_ATENCION", 2L, "ESCALADO", 1L, "RESUELTO", 1L),
                conteos("SELECT estado, COUNT(*) FROM reclamo GROUP BY estado"));
        assertEquals(6, numero("SELECT COUNT(*) FROM reclamo r JOIN pedido p ON p.id_pedido = r.pedido_id WHERE p.estado = 'ENTREGADO'"),
                "todos sobre pedidos entregados");
        assertEquals(1, numero("SELECT COUNT(*) FROM reclamo WHERE estado = 'ABIERTO' AND creado_en < NOW() - INTERVAL '48 hours'"));
        assertEquals(1, numero("SELECT COUNT(*) FROM reclamo WHERE estado = 'ABIERTO' AND creado_en > NOW() - INTERVAL '24 hours'"));
        assertEquals(2, numero("""
                SELECT COUNT(DISTINCT r.soporte_id) FROM reclamo r
                WHERE r.estado = 'EN_ATENCION' AND r.respuesta IS NOT NULL"""), "un reclamo en atención por agente, con respuesta");
        assertEquals(1, numero("SELECT COUNT(*) FROM reclamo WHERE estado = 'ESCALADO' AND motivo_escalamiento IS NOT NULL"));
        assertEquals(1, numero("SELECT COUNT(*) FROM reclamo WHERE estado = 'RESUELTO' AND respuesta IS NOT NULL"));
        assertEquals(4, numero("SELECT COUNT(*) FROM devolucion"));
        assertEquals(Map.of("SOLICITADA", 1L, "APROBADA", 1L, "CERRADA", 1L, "RECHAZADA", 1L),
                conteos("SELECT estado, COUNT(*) FROM devolucion GROUP BY estado"));
        assertEquals(1, numero("""
                SELECT COUNT(*) FROM devolucion v
                JOIN pago g ON g.pedido_id = v.pedido_id AND g.monto_reembolsado = v.importe_reembolso
                JOIN detalle_devolucion d ON d.devolucion_id = v.id_devolucion AND d.reintegrar_stock
                JOIN movimiento_inventario m ON m.devolucion_id = v.id_devolucion AND m.tipo = 'DEVOLUCION'
                     AND m.cantidad_firmada = d.cantidad AND m.producto_id = d.producto_id
                WHERE v.estado = 'CERRADA'"""), "devolución cerrada: reembolso y reingreso al kardex");
        assertEquals(1, numero("SELECT COUNT(*) FROM devolucion WHERE estado = 'RECHAZADA' AND observacion IS NOT NULL"));
        assertEquals(5, numero("SELECT COUNT(*) FROM consulta_producto"));
        assertEquals(3, numero("SELECT COUNT(*) FROM consulta_producto WHERE respuesta IS NULL"));
        assertEquals(2, numero("""
                SELECT COUNT(*) FROM consulta_producto c JOIN usuario u ON u.id_usuario = c.vendedor_id
                WHERE c.respuesta IS NOT NULL AND u.rol = 'VENDEDOR'"""), "dos respondidas por el vendedor");
    }

    @Test
    @DisplayName("Fechas: ninguna es futura, todas caen en los últimos 14 días (con la carga inicial) y respetan el orden lógico")
    void fechasYOrdenLogico() throws SQLException {
        String union = """
                SELECT 'usuario' AS t, fecha_alta AS f FROM usuario
                UNION ALL SELECT 'pedido', creado_en FROM pedido UNION ALL SELECT 'pedido.actualizado', actualizado_en FROM pedido
                UNION ALL SELECT 'pago', creado_en FROM pago
                UNION ALL SELECT 'historial', fecha FROM pedido_historial_estado
                UNION ALL SELECT 'envio.despachado', despachado_en FROM envio
                UNION ALL SELECT 'envio.entregado', entregado_en FROM envio WHERE entregado_en IS NOT NULL
                UNION ALL SELECT 'notificacion', creada_en FROM notificacion
                UNION ALL SELECT 'kardex', fecha FROM movimiento_inventario
                UNION ALL SELECT 'reclamo', creado_en FROM reclamo UNION ALL SELECT 'reclamo.actualizado', actualizado_en FROM reclamo
                UNION ALL SELECT 'devolucion', creado_en FROM devolucion
                UNION ALL SELECT 'devolucion.actualizada', actualizado_en FROM devolucion
                UNION ALL SELECT 'devolucion.cierre', fecha_cierre FROM devolucion WHERE fecha_cierre IS NOT NULL
                UNION ALL SELECT 'consulta', creada_en FROM consulta_producto
                UNION ALL SELECT 'consulta.respuesta', respondida_en FROM consulta_producto WHERE respondida_en IS NOT NULL
                UNION ALL SELECT 'auditoria', fecha FROM registro_auditoria
                """;
        sinFilas("fechas futuras", "SELECT DISTINCT t FROM (" + union + ") x WHERE f > NOW()");
        sinFilas("fechas fuera de los últimos 14 días", "SELECT DISTINCT t FROM (" + union
                + ") x WHERE f < NOW() - INTERVAL '14 days 6 hours' AND t NOT IN ('usuario')");
        // pedido → pago → preparación → despacho → entrega
        sinFilas("pago antes del pedido o historial inicial distinto de la creación", """
                SELECT p.id_pedido::text FROM pedido p
                JOIN pago g ON g.pedido_id = p.id_pedido
                JOIN pedido_historial_estado h ON h.pedido_id = p.id_pedido AND h.estado = 'PENDIENTE'
                WHERE g.creado_en < p.creado_en OR h.fecha <> p.creado_en
                """);
        sinFilas("historial no creciente", """
                SELECT pedido_id::text FROM (
                    SELECT pedido_id, fecha, LAG(fecha) OVER (PARTITION BY pedido_id ORDER BY id_historial) AS anterior
                    FROM pedido_historial_estado) t
                WHERE anterior IS NOT NULL AND fecha <= anterior
                """);
        sinFilas("envío no coincide con su historial", """
                SELECT e.pedido_id::text FROM envio e
                LEFT JOIN pedido_historial_estado d ON d.pedido_id = e.pedido_id AND d.estado = 'DESPACHADO'
                LEFT JOIN pedido_historial_estado t ON t.pedido_id = e.pedido_id AND t.estado = 'ENTREGADO'
                WHERE e.despachado_en <> d.fecha OR (e.entregado_en IS NOT NULL AND e.entregado_en <> t.fecha)
                """);
        sinFilas("kardex de venta y cancelación no coincide con el pedido", """
                SELECT m.id::text FROM movimiento_inventario m JOIN pedido p ON p.id_pedido = m.pedido_id
                LEFT JOIN pedido_historial_estado c ON c.pedido_id = p.id_pedido AND c.estado = 'CANCELADO'
                WHERE (m.tipo = 'SALIDA' AND m.fecha <> p.creado_en)
                   OR (m.tipo = 'CANCELACION' AND m.fecha <> c.fecha)
                """);
        // reclamo / devolución después de la entrega, respuesta después de la pregunta
        sinFilas("reclamo antes de la entrega o actualizado antes de crearse", """
                SELECT r.id_reclamo::text FROM reclamo r
                JOIN pedido_historial_estado h ON h.pedido_id = r.pedido_id AND h.estado = 'ENTREGADO'
                WHERE r.creado_en <= h.fecha OR r.actualizado_en < r.creado_en
                """);
        sinFilas("devolución antes de la entrega o cierre incoherente", """
                SELECT v.id_devolucion::text FROM devolucion v
                JOIN pedido_historial_estado h ON h.pedido_id = v.pedido_id AND h.estado = 'ENTREGADO'
                WHERE v.creado_en <= h.fecha OR v.actualizado_en < v.creado_en
                   OR (v.estado = 'CERRADA') <> (v.fecha_cierre IS NOT NULL)
                   OR (v.fecha_cierre IS NOT NULL AND v.fecha_cierre <= v.creado_en)
                """);
        sinFilas("respuesta de consulta anterior a la pregunta", """
                SELECT id_consulta::text FROM consulta_producto WHERE respondida_en IS NOT NULL AND respondida_en <= creada_en
                """);
        sinFilas("cliente que compra antes de darse de alta", """
                SELECT u.correo FROM usuario u JOIN pedido p ON p.usuario_id = u.id_usuario WHERE p.creado_en < u.fecha_alta
                """);
    }

    @Test
    @DisplayName("Auditoría: un registro por cada cambio de estado y las acciones de gestión, con los códigos de la aplicación")
    void auditoriaCoherente() throws SQLException {
        assertEquals(numero("SELECT COUNT(*) FROM pedido_historial_estado"),
                numero("SELECT COUNT(*) FROM registro_auditoria WHERE accion = 'PEDIDO_ESTADO' AND entidad = 'PEDIDO'"));
        sinFilas("historial sin registro de auditoría", """
                SELECT h.id_historial::text FROM pedido_historial_estado h
                LEFT JOIN registro_auditoria a ON a.accion = 'PEDIDO_ESTADO' AND a.entidad = 'PEDIDO'
                     AND a.entidad_id = h.pedido_id AND a.fecha = h.fecha AND a.usuario_id = h.responsable_id
                WHERE a.id_auditoria IS NULL
                """);
        assertEquals(numero("SELECT COUNT(*) FROM notificacion WHERE estado LIKE 'RECLAMO\\_%'"),
                numero("SELECT COUNT(*) FROM registro_auditoria WHERE entidad = 'RECLAMO'"));
        assertEquals(numero("SELECT COUNT(*) FROM notificacion WHERE estado LIKE 'DEVOLUCION\\_%'"),
                numero("SELECT COUNT(*) FROM registro_auditoria WHERE entidad = 'DEVOLUCION'"));
        assertEquals(3, numero("SELECT COUNT(*) FROM registro_auditoria WHERE accion = 'STOCK_AJUSTADO'"),
                "uno por cada ajuste del vendedor");
        assertEquals(3, numero("SELECT COUNT(*) FROM movimiento_inventario WHERE tipo = 'AJUSTE'"));
        assertEquals(2, numero("SELECT COUNT(*) FROM registro_auditoria WHERE accion = 'PRECIO_CAMBIADO'"));
        assertEquals(1, numero("""
                SELECT COUNT(*) FROM registro_auditoria
                WHERE accion = 'CUENTA_CREADA' AND rol = 'ADMIN' AND detalle = 'javier.ccori@pixelandino.example como SOPORTE'"""));
        assertEquals(1, numero("""
                SELECT COUNT(*) FROM registro_auditoria
                WHERE accion = 'REPORTE_DESCARGADO' AND detalle LIKE 'ventas.csv (%' AND rol = 'ADMIN'"""));
        assertEquals(0, numero("SELECT COUNT(*) FROM registro_auditoria WHERE accion = 'INICIO_SESION' AND (rol IS NULL OR usuario_correo IS NULL)"),
                "los inicios de sesión llevan el correo y el rol del actor");
    }
}
