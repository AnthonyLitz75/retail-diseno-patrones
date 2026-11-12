package com.grupo.retail.service;

import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dto.EditarProducto;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.Producto;
import com.grupo.retail.model.RegistroMovimiento.TipoMovimiento;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import com.grupo.retail.transaccion.EjecutorTransaccion;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class ProductoService {
    private final ProductoDAO productoDAO;
    private final CategoriaDAO categoriaDAO;
    private final InventarioDAO inventarioDAO;
    private final EjecutorTransaccion ejecutorTransaccion;

    public ProductoService(ProductoDAO productoDAO, CategoriaDAO categoriaDAO,
            InventarioDAO inventarioDAO, EjecutorTransaccion ejecutorTransaccion) {
        this.productoDAO = productoDAO;
        this.categoriaDAO = categoriaDAO;
        this.inventarioDAO = inventarioDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
    }

    public List<Producto> listarProductos(
            String nombre, String categoria, BigDecimal precioMin, BigDecimal precioMax) {
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            throw new IllegalArgumentException("El precio mínimo no puede superar al máximo");
        }
        return productoDAO.listarTodos(nombre, categoria, precioMin, precioMax);
    }

    public List<Categoria> listarCategorias() {
        return productoDAO.listarCategorias();
    }

    public List<CategoriaComponente> listarArbolCategorias() {
        return categoriaDAO.listarArbol();
    }

    public Optional<Producto> buscarPorId(Long id) {
        return productoDAO.buscarPorId(id);
    }

    /** Crea el producto y, si trae stock inicial, deja su movimiento ENTRADA en la misma transacción. */
    public Producto crearProducto(NuevoProducto datos, Long responsableId) {
        return ejecutorTransaccion.ejecutar("No se pudo crear el producto y registrar su stock inicial", conexion -> {
            Producto creado = productoDAO.insertar(conexion, datos)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "La categoría seleccionada no existe o está inactiva"));
            if (datos.stock() > 0) {
                inventarioDAO.registrarMovimiento(conexion, RegistroMovimiento.simple(creado.id(),
                        TipoMovimiento.ENTRADA, datos.stock(), "Stock inicial al crear producto", responsableId));
            }
            return creado;
        });
    }

    public Optional<Producto> actualizarPrecio(Long id, BigDecimal precio) {
        return productoDAO.actualizarPrecio(id, precio);
    }

    /**
     * Fija el stock de un producto activo y registra la diferencia como movimiento AJUSTE.
     * Vacío si el producto no existe o está inactivo; sin diferencia no se escribe nada.
     */
    public Optional<Producto> actualizarStock(
            Long id, int nuevoStock, String motivo, Long responsableId) {
        return ejecutorTransaccion.ejecutar("No se pudo ajustar el inventario", conexion -> {
            Optional<Producto> bloqueado = productoDAO.bloquearActivo(conexion, id);
            if (bloqueado.isEmpty()) {
                return Optional.<Producto>empty();
            }
            Producto actual = bloqueado.get();
            int diferencia = nuevoStock - actual.stock();
            if (diferencia == 0) {
                return Optional.of(actual);
            }
            inventarioDAO.sumarStock(conexion, id, diferencia);
            inventarioDAO.registrarMovimiento(conexion, RegistroMovimiento.simple(
                    id, TipoMovimiento.AJUSTE, diferencia, motivo, responsableId));
            return Optional.of(actual.conStock(nuevoStock));
        });
    }

    /** RF16: catálogo de gestión, incluye los productos desactivados. */
    public List<Producto> listarParaGestion() {
        return productoDAO.listarParaGestion();
    }

    /** RF16: edita la ficha; 404 si no existe y 400 si la categoría no es válida. */
    public Producto editarFicha(long id, EditarProducto datos) {
        return productoDAO.actualizarFicha(id, datos)
                .orElseThrow(() -> new NoSuchElementException("No existe el producto solicitado"));
    }

    /** RF16: activa o desactiva; nunca hay borrado físico. */
    public Producto cambiarEstado(long id, boolean activo) {
        return productoDAO.cambiarEstado(id, activo)
                .orElseThrow(() -> new NoSuchElementException("No existe el producto solicitado"));
    }

    public List<MovimientoInventario> listarMovimientos(Long productoId) {
        return productoDAO.listarMovimientos(productoId);
    }
}
