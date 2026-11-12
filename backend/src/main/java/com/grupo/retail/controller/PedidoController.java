package com.grupo.retail.controller;

import com.grupo.retail.model.Rol;
import com.grupo.retail.dto.SolicitudConfirmarPedido;
import com.grupo.retail.dto.SolicitudDespachoPedido;
import com.grupo.retail.facade.CheckoutFacade;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.patterns.command.HistorialComandosCarrito;
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
    public List<PedidoVista> listarPendientes() {
        return pedidoService.listarPendientes();
    }

    public List<PedidoVista> listarPendientes(HttpServletRequest peticion) {
        return listarPendientes();
    }

    @GetMapping("/operativos")
    public List<PedidoVista> listarOperativos() {
        return pedidoService.listarOperativos();
    }

    public List<PedidoVista> listarOperativos(HttpServletRequest peticion) {
        return listarOperativos();
    }

    @PutMapping("/{id}/preparar")
    public ResponseEntity<Void> prepararPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.obtenerId(peticion);
        pedidoService.prepararPedido(id, responsableId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/despachar")
    public ResponseEntity<Void> despacharPedido(
            @PathVariable Long id,
            @Valid @RequestBody SolicitudDespachoPedido solicitud,
            HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.obtenerId(peticion);
        pedidoService.despacharPedido(
                id, responsableId, solicitud.transportista(), solicitud.codigoSeguimiento());
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/entregar")
    public ResponseEntity<Void> entregarPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        Long responsableId = sesionEmpleado.obtenerId(peticion);
        pedidoService.entregarPedido(id, responsableId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/cancelar")
    public ResponseEntity<Void> cancelarPedido(
            @PathVariable Long id, HttpServletRequest peticion) {
        SesionAutenticada.UsuarioSesion actor = sesionAutenticada.exigirUsuario(peticion);
        switch (Rol.desde(actor.rol()).orElse(null)) {
            case CLIENTE -> pedidoService.cancelarPedidoComoCliente(id, actor.usuarioId());
            case ADMIN -> pedidoService.cancelarPedidoComoAdmin(id, actor.usuarioId());
            case VENDEDOR -> pedidoService.cancelarPedidoComoVendedor(id, actor.usuarioId());
            case null, default -> throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Tu rol no puede realizar esta operación");
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
        // Spec 005 (US6.4): el carrito se convirtió en pedido; ya no hay acciones que deshacer.
        HistorialComandosCarrito.limpiarEn(peticion.getSession(false));
        return ResponseEntity.status(HttpStatus.CREATED).body(pedido);
    }
}
