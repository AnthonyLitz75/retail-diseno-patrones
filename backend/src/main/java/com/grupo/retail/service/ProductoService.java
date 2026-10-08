package com.grupo.retail.service;

import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.MovimientoInventario;
import com.grupo.retail.model.Producto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class ProductoService {
    private final ProductoDAO productoDAO;

    public ProductoService(ProductoDAO productoDAO) {
        this.productoDAO = productoDAO;
    }

    public List<Producto> listarProductos(
            String nombre, String categoria, BigDecimal precioMin, BigDecimal precioMax) {
        return productoDAO.listarTodos(nombre, categoria, precioMin, precioMax);
    }

    public List<Categoria> listarCategorias() {
        return productoDAO.listarCategorias();
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
