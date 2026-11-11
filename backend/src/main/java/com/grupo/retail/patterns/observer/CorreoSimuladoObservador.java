package com.grupo.retail.patterns.observer;

import com.grupo.retail.model.EventoNotificacion;
import com.grupo.retail.patterns.factory.FabricaNotificadorConsola;
import org.springframework.stereotype.Component;

/**
 * Patrón Observer (GoF) - Observador concreto post-commit.
 *
 * <p>Simula el aviso por correo escribiéndolo en la consola, solo cuando el cambio ya está
 * confirmado: un pedido revertido nunca genera un "correo". Obtiene el canal con el
 * Factory Method de consola. No representa una entrega real.</p>
 */
@Component
public class CorreoSimuladoObservador implements ObservadorPedidoPostCommit {

    private final FabricaNotificadorConsola fabrica;

    public CorreoSimuladoObservador(FabricaNotificadorConsola fabrica) {
        this.fabrica = fabrica;
    }

    @Override
    public void alConfirmar(EventoPedido evento) {
        fabrica.crearNotificador().notificar(new EventoNotificacion(
                evento.clienteId(), evento.pedidoId(), evento.estadoNuevo(), evento.motivo()));
    }
}
