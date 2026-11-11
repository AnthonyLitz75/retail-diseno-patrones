package com.grupo.retail.service;

import com.grupo.retail.dao.DevolucionDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dao.ReclamoDAO;
import com.grupo.retail.model.ContextoPedidoSoporte;
import com.grupo.retail.model.PedidoVista;
import org.springframework.stereotype.Service;

import java.util.NoSuchElementException;

/**
 * RF27 (spec 006, US7): reúne lo que Soporte necesita para atender un pedido. Es solo
 * lectura; cada parte se consulta con su DAO y no requiere transacción.
 */
@Service
public class ContextoSoporteService {

    private final PedidoDAO pedidoDAO;
    private final ReclamoDAO reclamoDAO;
    private final DevolucionDAO devolucionDAO;

    public ContextoSoporteService(PedidoDAO pedidoDAO, ReclamoDAO reclamoDAO, DevolucionDAO devolucionDAO) {
        this.pedidoDAO = pedidoDAO;
        this.reclamoDAO = reclamoDAO;
        this.devolucionDAO = devolucionDAO;
    }

    public ContextoPedidoSoporte consultar(long pedidoId) {
        PedidoVista pedido = pedidoDAO.buscarPorId(pedidoId)
                .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
        return new ContextoPedidoSoporte(
                pedido,
                pedidoDAO.buscarResumenPago(pedidoId).orElse(null),
                reclamoDAO.listarPorPedido(pedidoId),
                devolucionDAO.listarPorPedido(pedidoId));
    }
}
