package com.grupo.retail.dao;

import com.grupo.retail.model.ResumenAdministrativo;
import com.grupo.retail.model.VentaReporte;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
public class ReporteDAO {
    private final ProveedorConexiones proveedorConexiones;

    public ReporteDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public ResumenAdministrativo obtenerResumen(OffsetDateTime desde, OffsetDateTime hasta) {
        String ventasSql = """
                SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ventas
                FROM pedido
                WHERE estado <> 'CANCELADO'
                """ + filtroFecha("creado_en", desde, hasta);
        String stockSql = """
                SELECT COUNT(*) AS productos, COALESCE(SUM(stock), 0) AS unidades,
                       COALESCE(SUM(precio * stock), 0) AS valor
                FROM producto
                WHERE activo = TRUE
                """;
        String movimientosSql = """
                SELECT tipo, COUNT(*) AS cantidad
                FROM movimiento_inventario
                WHERE 1 = 1
                """ + filtroFecha("fecha", desde, hasta) + " GROUP BY tipo ORDER BY tipo";
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            long pedidos;
            BigDecimal ventas;
            try (PreparedStatement consulta = conexion.prepareStatement(ventasSql)) {
                aplicarFechas(consulta, desde, hasta);
                try (ResultSet fila = consulta.executeQuery()) {
                    fila.next();
                    pedidos = fila.getLong("pedidos");
                    ventas = fila.getBigDecimal("ventas");
                }
            }
            long productos;
            long unidades;
            BigDecimal valor;
            try (PreparedStatement consulta = conexion.prepareStatement(stockSql);
                    ResultSet fila = consulta.executeQuery()) {
                fila.next();
                productos = fila.getLong("productos");
                unidades = fila.getLong("unidades");
                valor = fila.getBigDecimal("valor");
            }
            Map<String, Long> movimientos = new LinkedHashMap<>();
            try (PreparedStatement consulta = conexion.prepareStatement(movimientosSql)) {
                aplicarFechas(consulta, desde, hasta);
                try (ResultSet filas = consulta.executeQuery()) {
                    while (filas.next()) {
                        movimientos.put(filas.getString("tipo"), filas.getLong("cantidad"));
                    }
                }
            }
            return new ResumenAdministrativo(pedidos, ventas, productos, unidades, valor,
                    Map.copyOf(movimientos));
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo generar el resumen administrativo", error);
        }
    }

    public List<VentaReporte> listarVentas(OffsetDateTime desde, OffsetDateTime hasta) {
        String sql = """
                SELECT p.id_pedido, p.creado_en, p.estado, u.nombre AS cliente, p.total
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                WHERE p.estado <> 'CANCELADO'
                """ + filtroFecha("p.creado_en", desde, hasta)
                + " ORDER BY p.creado_en, p.id_pedido";
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            aplicarFechas(consulta, desde, hasta);
            try (ResultSet filas = consulta.executeQuery()) {
                var ventas = new java.util.ArrayList<VentaReporte>();
                while (filas.next()) {
                    ventas.add(new VentaReporte(filas.getLong("id_pedido"),
                            filas.getObject("creado_en", OffsetDateTime.class),
                            filas.getString("estado"), filas.getString("cliente"),
                            filas.getBigDecimal("total")));
                }
                return List.copyOf(ventas);
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo exportar el reporte de ventas", error);
        }
    }

    private static String filtroFecha(String columna, OffsetDateTime desde, OffsetDateTime hasta) {
        StringBuilder sql = new StringBuilder();
        if (desde != null) sql.append(" AND ").append(columna).append(" >= ?");
        if (hasta != null) sql.append(" AND ").append(columna).append(" <= ?");
        return sql.toString();
    }

    private static void aplicarFechas(
            PreparedStatement consulta, OffsetDateTime desde, OffsetDateTime hasta) throws SQLException {
        int indice = 1;
        if (desde != null) consulta.setObject(indice++, desde);
        if (hasta != null) consulta.setObject(indice, hasta);
    }
}
