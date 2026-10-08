package com.grupo.retail.controller;

import com.grupo.retail.dto.SolicitudConfirmarPedido;
import com.grupo.retail.exception.PagoRechazadoException;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.List;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final CheckoutFacade checkoutFacade;
    private final SesionCliente sesionCliente;
    private final SesionEmpleado sesionEmpleado;
    private final PedidoService pedidoService;

    public PedidoController(
            CheckoutFacade checkoutFacade,
            SesionCliente sesionCliente,
            SesionEmpleado sesionEmpleado,
            PedidoService pedidoService) {
        this.checkoutFacade = checkoutFacade;
        this.sesionCliente = sesionCliente;
        this.sesionEmpleado = sesionEmpleado;
        this.pedidoService = pedidoService;
    }

    @GetMapping("/mis-pedidos")
    public List<PedidoVista> listarMisPedidos(HttpServletRequest peticion) {
        return pedidoService.listarPedidosCliente(sesionCliente.obtenerId(peticion));
    }

    @GetMapping("/pendientes")
    public List<PedidoVista> listarPendientes(HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN", "VENDEDOR", "ALMACEN");
        return pedidoService.listarPendientes();
    }

    @GetMapping("/operativos")
    public List<PedidoVista> listarOperativos(HttpServletRequest peticion) {
        sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        return pedidoService.listarOperativos();
    }

    @PutMapping("/{id}/preparar")
    public ResponseEntity<Void> prepararPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        pedidoService.prepararPedido(id, responsableId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/despachar")
    public ResponseEntity<Void> despacharPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        pedidoService.despacharPedido(id, responsableId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/entregar")
    public ResponseEntity<Void> entregarPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        pedidoService.entregarPedido(id, responsableId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/confirmar")
    public ResponseEntity<PedidoConfirmado> confirmar(
            @Valid @RequestBody SolicitudConfirmarPedido solicitud,
            HttpServletRequest peticion) {
        PedidoConfirmado pedido = checkoutFacade.confirmarCompra(
                sesionCliente.obtenerId(peticion), solicitud.metodoPago());
        return ResponseEntity.status(HttpStatus.CREATED).body(pedido);
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

    @ExceptionHandler(PagoRechazadoException.class)
    public ResponseEntity<Map<String, String>> manejarPagoRechazado(PagoRechazadoException error) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                .body(Map.of("error", error.getMessage()));
    }
}
