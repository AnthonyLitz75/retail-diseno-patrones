package com.grupo.retail.service;

import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.AccionAuditoria;
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
    private final AuditoriaService auditoriaService;

    public ProductoService(ProductoDAO productoDAO, CategoriaDAO categoriaDAO,
            InventarioDAO inventarioDAO, EjecutorTransaccion ejecutorTransaccion,
            AuditoriaService auditoriaService) {
        this.productoDAO = productoDAO;
        this.categoriaDAO = categoriaDAO;
        this.inventarioDAO = inventarioDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
        this.auditoriaService = auditoriaService;
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

    /**
     * Crea el producto y, si trae stock inicial, deja su movimiento ENTRADA en la misma transacción.
     * El código (SKU) debe ser único; sin código se genera PA-NNNN.
     */
    public Producto crearProducto(NuevoProducto datos, Long responsableId) {
        return ejecutorTransaccion.ejecutar("No se pudo crear el producto y registrar su stock inicial", conexion -> {
            if (datos.sku() != null && productoDAO.existeSku(conexion, datos.sku())) {
                throw new IllegalArgumentException("Ya existe un producto con el código " + datos.sku());
            }
            Producto creado = productoDAO.insertar(conexion, datos)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "La categoría seleccionada no existe o está inactiva"));
            if (datos.stock() > 0) {
                inventarioDAO.registrarMovimiento(conexion, RegistroMovimiento.simple(creado.id(),
                        TipoMovimiento.ENTRADA, datos.stock(), "Stock inicial al crear producto", responsableId));
            }
            auditoriaService.registrar(conexion, EventoAuditoria.de(responsableId, AccionAuditoria.PRODUCTO_CREADO,
                    PRODUCTO, creado.id(), describir(creado) + ", " + soles(creado.precio()) + ", stock " + creado.stock()));
            return creado;
        });
    }

    /** Cambia el precio y deja en la auditoría el precio anterior y el nuevo. */
    public Optional<Producto> actualizarPrecio(Long id, BigDecimal precio, Long responsableId) {
        Optional<Producto> anterior = productoDAO.buscarPorId(id);
        Optional<Producto> actualizado = productoDAO.actualizarPrecio(id, precio);
        actualizado.ifPresent(producto -> auditoriaService.registrarAparte(EventoAuditoria.de(
                responsableId, AccionAuditoria.PRECIO_CAMBIADO, PRODUCTO, producto.id(),
                describir(producto) + ": " + anterior.map(p -> soles(p.precio())).orElse("?")
                        + " → " + soles(producto.precio()))));
        return actualizado;
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
            auditoriaService.registrar(conexion, EventoAuditoria.de(responsableId, AccionAuditoria.STOCK_AJUSTADO,
                    PRODUCTO, id, describir(actual) + ": " + actual.stock() + " → " + nuevoStock + ". " + motivo));
            return Optional.of(actual.conStock(nuevoStock));
        });
    }

    /** RF16: catálogo de gestión, incluye los productos desactivados. */
    public List<Producto> listarParaGestion() {
        return productoDAO.listarParaGestion();
    }

    /** RF16: edita la ficha; 404 si no existe y 400 si la categoría no es válida. */
    public Producto editarFicha(long id, EditarProducto datos, Long responsableId) {
        Producto editado = productoDAO.actualizarFicha(id, datos)
                .orElseThrow(() -> new NoSuchElementException("No existe el producto solicitado"));
        auditoriaService.registrarAparte(EventoAuditoria.de(responsableId, AccionAuditoria.PRODUCTO_EDITADO,
                PRODUCTO, editado.id(), describir(editado) + " (categoría " + editado.categoria() + ")"));
        return editado;
    }

    /** RF16: activa o desactiva; nunca hay borrado físico. */
    public Producto cambiarEstado(long id, boolean activo, Long responsableId) {
        Producto producto = productoDAO.cambiarEstado(id, activo)
                .orElseThrow(() -> new NoSuchElementException("No existe el producto solicitado"));
        auditoriaService.registrarAparte(EventoAuditoria.de(responsableId,
                activo ? AccionAuditoria.PRODUCTO_ACTIVADO : AccionAuditoria.PRODUCTO_DESACTIVADO,
                PRODUCTO, producto.id(), describir(producto)));
        return producto;
    }

    private static final String PRODUCTO = "PRODUCTO";

    private static String describir(Producto producto) {
        return producto.nombre() + (producto.sku() == null ? "" : " (" + producto.sku() + ")");
    }

    private static String soles(BigDecimal monto) {
        return monto == null ? "?" : "S/ " + monto.setScale(2, java.math.RoundingMode.HALF_UP).toPlainString();
    }

    public List<MovimientoInventario> listarMovimientos(Long productoId) {
        return productoDAO.listarMovimientos(productoId);
    }
}
