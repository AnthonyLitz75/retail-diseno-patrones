package com.grupo.retail.service;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.patterns.state.EstadoPedido;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class PedidoService {
    private static final String CANCELADO = "CANCELADO";

    private final PedidoDAO pedidoDAO;
    private final EjecutorTransaccion ejecutorTransaccion;

    public PedidoService(PedidoDAO pedidoDAO, EjecutorTransaccion ejecutorTransaccion) {
        this.pedidoDAO = pedidoDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
    }

    public List<PedidoVista> listarPedidosCliente(Long clienteId) {
        return pedidoDAO.listarPorCliente(clienteId);
    }

    public PedidoVista buscarPedidoCliente(Long pedidoId, Long clienteId) {
        return pedidoDAO.buscarPorIdYCliente(pedidoId, clienteId)
                .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
    }

    public List<PedidoVista> listarPendientes() {
        return pedidoDAO.listarPendientes();
    }

    public List<PedidoVista> listarOperativos() {
        return pedidoDAO.listarOperativos();
    }

    public void prepararPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::preparar,
                "Pedido preparado por almacén", null);
    }

    public void despacharPedido(
            Long pedidoId, Long responsableId, String transportista, String codigoSeguimiento) {
        if (transportista == null || transportista.isBlank()
                || codigoSeguimiento == null || codigoSeguimiento.isBlank()) {
            throw new IllegalArgumentException(
                    "El transportista y el código de seguimiento son obligatorios");
        }
        cambiarEstado(pedidoId, responsableId, EstadoPedido::despachar,
                "Pedido despachado por almacén", new EnvioPedido(
                        transportista.strip(), codigoSeguimiento.strip(), null));
    }

    public void entregarPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::entregar,
                "Entrega del pedido registrada por almacén", null);
    }

    public void cancelarPedidoComoCliente(Long pedidoId, Long clienteId) {
        cancelarPedido(pedidoId, clienteId, clienteId);
    }

    public void cancelarPedidoComoVendedor(Long pedidoId, Long vendedorId) {
        cancelarPedido(pedidoId, null, vendedorId);
    }

    public void cancelarPedidoComoAdmin(Long pedidoId, Long adminId) {
        cancelarPedido(pedidoId, null, adminId);
    }

    /**
     * Cancela en una sola transacción. El pedido se bloquea primero y la transición la
     * decide el patrón State con el estado real leído bajo ese bloqueo: dos cancelaciones
     * simultáneas se serializan y la segunda encuentra el pedido ya cancelado.
     * Un estado que no admite cancelar lanza IllegalStateException (409).
     */
    private void cancelarPedido(Long pedidoId, Long clienteId, Long responsableId) {
        ejecutorTransaccion.ejecutar("No se pudo cancelar el pedido", conexion -> {
            String estadoActual = pedidoDAO.bloquearEstadoPedido(conexion, pedidoId, clienteId)
                    .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
            if (CANCELADO.equals(estadoActual)) {
                // Repetir la cancelación es seguro: la primera ya aplicó todos los efectos.
                return null;
            }
            EstadoPedido cancelado = EstadoPedido.desde(estadoActual).cancelar();
            pedidoDAO.registrarCancelacion(conexion, pedidoId, responsableId, cancelado.nombre());
            return null;
        });
    }

    private void cambiarEstado(
            Long pedidoId, Long responsableId,
            java.util.function.Function<EstadoPedido, EstadoPedido> transicion,
            String comentario, EnvioPedido envio) {
        String estadoActual = pedidoDAO.buscarEstado(pedidoId)
                .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
        EstadoPedido nuevoEstado;
        try {
            nuevoEstado = transicion.apply(EstadoPedido.desde(estadoActual));
        } catch (IllegalStateException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage(), error);
        }

        boolean actualizado;
        try {
            actualizado = pedidoDAO.cambiarEstado(
                    pedidoId, estadoActual, nuevoEstado.nombre(), responsableId, comentario, envio);
        } catch (CodigoSeguimientoDuplicadoException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage(), error);
        }
        if (!actualizado) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El estado del pedido cambió. Actualiza la lista e inténtalo nuevamente");
        }
    }
}
