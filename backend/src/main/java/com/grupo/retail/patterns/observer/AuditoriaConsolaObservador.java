package com.grupo.retail.patterns.observer;

import org.springframework.stereotype.Component;

/**
 * Patrón Observer (GoF) - Observador concreto post-commit (US2).
 *
 * <p>Emite una línea de auditoría estructurada (clave=valor) por cada creación o cambio
 * de estado confirmado de un pedido. Corre después del commit, así que una transición
 * revertida no deja rastro de auditoría.</p>
 */
@Component
public class AuditoriaConsolaObservador implements ObservadorPedidoPostCommit {

    private static final System.Logger LOGGER = System.getLogger("auditoria.pedidos");
    private static final String SIN_ESTADO_ANTERIOR = "NINGUNO";

    @Override
    public void alConfirmar(EventoPedido evento) {
        LOGGER.log(System.Logger.Level.INFO, formatear(evento));
    }

    /** Formato estable para que la auditoría se pueda buscar y procesar. */
    public static String formatear(EventoPedido evento) {
        String anterior = evento.estadoAnterior() == null ? SIN_ESTADO_ANTERIOR : evento.estadoAnterior();
        return "AUDITORIA_PEDIDO pedido=" + evento.pedidoId()
                + " cliente=" + evento.clienteId()
                + " anterior=" + anterior
                + " nuevo=" + evento.estadoNuevo()
                + " fecha=" + evento.fecha()
                + " motivo=\"" + evento.motivo().replace("\"", "'") + "\"";
    }
}
