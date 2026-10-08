package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarPrecio;
import com.grupo.retail.dto.AjusteInventario;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class InicioController {
    private final ProductoService productoService;
    private final SesionEmpleado sesionEmpleado;

    public InicioController(ProductoService productoService, SesionEmpleado sesionEmpleado) {
        this.productoService = productoService;
        this.sesionEmpleado = sesionEmpleado;
    }

    @GetMapping("/api/hello")
    public String hello() { return "Backend de Retail funcionando"; }

    @GetMapping("/api/categorias")
    public List<Categoria> listarCategorias() { return productoService.listarCategorias(); }

    @GetMapping("/api/productos")
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

    @GetMapping("/api/productos/{id}")
    public ResponseEntity<Producto> obtenerProducto(@PathVariable Long id) {
        Optional<Producto> resultado = productoService.buscarPorId(id);
        return resultado.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/api/productos")
    public ResponseEntity<?> crearProducto(
            @Valid @RequestBody NuevoProducto datos, HttpServletRequest solicitud) {
        Long responsableId = sesionEmpleado.exigirRol(solicitud, "ADMIN", "VENDEDOR");
        try {
            Producto creado = productoService.crearProducto(datos, responsableId);
            URI ubicacion = URI.create("/api/productos/" + creado.id());
            return ResponseEntity.created(ubicacion).body(creado);
        } catch (IllegalArgumentException error) {
            return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
        }
    }

    @PutMapping("/api/productos/{id}/precio")
    public ResponseEntity<Producto> actualizarPrecio(
            @PathVariable Long id, @Valid @RequestBody ActualizarPrecio datos,
            HttpServletRequest solicitud) {
        sesionEmpleado.exigirRol(solicitud, "ADMIN", "VENDEDOR");
        return productoService.actualizarPrecio(id, datos.precio())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/api/productos/{id}/stock")
    public ResponseEntity<Producto> actualizarStock(
            @PathVariable Long id, @Valid @RequestBody AjusteInventario datos,
            HttpServletRequest solicitud) {
        Long responsableId = sesionEmpleado.exigirRol(
                solicitud, "ADMIN", "VENDEDOR", "ALMACEN");
        return productoService.actualizarStock(
                        id, datos.nuevoStock(), datos.motivo(), responsableId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/api/productos/{id}/movimientos")
    public List<MovimientoInventario> listarMovimientos(
            @PathVariable Long id, HttpServletRequest solicitud) {
        sesionEmpleado.exigirRol(solicitud, "ADMIN", "VENDEDOR", "ALMACEN");
        return productoService.listarMovimientos(id);
    }
}
