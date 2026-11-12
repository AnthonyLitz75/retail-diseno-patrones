package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.InventarioReporte;
import com.grupo.retail.model.MovimientoReporte;
import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Consultas de reportes del administrador (RF05, RF06; spec 007). Todas las consultas son
 * constantes: el rango de fechas es opcional dentro del propio SQL (un límite nulo se
 * reemplaza por -infinity o infinity), así nunca se arma SQL en tiempo de ejecución.
 */
@Repository
public class ReporteDAO {

    /** Rango inclusivo sobre la fecha del pedido; se enlaza con (desde, hasta). */
    private static final String RANGO_PEDIDO = """
             p.creado_en >= COALESCE(CAST(? AS timestamptz), '-infinity'::timestamptz)
             AND p.creado_en <= COALESCE(CAST(? AS timestamptz), 'infinity'::timestamptz)
            """;

    /**
     * Ventas netas: pedidos no cancelados del rango. El CSV y el panel usan esta misma
     * consulta (FR-002), por eso sus totales siempre coinciden (SC-002).
     */
    private static final String VENTAS_SQL = """
            SELECT p.id_pedido, p.creado_en, u.nombre AS cliente, p.estado, p.total
            FROM pedido p
            JOIN usuario u ON u.id_usuario = p.usuario_id
            WHERE p.estado <> 'CANCELADO' AND
            """ + RANGO_PEDIDO;

    private static final String LISTAR_VENTAS_SQL = VENTAS_SQL + " ORDER BY p.creado_en, p.id_pedido";

    private static final String TOTALES_VENTAS_SQL =
            "SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ventas FROM (" + VENTAS_SQL + ") ventas";

    private static final String PEDIDOS_POR_ESTADO_SQL = """
            SELECT p.estado, COUNT(*) AS cantidad
            FROM pedido p
            WHERE
            """ + RANGO_PEDIDO + " GROUP BY p.estado ORDER BY p.estado";

    private static final String STOCK_SQL = """
            SELECT COUNT(*) AS productos, COALESCE(SUM(stock), 0) AS unidades,
                   COALESCE(SUM(precio * stock), 0) AS valor
            FROM producto
            WHERE activo = TRUE
            """;

    private static final String ESCALADOS_SQL = "SELECT COUNT(*) FROM reclamo WHERE estado = 'ESCALADO'";

    private static final String MOVIMIENTOS_SQL = """
            SELECT m.id, m.fecha, p.sku, m.tipo, m.cantidad_firmada, m.motivo, u.nombre AS responsable
            FROM movimiento_inventario m
            JOIN producto p ON p.id = m.producto_id
            LEFT JOIN usuario u ON u.id_usuario = m.usuario_responsable_id
            WHERE m.fecha >= COALESCE(CAST(? AS timestamptz), '-infinity'::timestamptz)
              AND m.fecha <= COALESCE(CAST(? AS timestamptz), 'infinity'::timestamptz)
            """;

    private static final String LISTAR_MOVIMIENTOS_SQL = MOVIMIENTOS_SQL + " ORDER BY m.fecha, m.id";

    private static final String ULTIMOS_MOVIMIENTOS_SQL = MOVIMIENTOS_SQL + " ORDER BY m.fecha DESC, m.id DESC LIMIT 10";

    private static final String MOVIMIENTOS_POR_TIPO_SQL =
            "SELECT tipo, COUNT(*) AS cantidad FROM (" + MOVIMIENTOS_SQL + ") movimientos GROUP BY tipo ORDER BY tipo";

    private static final String INVENTARIO_SQL = """
            SELECT p.sku, p.nombre, COALESCE(c.nombre, p.categoria) AS categoria, p.stock, p.activo
            FROM producto p
            LEFT JOIN categoria c ON c.id_categoria = p.categoria_id
            ORDER BY p.nombre, p.id
            """;

    private final ProveedorConexiones proveedorConexiones;

    public ReporteDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public ResumenAdministrativo obtenerResumen(OffsetDateTime desde, OffsetDateTime hasta) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            long pedidos;
            BigDecimal ventas;
            try (PreparedStatement consulta = conexion.prepareStatement(TOTALES_VENTAS_SQL)) {
                aplicarRango(consulta, desde, hasta);
                try (ResultSet fila = consulta.executeQuery()) {
                    fila.next();
                    pedidos = fila.getLong("pedidos");
                    ventas = fila.getBigDecimal("ventas");
                }
            }
            long productos;
            long unidades;
            BigDecimal valor;
            try (PreparedStatement consulta = conexion.prepareStatement(STOCK_SQL);
                    ResultSet fila = consulta.executeQuery()) {
                fila.next();
                productos = fila.getLong("productos");
                unidades = fila.getLong("unidades");
                valor = fila.getBigDecimal("valor");
            }
            long escalados;
            try (PreparedStatement consulta = conexion.prepareStatement(ESCALADOS_SQL);
                    ResultSet fila = consulta.executeQuery()) {
                fila.next();
                escalados = fila.getLong(1);
            }
            return new ResumenAdministrativo(pedidos, ventas, productos, unidades, valor,
                    contarPorClave(conexion, MOVIMIENTOS_POR_TIPO_SQL, desde, hasta),
                    contarPorClave(conexion, PEDIDOS_POR_ESTADO_SQL, desde, hasta),
                    escalados,
                    leerMovimientos(conexion, ULTIMOS_MOVIMIENTOS_SQL, desde, hasta));
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo generar el resumen administrativo", error);
        }
    }

    public List<VentaReporte> listarVentas(OffsetDateTime desde, OffsetDateTime hasta) {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(LISTAR_VENTAS_SQL)) {
            aplicarRango(consulta, desde, hasta);
            try (ResultSet filas = consulta.executeQuery()) {
                List<VentaReporte> ventas = new ArrayList<>();
                while (filas.next()) {
                    ventas.add(new VentaReporte(filas.getLong("id_pedido"),
                            filas.getObject("creado_en", OffsetDateTime.class),
                            filas.getString("estado"), filas.getString("cliente"),
                            filas.getBigDecimal("total")));
                }
                return List.copyOf(ventas);
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo exportar el reporte de ventas", error);
        }
    }

    public List<MovimientoReporte> listarMovimientos(OffsetDateTime desde, OffsetDateTime hasta) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            return leerMovimientos(conexion, LISTAR_MOVIMIENTOS_SQL, desde, hasta);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo exportar el reporte de movimientos", error);
        }
    }

    public List<InventarioReporte> listarInventario() {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(INVENTARIO_SQL);
                ResultSet filas = consulta.executeQuery()) {
            List<InventarioReporte> productos = new ArrayList<>();
            while (filas.next()) {
                productos.add(new InventarioReporte(filas.getString("sku"), filas.getString("nombre"),
                        filas.getString("categoria"), filas.getInt("stock"), filas.getBoolean("activo")));
            }
            return List.copyOf(productos);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo exportar el reporte de inventario", error);
        }
    }

    private static Map<String, Long> contarPorClave(Connection conexion, String sql,
            OffsetDateTime desde, OffsetDateTime hasta) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            aplicarRango(consulta, desde, hasta);
            try (ResultSet filas = consulta.executeQuery()) {
                Map<String, Long> conteo = new LinkedHashMap<>();
                while (filas.next()) {
                    conteo.put(filas.getString(1), filas.getLong(2));
                }
                return Map.copyOf(conteo);
            }
        }
    }

    private static List<MovimientoReporte> leerMovimientos(Connection conexion, String sql,
            OffsetDateTime desde, OffsetDateTime hasta) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            aplicarRango(consulta, desde, hasta);
            try (ResultSet filas = consulta.executeQuery()) {
                List<MovimientoReporte> movimientos = new ArrayList<>();
                while (filas.next()) {
                    movimientos.add(new MovimientoReporte(filas.getObject("fecha", OffsetDateTime.class),
                            filas.getString("sku"), filas.getString("tipo"), filas.getInt("cantidad_firmada"),
                            filas.getString("motivo"), filas.getString("responsable")));
                }
                return List.copyOf(movimientos);
            }
        }
    }

    /** Enlaza el rango; un límite nulo se envía como NULL tipado y el SQL lo vuelve infinito. */
    private static void aplicarRango(PreparedStatement consulta, OffsetDateTime desde, OffsetDateTime hasta)
            throws SQLException {
        consulta.setObject(1, desde, Types.TIMESTAMP_WITH_TIMEZONE);
        consulta.setObject(2, hasta, Types.TIMESTAMP_WITH_TIMEZONE);
    }
}
