package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarPrecio;
import com.grupo.retail.dto.AjusteInventario;
import com.grupo.retail.dto.CambiarEstadoProducto;
import com.grupo.retail.dto.CategoriaArbolDTO;
import com.grupo.retail.dto.EditarProducto;
import com.grupo.retail.dto.NuevoProducto;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.MovimientoInventario;
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
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class InicioController {
    private final ProductoService productoService;
    private final SesionEmpleado sesionEmpleado;

    public InicioController(ProductoService productoService, SesionEmpleado sesionEmpleado) {
        this.productoService = productoService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @GetMapping("/hello")
    public String hello() { return "Backend de Retail funcionando"; }

    @GetMapping("/categorias")
    public List<Categoria> listarCategorias() { return productoService.listarCategorias(); }

    @GetMapping("/categorias/arbol")
    public List<CategoriaArbolDTO> listarArbolCategorias() {
        return productoService.listarArbolCategorias().stream()
                .map(CategoriaArbolDTO::desdeComponente)
                .toList();
    }

    @GetMapping("/productos")
    public ResponseEntity<?> listarProductos(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String categoria,
            @RequestParam(required = false) BigDecimal precioMin,
            @RequestParam(required = false) BigDecimal precioMax) {
        if (precioMin != null && precioMax != null && precioMin.compareTo(precioMax) > 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "El precio mínimo no puede superar al máximo"));
        }
        return ResponseEntity.ok(
                productoService.listarProductos(nombre, categoria, precioMin, precioMax));
    }

    @GetMapping("/productos/{id}")
    public ResponseEntity<Producto> obtenerProducto(@PathVariable Long id) {
        Optional<Producto> resultado = productoService.buscarPorId(id);
        return resultado.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/productos")
    public ResponseEntity<?> crearProducto(
            @Valid @RequestBody NuevoProducto datos, HttpServletRequest solicitud) {
        Long responsableId = sesionEmpleado.obtenerId(solicitud);
        try {
            Producto creado = productoService.crearProducto(datos, responsableId);
            URI ubicacion = URI.create("/api/productos/" + creado.id());
            return ResponseEntity.created(ubicacion).body(creado);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
        }
    }

    @PutMapping("/productos/{id}/precio")
    public ResponseEntity<Producto> actualizarPrecio(
            @PathVariable Long id, @Valid @RequestBody ActualizarPrecio datos) {
        return productoService.actualizarPrecio(id, datos.precio())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    public ResponseEntity<Producto> actualizarPrecio(
            Long id, ActualizarPrecio datos, HttpServletRequest solicitud) {
        return actualizarPrecio(id, datos);
    }

    @PutMapping("/productos/{id}/stock")
    public ResponseEntity<Producto> actualizarStock(
            @PathVariable Long id, @Valid @RequestBody AjusteInventario datos,
            HttpServletRequest solicitud) {
        Long responsableId = sesionEmpleado.obtenerId(solicitud);
        return productoService.actualizarStock(
                        id, datos.nuevoStock(), datos.motivo(), responsableId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** RF16: todos los productos, incluidos los desactivados (ADMIN y VENDEDOR). */
    @GetMapping("/productos/gestion")
    public List<Producto> listarParaGestion() {
        return productoService.listarParaGestion();
    }

    /** RF16: edita nombre, marca, descripción, imagen y categoría (ADMIN y VENDEDOR). */
    @PutMapping("/productos/{id}")
    public Producto editarFicha(@PathVariable Long id, @Valid @RequestBody EditarProducto datos) {
        return productoService.editarFicha(id, datos);
    }

    /** RF16: activa o desactiva el producto; nunca lo borra (ADMIN y VENDEDOR). */
    @PatchMapping("/productos/{id}/estado")
    public Producto cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoProducto datos) {
        return productoService.cambiarEstado(id, datos.activo());
    }

    @GetMapping("/productos/{id}/movimientos")
    public List<MovimientoInventario> listarMovimientos(@PathVariable Long id) {
        return productoService.listarMovimientos(id);
    }

    public List<MovimientoInventario> listarMovimientos(Long id, HttpServletRequest solicitud) {
        return listarMovimientos(id);
    }
}
