package com.grupo.retail.service;

import com.grupo.retail.dao.PedidoDAO;
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

    public List<PedidoVista> listarPendientes() {
        return pedidoDAO.listarPendientes();
    }

    public List<PedidoVista> listarOperativos() {
        return pedidoDAO.listarOperativos();
    }

    public void prepararPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::preparar,
                "Pedido preparado por almacén");
    }

    public void despacharPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::despachar,
                "Pedido despachado por almacén");
    }

    public void entregarPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::entregar,
                "Entrega del pedido registrada por almacén");
    }

    private void cambiarEstado(
            Long pedidoId, Long responsableId,
            java.util.function.Function<EstadoPedido, EstadoPedido> transicion,
            String comentario) {
        String estadoActual = pedidoDAO.buscarEstado(pedidoId)
                .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
        EstadoPedido nuevoEstado;
        try {
            nuevoEstado = transicion.apply(EstadoPedido.desde(estadoActual));
        } catch (IllegalStateException error) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, error.getMessage(), error);
        }

        boolean actualizado = pedidoDAO.cambiarEstado(
                pedidoId, estadoActual, nuevoEstado.nombre(), responsableId, comentario);
        if (!actualizado) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "El estado del pedido cambió. Actualiza la lista e inténtalo nuevamente");
        }
    }
}
