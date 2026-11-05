package com.grupo.retail.dao;

import com.grupo.retail.exception.CategoriaDuplicadaException;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import com.grupo.retail.patterns.composite.CategoriaCompuesta;
import com.grupo.retail.patterns.composite.CategoriaSimple;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
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

            return construirArbol(categorias, conteoPorCategoria, productosSinCategoria);
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo construir el árbol de categorías", error);
        }
    }

    public static List<CategoriaComponente> construirArbol(
            List<Categoria> categorias,
            Map<Long, Integer> conteoPorCategoria,
            int productosSinCategoria) {
        Map<Long, List<Categoria>> subcategoriasPorPadre = new HashMap<>();
        List<Categoria> principales = new ArrayList<>();

        for (Categoria cat : categorias) {
            if (cat.categoriaPadreId() == null) {
                principales.add(cat);
            } else {
                subcategoriasPorPadre
                        .computeIfAbsent(cat.categoriaPadreId(), k -> new ArrayList<>())
                        .add(cat);
            }
        }

        List<CategoriaComponente> resultado = new ArrayList<>();

        for (Categoria principal : principales) {
            List<Categoria> hijas = subcategoriasPorPadre.getOrDefault(
                    principal.idCategoria(), Collections.emptyList());
            int conteoPropio = conteoPorCategoria.getOrDefault(principal.idCategoria(), 0);

            if (!hijas.isEmpty()) {
                CategoriaCompuesta compuesta = new CategoriaCompuesta(
                        principal.idCategoria(), principal.nombre(), conteoPropio);
                for (Categoria hija : hijas) {
                    int conteoHija = conteoPorCategoria.getOrDefault(hija.idCategoria(), 0);
                    // Omitir subcategorías con 0 productos
                    if (conteoHija > 0) {
                        compuesta.agregarSubcategoria(
                                new CategoriaSimple(hija.idCategoria(), hija.nombre(), conteoHija));
                    }
                }
                // Omitir categorías compuestas si el total acumulado es 0
                if (compuesta.getTotalProductos() > 0) {
                    resultado.add(compuesta);
                }
            } else {
                // Categoría simple / hoja sin subcategorías
                if (conteoPropio > 0) {
                    resultado.add(new CategoriaSimple(
                            principal.idCategoria(), principal.nombre(), conteoPropio));
                }
            }
        }

        // Categoría virtual "Otros" para productos sin categoría asignada (solo si hay al menos uno)
        if (productosSinCategoria > 0) {
            resultado.add(new CategoriaSimple(null, "Otros", productosSinCategoria));
        }

        return resultado;
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
