package com.grupo.retail.controller;

import com.grupo.retail.dto.SolicitudConfirmarPedido;
import com.grupo.retail.dto.SolicitudDespachoPedido;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.PedidoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final CheckoutFacade checkoutFacade;
    private final SesionCliente sesionCliente;
    private final SesionEmpleado sesionEmpleado;
    private final SesionAutenticada sesionAutenticada;
    private final PedidoService pedidoService;

    public PedidoController(
            CheckoutFacade checkoutFacade,
            SesionCliente sesionCliente,
            SesionEmpleado sesionEmpleado,
            SesionAutenticada sesionAutenticada,
            PedidoService pedidoService) {
        this.checkoutFacade = checkoutFacade;
        this.sesionCliente = sesionCliente;
        this.sesionEmpleado = sesionEmpleado;
        this.sesionAutenticada = sesionAutenticada;
        this.pedidoService = pedidoService;
    }

    @GetMapping("/mis-pedidos")
    public List<PedidoVista> listarMisPedidos(HttpServletRequest peticion) {
        return pedidoService.listarPedidosCliente(sesionCliente.obtenerId(peticion));
    }

    @GetMapping("/{id}")
    public PedidoVista obtenerPedido(@PathVariable Long id, HttpServletRequest peticion) {
        Long clienteId = sesionCliente.obtenerId(peticion);
        return pedidoService.buscarPedidoCliente(id, clienteId);
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
            @PathVariable Long id,
            @Valid @RequestBody SolicitudDespachoPedido solicitud,
            HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        pedidoService.despacharPedido(
                id, responsableId, solicitud.transportista(), solicitud.codigoSeguimiento());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/entregar")
    public ResponseEntity<Void> entregarPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.exigirRol(peticion, "ADMIN", "ALMACEN");
        pedidoService.entregarPedido(id, responsableId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/cancelar")
    public ResponseEntity<Void> cancelarPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        SesionAutenticada.UsuarioSesion actor = sesionAutenticada.exigirRol(
                peticion, "CLIENTE", "VENDEDOR", "ADMIN");
        if ("CLIENTE".equals(actor.rol())) {
            pedidoService.cancelarPedidoComoCliente(id, actor.usuarioId());
        } else if ("ADMIN".equals(actor.rol())) {
            pedidoService.cancelarPedidoComoAdmin(id, actor.usuarioId());
        } else {
            pedidoService.cancelarPedidoComoVendedor(id, actor.usuarioId());
        }
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/confirmar")
    public ResponseEntity<PedidoConfirmado> confirmar(
            @Valid @RequestBody SolicitudConfirmarPedido solicitud,
            HttpServletRequest peticion) {
        PedidoConfirmado pedido = checkoutFacade.confirmarCompra(
                sesionCliente.obtenerId(peticion),
                solicitud.metodoPago(),
                solicitud.claveConfirmacion(),
                solicitud.destinatario(),
                solicitud.direccionEnvio());
        return ResponseEntity.status(HttpStatus.CREATED).body(pedido);
    }
}
