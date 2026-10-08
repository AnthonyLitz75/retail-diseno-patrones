package com.grupo.retail.facade;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.patterns.pago.PuertoPago;
import org.springframework.stereotype.Service;

@Service
public class CheckoutFacade {

    private final PedidoDAO pedidoDAO;
    private final PuertoPago puertoPago;

    public CheckoutFacade(PedidoDAO pedidoDAO, PuertoPago puertoPago) {
        this.pedidoDAO = pedidoDAO;
        this.puertoPago = puertoPago;
    }

    public PedidoConfirmado confirmarCompra(Long usuarioId, String metodoPago) {
        return pedidoDAO.confirmarCompra(
                usuarioId,
                total -> puertoPago.procesar(total, metodoPago));
    }
}
