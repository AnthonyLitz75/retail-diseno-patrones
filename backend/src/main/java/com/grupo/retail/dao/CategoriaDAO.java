package com.grupo.retail.dao;

import com.grupo.retail.exception.CategoriaDuplicadaException;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.patterns.composite.ArbolCategoriaBuilder;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class CategoriaDAO {
    private final ProveedorConexiones proveedorConexiones;

    public CategoriaDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public List<Categoria> listarTodas() {
        String sql = "SELECT id_categoria, nombre, activa, categoria_padre_id FROM categoria ORDER BY nombre, id_categoria";
        List<Categoria> categorias = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql);
                ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                categorias.add(mapear(resultado));
            }
            return List.copyOf(categorias);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudieron consultar las categorías", error);
        }
    }

    public List<CategoriaComponente> listarArbol() {
        String sqlCategorias = """
                SELECT id_categoria, nombre, activa, categoria_padre_id
                FROM categoria
                WHERE activa = TRUE
                ORDER BY id_categoria
                """;
        String sqlConteos = """
                SELECT categoria_id, COUNT(*) AS total
                FROM producto
                WHERE activo = TRUE AND categoria_id IS NOT NULL
                GROUP BY categoria_id
                """;
        String sqlSinCategoria = """
                SELECT COUNT(*) AS total
                FROM producto
                WHERE activo = TRUE AND categoria_id IS NULL
                """;

        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            List<Categoria> categorias = new ArrayList<>();
            try (PreparedStatement consulta = conexion.prepareStatement(sqlCategorias);
                    ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    categorias.add(mapear(resultado));
                }
            }

            Map<Long, Integer> conteoPorCategoria = new HashMap<>();
            try (PreparedStatement consulta = conexion.prepareStatement(sqlConteos);
                    ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    conteoPorCategoria.put(resultado.getLong("categoria_id"), resultado.getInt("total"));
                }
            }

            int productosSinCategoria = 0;
            try (PreparedStatement consulta = conexion.prepareStatement(sqlSinCategoria);
                    ResultSet resultado = consulta.executeQuery()) {
                if (resultado.next()) {
                    productosSinCategoria = resultado.getInt("total");
                }
            }

            return ArbolCategoriaBuilder.construirArbol(categorias, conteoPorCategoria, productosSinCategoria);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo construir el árbol de categorías", error);
        }
    }

    /**
     * @deprecated La lógica de ensamblado del patrón Composite se trasladó a {@link ArbolCategoriaBuilder#construirArbol}.
     * Se mantiene este método delegado para compatibilidad hacia atrás.
     */
    @Deprecated(since = "1.1")
    public static List<CategoriaComponente> construirArbol(
            List<Categoria> categorias,
            Map<Long, Integer> conteoPorCategoria,
            int productosSinCategoria) {
        return ArbolCategoriaBuilder.construirArbol(categorias, conteoPorCategoria, productosSinCategoria);
    }

    public Categoria crear(String nombre) {
        String sql = """
                INSERT INTO categoria (nombre, activa)
                VALUES (?, TRUE)
                RETURNING id_categoria, nombre, activa, categoria_padre_id
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, nombre);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("PostgreSQL no devolvió la categoría creada");
                }
                return mapear(resultado);
            }
        } catch (SQLException error) {
            if ("23505".equals(error.getSQLState())) {
                throw new CategoriaDuplicadaException();
            }
            throw new IllegalStateException("No se pudo crear la categoría", error);
        }
    }

    public Optional<Categoria> actualizarNombre(Long id, String nombre) {
        String sql = """
                UPDATE categoria SET nombre = ?
                WHERE id_categoria = ?
                RETURNING id_categoria, nombre, activa, categoria_padre_id
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, nombre);
            consulta.setLong(2, id);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        } catch (SQLException error) {
            if ("23505".equals(error.getSQLState())) {
                throw new CategoriaDuplicadaException();
            }
            throw new IllegalStateException("No se pudo actualizar la categoría", error);
        }
    }

    public Optional<Categoria> actualizarEstado(Long id, boolean activa) {
        String sql = """
                UPDATE categoria SET activa = ?
                WHERE id_categoria = ?
                RETURNING id_categoria, nombre, activa, categoria_padre_id
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setBoolean(1, activa);
            consulta.setLong(2, id);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapear(resultado)) : Optional.empty();
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo actualizar el estado de la categoría", error);
        }
    }

    private Categoria mapear(ResultSet resultado) throws SQLException {
        return new Categoria(
                resultado.getLong("id_categoria"),
                resultado.getString("nombre"),
                resultado.getBoolean("activa"),
                resultado.getObject("categoria_padre_id", Long.class));
    }
}
