package com.grupo.retail.controller;

import com.grupo.retail.dto.ActualizarCantidadCarrito;
import com.grupo.retail.dto.AgregarProductoCarrito;
import com.grupo.retail.model.Carrito;
import com.grupo.retail.service.CarritoService;
import com.grupo.retail.service.SesionCliente;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/carrito")
public class CarritoController {

    private final CarritoService carritoService;
    private final SesionCliente sesionCliente;

    public CarritoController(CarritoService carritoService, SesionCliente sesionCliente) {
        this.carritoService = carritoService;
        this.sesionCliente = sesionCliente;
    }

    @GetMapping
    public Carrito obtener(HttpServletRequest solicitud) {
        return carritoService.obtener(sesionCliente.obtenerId(solicitud));
    }

    @PostMapping("/productos")
    public ResponseEntity<Carrito> agregar(
            @Valid @RequestBody AgregarProductoCarrito datos,
            HttpServletRequest solicitud) {
        Carrito carrito = carritoService.agregar(
                sesionCliente.obtenerId(solicitud), datos.productoId(), datos.cantidad());
        return ResponseEntity.status(HttpStatus.CREATED).body(carrito);
    }

    @PutMapping("/productos/{productoId}")
    public Carrito actualizarCantidad(
            @PathVariable Long productoId,
            @Valid @RequestBody ActualizarCantidadCarrito datos,
            HttpServletRequest solicitud) {
        return carritoService.actualizarCantidad(
                sesionCliente.obtenerId(solicitud), productoId, datos.cantidad());
    }

    @DeleteMapping("/productos/{productoId}")
    public ResponseEntity<Void> quitar(
            @PathVariable Long productoId,
            HttpServletRequest solicitud) {
        carritoService.quitar(sesionCliente.obtenerId(solicitud), productoId);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> manejarNoEncontrado(NoSuchElementException error) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> manejarDatoInvalido(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(Map.of("error", error.getMessage()));
    }
}