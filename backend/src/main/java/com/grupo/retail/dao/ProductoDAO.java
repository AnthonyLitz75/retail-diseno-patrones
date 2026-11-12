package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.dto.EditarProducto;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.Producto;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class ProductoDAO {

    private static final String SELECT_PRODUCTOS = """
            SELECT p.id, p.sku, p.nombre, p.marca, COALESCE(c.nombre, p.categoria, 'Otros') AS categoria,
                   p.categoria_id, p.descripcion, p.precio, p.precio_anterior, p.stock,
                   p.nuevo, p.imagen, p.activo
            FROM producto p
            LEFT JOIN categoria c ON c.id_categoria = p.categoria_id
            """;

    private final ProveedorConexiones proveedorConexiones;

    public ProductoDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public List<Producto> listarTodos(
            String nombre,
            String categoria,
            BigDecimal precioMin,
            BigDecimal precioMax) {
        StringBuilder sql = new StringBuilder(SELECT_PRODUCTOS)
                .append(" WHERE p.activo = TRUE AND (c.activa IS NULL OR c.activa = TRUE)");
        List<Object> parametros = new ArrayList<>();

        if (nombre != null && !nombre.isBlank()) {
            sql.append(" AND (p.nombre ILIKE ? OR p.marca ILIKE ? OR p.sku ILIKE ?)");
            String patron = "%" + nombre.trim() + "%";
            parametros.add(patron);
            parametros.add(patron);
            parametros.add(patron);
        }
        if (categoria != null && !categoria.isBlank()) {
            String categoriaLimpia = categoria.trim();
            if ("Otros".equalsIgnoreCase(categoriaLimpia) || "Sin categoría".equalsIgnoreCase(categoriaLimpia)) {
                sql.append(" AND p.categoria_id IS NULL");
            } else {
                sql.append(" AND (c.nombre = ? OR c.categoria_padre_id = (SELECT id_categoria FROM categoria WHERE nombre = ?))");
                parametros.add(categoriaLimpia);
                parametros.add(categoriaLimpia);
            }
        }
        if (precioMin != null) {
            sql.append(" AND p.precio >= ?");
            parametros.add(precioMin);
        }
        if (precioMax != null) {
            sql.append(" AND p.precio <= ?");
            parametros.add(precioMax);
        }
        sql.append(" ORDER BY p.id");

        List<Producto> productos = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql.toString())) {
            for (int i = 0; i < parametros.size(); i++) {
                Object parametro = parametros.get(i);
                if (parametro instanceof BigDecimal decimal) {
                    consulta.setBigDecimal(i + 1, decimal);
                } else {
                    consulta.setString(i + 1, (String) parametro);
                }
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    productos.add(mapearProducto(resultado));
                }
            }
            return productos;
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar los productos", error);
        }
    }

    public List<Categoria> listarCategorias() {
        String sql = """
                SELECT id_categoria, nombre, activa, categoria_padre_id
                FROM categoria
                WHERE activa = TRUE
                ORDER BY nombre
                """;
        List<Categoria> categorias = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql);
                ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                categorias.add(new Categoria(
                        resultado.getLong("id_categoria"),
                        resultado.getString("nombre"),
                        resultado.getBoolean("activa"),
                        resultado.getObject("categoria_padre_id", Long.class)));
            }
            return categorias;
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar las categorías", error);
        }
    }

    public Optional<Producto> buscarPorId(Long id) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            return buscarPorId(conexion, id);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo buscar el producto", error);
        }
    }

    private Optional<Producto> buscarPorId(Connection conexion, Long id) throws SQLException {
        String sql = SELECT_PRODUCTOS + " WHERE p.id = ? AND p.activo = TRUE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, id);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next()
                        ? Optional.of(mapearProducto(resultado))
                        : Optional.empty();
            }
        }
    }

    private static final String INSERTAR_PRODUCTO_SQL = """
            INSERT INTO producto (nombre, categoria, categoria_id, precio, stock, activo)
            SELECT ?, c.nombre, c.id_categoria, ?, ?, TRUE
            FROM categoria c
            WHERE c.nombre = ? AND c.activa = TRUE
            RETURNING id, sku, nombre, marca, categoria, categoria_id, descripcion, precio, precio_anterior, stock, nuevo, imagen, activo
            """;
    private static final String BLOQUEAR_ACTIVO_SQL = SELECT_PRODUCTOS + " WHERE p.id = ? AND p.activo = TRUE FOR UPDATE OF p";

    /**
     * Inserta el producto en la categoría indicada si existe y está activa; vacío si no.
     * El stock inicial y su movimiento los registra el servicio en la misma transacción.
     */
    public Optional<Producto> insertar(Connection conexion, NuevoProducto datos) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(INSERTAR_PRODUCTO_SQL)) {
            consulta.setString(1, datos.nombre().trim());
            consulta.setBigDecimal(2, datos.precio());
            consulta.setInt(3, datos.stock());
            consulta.setString(4, datos.categoria());
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearProducto(resultado)) : Optional.empty();
            }
        }
    }

    /** Bloquea un producto activo para ajustar su stock; vacío si no existe o está inactivo. */
    public Optional<Producto> bloquearActivo(Connection conexion, long id) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_ACTIVO_SQL)) {
            consulta.setLong(1, id);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearProducto(resultado)) : Optional.empty();
            }
        }
    }

    public Optional<Producto> actualizarPrecio(Long id, BigDecimal precio) {
        String sql = """
                UPDATE producto
                SET precio_anterior = CASE
                        WHEN ? < precio THEN COALESCE(precio_anterior, precio)
                        WHEN ? >= COALESCE(precio_anterior, precio) THEN NULL
                        ELSE precio_anterior
                    END,
                    precio = ?
                WHERE id = ? AND activo = TRUE
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setBigDecimal(1, precio);
            consulta.setBigDecimal(2, precio);
            consulta.setBigDecimal(3, precio);
            consulta.setLong(4, id);
            if (consulta.executeUpdate() == 0) {
                return Optional.empty();
            }
            return buscarPorId(conexion, id);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo actualizar el precio", error);
        }
    }

    public List<MovimientoInventario> listarMovimientos(Long productoId) {
        String sql = """
                SELECT id, producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id, fecha
                FROM movimiento_inventario
                WHERE producto_id = ?
                ORDER BY id
                """;
        List<MovimientoInventario> movimientos = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, productoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    movimientos.add(new MovimientoInventario(
                            resultado.getLong("id"),
                            resultado.getLong("producto_id"),
                            resultado.getString("tipo"),
                            resultado.getInt("cantidad_firmada"),
                            resultado.getString("motivo"),
                            resultado.getObject("usuario_responsable_id", Long.class),
                            resultado.getObject("fecha", OffsetDateTime.class)));
                }
            }
            return movimientos;
        } catch (SQLException error) {
            throw new IllegalStateException(
                    "No se pudo consultar el historial de inventario", error);
        }
    }

    // ---------- RF16 (spec 007, T014a): gestión de la ficha y del estado ----------

    private static final String GESTION_POR_ID_SQL = SELECT_PRODUCTOS + " WHERE p.id = ?";

    private static final String GESTION_LISTA_SQL = SELECT_PRODUCTOS + " ORDER BY p.activo DESC, p.nombre, p.id";

    /**
     * Actualiza la ficha solo si la categoría existe y está activa; precio y stock no se
     * tocan. El detalle de pedidos guarda su propio nombre y precio, así que no cambia.
     */
    private static final String ACTUALIZAR_FICHA_SQL = """
            UPDATE producto p
            SET nombre = ?, marca = ?, descripcion = ?, imagen = ?,
                categoria = c.nombre, categoria_id = c.id_categoria
            FROM categoria c
            WHERE p.id = ? AND c.nombre = ? AND c.activa = TRUE
            """;

    private static final String CAMBIAR_ESTADO_SQL = "UPDATE producto SET activo = ? WHERE id = ?";

    /** Todos los productos, activos primero; solo para el personal (incluye desactivados). */
    public List<Producto> listarParaGestion() {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(GESTION_LISTA_SQL);
                ResultSet filas = consulta.executeQuery()) {
            List<Producto> productos = new ArrayList<>();
            while (filas.next()) {
                productos.add(mapearProducto(filas));
            }
            return List.copyOf(productos);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron listar los productos", error);
        }
    }

    /**
     * @return vacío si el producto no existe (404)
     * @throws IllegalArgumentException si la categoría no existe o está inactiva (400)
     */
    public Optional<Producto> actualizarFicha(long id, EditarProducto datos) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            int actualizados;
            try (PreparedStatement consulta = conexion.prepareStatement(ACTUALIZAR_FICHA_SQL)) {
                consulta.setString(1, datos.nombre());
                consulta.setString(2, datos.marca());
                consulta.setString(3, datos.descripcion());
                consulta.setString(4, datos.imagen());
                consulta.setLong(5, id);
                consulta.setString(6, datos.categoria());
                actualizados = consulta.executeUpdate();
            }
            Optional<Producto> producto = buscarParaGestion(conexion, id);
            if (actualizados == 0 && producto.isPresent()) {
                throw new IllegalArgumentException("La categoría seleccionada no existe o está inactiva");
            }
            return producto;
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo actualizar la ficha del producto", error);
        }
    }

    /** @return vacío si el producto no existe */
    public Optional<Producto> cambiarEstado(long id, boolean activo) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            try (PreparedStatement consulta = conexion.prepareStatement(CAMBIAR_ESTADO_SQL)) {
                consulta.setBoolean(1, activo);
                consulta.setLong(2, id);
                if (consulta.executeUpdate() == 0) {
                    return Optional.empty();
                }
            }
            return buscarParaGestion(conexion, id);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo cambiar el estado del producto", error);
        }
    }

    private Optional<Producto> buscarParaGestion(Connection conexion, long id) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(GESTION_POR_ID_SQL)) {
            consulta.setLong(1, id);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearProducto(resultado)) : Optional.empty();
            }
        }
    }

    private Producto mapearProducto(ResultSet resultado) throws SQLException {
        return new Producto(
                resultado.getLong("id"),
                resultado.getString("sku"),
                resultado.getString("nombre"),
                resultado.getString("marca"),
                resultado.getString("categoria"),
                resultado.getObject("categoria_id", Long.class),
                resultado.getString("descripcion"),
                resultado.getBigDecimal("precio"),
                resultado.getBigDecimal("precio_anterior"),
                resultado.getInt("stock"),
                resultado.getBoolean("nuevo"),
                resultado.getString("imagen"),
                resultado.getBoolean("activo"));
    }
}
