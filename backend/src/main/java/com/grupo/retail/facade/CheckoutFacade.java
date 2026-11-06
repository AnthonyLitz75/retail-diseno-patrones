package com.grupo.retail.facade;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.patterns.pago.PuertoPago;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Patrón Estructural Facade (GoF).
 * Proporciona una interfaz unificada y simplificada para la orquestación del
 * flujo de compra (checkout). Coordina la validación y normalización de parámetros,
 * la invocación al puerto de pago externo (PuertoPago) y la persistencia atómica
 * del pedido en la base de datos (PedidoDAO).
 */
@Service
public class CheckoutFacade {

    private final PedidoDAO pedidoDAO;
    private final PuertoPago puertoPago;

    public CheckoutFacade(PedidoDAO pedidoDAO, PuertoPago puertoPago) {
        this.pedidoDAO = Objects.requireNonNull(pedidoDAO, "pedidoDAO no puede ser null");
        this.puertoPago = Objects.requireNonNull(puertoPago, "puertoPago no puede ser null");
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
        validarParametros(usuarioId, metodoPago);

        String claveLimpia = normalizar(claveConfirmacion);
        String destLimpio = normalizar(destinatario);
        String dirLimpia = normalizar(direccionEnvio);

        return pedidoDAO.confirmarCompra(
                usuarioId,
                total -> puertoPago.procesar(total, metodoPago.trim()),
                claveLimpia,
                destLimpio,
                dirLimpia);
    }

    private void validarParametros(Long usuarioId, String metodoPago) {
        if (usuarioId == null) {
            throw new IllegalArgumentException("El identificador del usuario es obligatorio para confirmar la compra");
        }
        if (metodoPago == null || metodoPago.isBlank()) {
            throw new IllegalArgumentException("El método de pago es obligatorio");
        }
    }

    private String normalizar(String valor) {
        return valor != null && !valor.isBlank() ? valor.trim() : null;
    }
}
