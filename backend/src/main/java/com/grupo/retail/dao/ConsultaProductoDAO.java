package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.ConsultaProducto;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Repository
public class ConsultaProductoDAO {
    private static final String SELECT_CONSULTAS = """
            SELECT c.id_consulta, c.producto_id, p.nombre AS nombre_producto,
                   u.nombre AS cliente_nombre, c.pregunta, c.respuesta,
                   c.creada_en, c.respondida_en
            FROM consulta_producto c
            JOIN producto p ON p.id = c.producto_id
            JOIN usuario u ON u.id_usuario = c.cliente_id
            """;

    private final ProveedorConexiones proveedorConexiones;

    public ConsultaProductoDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public ConsultaProducto crearPregunta(Long productoId, Long clienteId, String pregunta) {
        String sql = """
                INSERT INTO consulta_producto (producto_id, cliente_id, pregunta)
                SELECT id, ?, ? FROM producto WHERE id = ? AND activo = TRUE
                RETURNING id_consulta
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            long consultaId;
            try (PreparedStatement insercion = conexion.prepareStatement(sql)) {
                insercion.setLong(1, clienteId);
                insercion.setString(2, pregunta.strip());
                insercion.setLong(3, productoId);
                try (ResultSet resultado = insercion.executeQuery()) {
                    if (!resultado.next()) {
                        throw new NoSuchElementException("No existe el producto solicitado");
                    }
                    consultaId = resultado.getLong("id_consulta");
                }
            }
            return buscar(conexion, consultaId)
                    .orElseThrow(() -> new IllegalStateException("No se pudo leer la pregunta creada"));
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo registrar la pregunta", error);
        }
    }

    public List<ConsultaProducto> listarPorCliente(Long clienteId) {
        return listar(SELECT_CONSULTAS + " WHERE c.cliente_id = ?"
                + " ORDER BY c.creada_en DESC, c.id_consulta DESC", clienteId);
    }

    public List<ConsultaProducto> listarPendientes() {
        return listar(SELECT_CONSULTAS + " WHERE c.respuesta IS NULL"
                + " ORDER BY c.creada_en, c.id_consulta", null);
    }

    public boolean responder(Long consultaId, Long vendedorId, String respuesta) {
        String sql = """
                UPDATE consulta_producto
                SET respuesta = ?, vendedor_id = ?, respondida_en = CURRENT_TIMESTAMP
                WHERE id_consulta = ? AND respuesta IS NULL
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement actualizacion = conexion.prepareStatement(sql)) {
            actualizacion.setString(1, respuesta.strip());
            actualizacion.setLong(2, vendedorId);
            actualizacion.setLong(3, consultaId);
            return actualizacion.executeUpdate() == 1;
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo responder la pregunta", error);
        }
    }

    public boolean existe(Long consultaId) {
        String sql = "SELECT 1 FROM consulta_producto WHERE id_consulta = ?";
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, consultaId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next();
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo consultar la pregunta", error);
        }
    }

    private List<ConsultaProducto> listar(String sql, Long clienteId) {
        List<ConsultaProducto> consultas = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (clienteId != null) {
                consulta.setLong(1, clienteId);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    consultas.add(mapear(resultado));
                }
            }
            return List.copyOf(consultas);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar las preguntas", error);
        }
    }

    private Optional<ConsultaProducto> buscar(Connection conexion, Long consultaId)
            throws SQLException {
        String sql = SELECT_CONSULTAS + " WHERE c.id_consulta = ?";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, consultaId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        }
    }

    private ConsultaProducto mapear(ResultSet resultado) throws SQLException {
        return new ConsultaProducto(
                resultado.getLong("id_consulta"),
                resultado.getLong("producto_id"),
                resultado.getString("nombre_producto"),
                resultado.getString("cliente_nombre"),
                resultado.getString("pregunta"),
                resultado.getString("respuesta"),
                resultado.getObject("creada_en", OffsetDateTime.class),
                resultado.getObject("respondida_en", OffsetDateTime.class));
    }
}
