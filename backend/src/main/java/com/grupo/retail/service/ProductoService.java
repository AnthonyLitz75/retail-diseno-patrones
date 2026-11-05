package com.grupo.retail.service;

import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.Producto;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class ProductoService {
    private final ProductoDAO productoDAO;
    private final CategoriaDAO categoriaDAO;

    public ProductoService(ProductoDAO productoDAO, CategoriaDAO categoriaDAO) {
        this.productoDAO = productoDAO;
        this.categoriaDAO = categoriaDAO;
    }

    public List<Producto> listarProductos(
            String nombre, String categoria, BigDecimal precioMin, BigDecimal precioMax) {
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

    public Producto crearProducto(NuevoProducto datos, Long responsableId) {
        return productoDAO.crear(datos, responsableId);
    }

    public Optional<Producto> actualizarPrecio(Long id, BigDecimal precio) {
        return productoDAO.actualizarPrecio(id, precio);
    }

    public Optional<Producto> actualizarStock(
            Long id, int nuevoStock, String motivo, Long responsableId) {
        return productoDAO.actualizarStock(id, nuevoStock, motivo, responsableId);
    }

    public List<MovimientoInventario> listarMovimientos(Long productoId) {
        return productoDAO.listarMovimientos(productoId);
    }
}
