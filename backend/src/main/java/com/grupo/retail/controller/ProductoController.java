package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarPrecio;
import com.grupo.retail.dto.AjusteInventario;
import com.grupo.retail.dto.CambiarEstadoProducto;
import com.grupo.retail.dto.CategoriaArbolDTO;
import com.grupo.retail.dto.CategoriaRespuestaDTO;
import com.grupo.retail.dto.EditarProducto;
import com.grupo.retail.dto.MovimientoInventarioRespuestaDTO;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.dto.ProductoRespuestaDTO;
import com.grupo.retail.model.Producto;
import com.grupo.retail.service.ProductoService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Optional;

/**
 * Catálogo público (productos y categorías) y gestión de productos del personal.
 * Desacoplado de las entidades de dominio internas mediante DTOs de respuesta tipados.
 */
@RestController
@RequestMapping("/api")
public class ProductoController {
    private final ProductoService productoService;
    private final SesionEmpleado sesionEmpleado;

    public ProductoController(ProductoService productoService, SesionEmpleado sesionEmpleado) {
        this.productoService = productoService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @GetMapping("/hello")
    public String hello() { return "Backend de Retail funcionando"; }

    @GetMapping("/categorias")
    public List<CategoriaRespuestaDTO> listarCategorias() {
        return productoService.listarCategorias().stream()
                .map(CategoriaRespuestaDTO::desde)
                .toList();
    }

    @GetMapping("/categorias/arbol")
    public List<CategoriaArbolDTO> listarArbolCategorias() {
        return productoService.listarArbolCategorias().stream()
                .map(CategoriaArbolDTO::desdeComponente)
                .toList();
    }

    @GetMapping("/productos")
    public List<ProductoRespuestaDTO> listarProductos(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax) {
        return productoService.listarProductos(nombre, categoria, precioMin, precioMax).stream()
                .map(ProductoRespuestaDTO::desde)
                .toList();
    }

    @GetMapping("/productos/{id}")
    public ResponseEntity<ProductoRespuestaDTO> obtenerProducto(@PathVariable Long id) {
        Optional<Producto> resultado = productoService.buscarPorId(id);
        return resultado.map(p -> ResponseEntity.ok(ProductoRespuestaDTO.desde(p)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/productos")
    public ResponseEntity<ProductoRespuestaDTO> crearProducto(
            @Valid @RequestBody NuevoProducto datos, HttpServletRequest solicitud) {
        Long responsableId = sesionEmpleado.obtenerId(solicitud);
        Producto creado = productoService.crearProducto(datos, responsableId);
        return ResponseEntity.created(URI.create("/api/productos/" + creado.id()))
                .body(ProductoRespuestaDTO.desde(creado));
    }

    @PutMapping("/productos/{id}/precio")
    public ResponseEntity<ProductoRespuestaDTO> actualizarPrecio(
            @PathVariable Long id, @Valid @RequestBody ActualizarPrecio datos, HttpServletRequest solicitud) {
        return productoService.actualizarPrecio(id, datos.precio(), sesionEmpleado.obtenerId(solicitud))
                .map(p -> ResponseEntity.ok(ProductoRespuestaDTO.desde(p)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/productos/{id}/stock")
    public ResponseEntity<ProductoRespuestaDTO> actualizarStock(
            @PathVariable Long id, @Valid @RequestBody AjusteInventario datos,
            HttpServletRequest solicitud) {
        Long responsableId = sesionEmpleado.obtenerId(solicitud);
        return productoService.actualizarStock(
                        id, datos.nuevoStock(), datos.motivo(), responsableId)
                .map(p -> ResponseEntity.ok(ProductoRespuestaDTO.desde(p)))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** RF16: todos los productos, incluidos los desactivados (ADMIN y VENDEDOR). */
    @GetMapping("/productos/gestion")
    public List<ProductoRespuestaDTO> listarParaGestion() {
        return productoService.listarParaGestion().stream()
                .map(ProductoRespuestaDTO::desde)
                .toList();
    }

    /** RF16: edita nombre, marca, descripción, imagen y categoría (ADMIN y VENDEDOR). */
    @PutMapping("/productos/{id}")
    public ProductoRespuestaDTO editarFicha(@PathVariable Long id, @Valid @RequestBody EditarProducto datos,
            HttpServletRequest solicitud) {
        Producto modificado = productoService.editarFicha(id, datos, sesionEmpleado.obtenerId(solicitud));
        return ProductoRespuestaDTO.desde(modificado);
    }

    /** RF16: activa o desactiva el producto; nunca lo borra (ADMIN y VENDEDOR). */
    @PatchMapping("/productos/{id}/estado")
    public ProductoRespuestaDTO cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoProducto datos,
            HttpServletRequest solicitud) {
        Producto modificado = productoService.cambiarEstado(id, datos.activo(), sesionEmpleado.obtenerId(solicitud));
        return ProductoRespuestaDTO.desde(modificado);
    }

    @GetMapping("/productos/{id}/movimientos")
    public List<MovimientoInventarioRespuestaDTO> listarMovimientos(@PathVariable Long id) {
        return productoService.listarMovimientos(id).stream()
                .map(MovimientoInventarioRespuestaDTO::desde)
                .toList();
    }
}
