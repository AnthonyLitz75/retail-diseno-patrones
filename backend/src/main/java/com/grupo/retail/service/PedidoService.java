package com.grupo.retail.service;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.patterns.state.EstadoPedido;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class PedidoService {
    private final PedidoDAO pedidoDAO;

    public PedidoService(PedidoDAO pedidoDAO) {
        this.pedidoDAO = pedidoDAO;
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

    private void cancelarPedido(Long pedidoId, Long clienteId, Long responsableId) {
        String estadoCancelado = EstadoPedido.desde("PENDIENTE").cancelar().nombre();
        try {
            pedidoDAO.cancelarPedido(pedidoId, clienteId, responsableId, estadoCancelado);
        } catch (IllegalStateException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage(), error);
        }
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
