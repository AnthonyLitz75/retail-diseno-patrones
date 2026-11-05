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
        return confirmarCompra(usuarioId, metodoPago, null, null, null);
    }

    public PedidoConfirmado confirmarCompra(
            Long usuarioId,
            String metodoPago,
            String claveConfirmacion,
            String destinatario,
            String direccionEnvio) {
        return pedidoDAO.confirmarCompra(
                usuarioId,
                total -> puertoPago.procesar(total, metodoPago),
                claveConfirmacion,
                destinatario,
                direccionEnvio);
    }
}
