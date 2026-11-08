package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
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
    private static final String STOCK_SQL = """
            SELECT COUNT(*) AS productos, COALESCE(SUM(stock), 0) AS unidades,
                   COALESCE(SUM(precio * stock), 0) AS valor
            FROM producto
            WHERE activo = TRUE
            """;

    private final ProveedorConexiones proveedorConexiones;

    public ReporteDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public ResumenAdministrativo obtenerResumen(OffsetDateTime desde, OffsetDateTime hasta) {
        StringBuilder ventasSql = new StringBuilder("""
                SELECT COUNT(*) AS pedidos, COALESCE(SUM(total), 0) AS ventas
                FROM pedido
                WHERE estado <> 'CANCELADO'
                """);
        if (desde != null) {
            ventasSql.append(" AND creado_en >= ?");
        }
        if (hasta != null) {
            ventasSql.append(" AND creado_en <= ?");
        }

        StringBuilder movimientosSql = new StringBuilder("""
                SELECT tipo, COUNT(*) AS cantidad
                FROM movimiento_inventario
                WHERE 1 = 1
                """);
        if (desde != null) {
            movimientosSql.append(" AND fecha >= ?");
        }
        if (hasta != null) {
            movimientosSql.append(" AND fecha <= ?");
        }
        movimientosSql.append(" GROUP BY tipo ORDER BY tipo");

        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            long pedidos;
            BigDecimal ventas;
            try (PreparedStatement consulta = conexion.prepareStatement(ventasSql.toString())) {
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
            try (PreparedStatement consulta = conexion.prepareStatement(STOCK_SQL);
                    ResultSet fila = consulta.executeQuery()) {
                fila.next();
                productos = fila.getLong("productos");
                unidades = fila.getLong("unidades");
                valor = fila.getBigDecimal("valor");
            }
            Map<String, Long> movimientos = new LinkedHashMap<>();
            try (PreparedStatement consulta = conexion.prepareStatement(movimientosSql.toString())) {
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
            throw new ErrorAccesoDatosException("No se pudo generar el resumen administrativo", error);
        }
    }

    public List<VentaReporte> listarVentas(OffsetDateTime desde, OffsetDateTime hasta) {
        StringBuilder sql = new StringBuilder("""
                SELECT p.id_pedido, p.creado_en, p.estado, u.nombre AS cliente, p.total
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                WHERE p.estado <> 'CANCELADO'
                """);
        if (desde != null) {
            sql.append(" AND p.creado_en >= ?");
        }
        if (hasta != null) {
            sql.append(" AND p.creado_en <= ?");
        }
        sql.append(" ORDER BY p.creado_en, p.id_pedido");

        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql.toString())) {
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
            throw new ErrorAccesoDatosException("No se pudo exportar el reporte de ventas", error);
        }
    }

    private static void aplicarFechas(
            PreparedStatement consulta, OffsetDateTime desde, OffsetDateTime hasta) throws SQLException {
        int indice = 1;
        if (desde != null) consulta.setObject(indice++, desde);
        if (hasta != null) consulta.setObject(indice, hasta);
    }
}
