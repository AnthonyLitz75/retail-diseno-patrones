package com.grupo.retail.patterns.observer;

import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Objects;

/**
 * Patrón Observer (GoF) - Sujeto.
 *
 * <p>Los casos de uso de pedidos ({@code CheckoutFacade}, {@code PedidoService}) solo
 * publican un {@link EventoPedido}; no saben qué canales existen. Spring registra aquí
 * todos los beans que implementan las interfaces de observador, de modo que un canal
 * nuevo es una clase nueva con {@code @Component}, sin editar los servicios (abierto/cerrado).</p>
 *
 * <ul>
 *   <li>Los observadores transaccionales se avisan de inmediato, con la conexión del caso
 *       de uso: su escritura comparte la transacción del pedido.</li>
 *   <li>Los observadores post-commit se programan con {@link EjecutorTransaccion#trasConfirmar}:
 *       corren después del commit y nunca si hay rollback.</li>
 * </ul>
 */
@Component
public class PublicadorEventosPedido {

    private final List<ObservadorPedidoTransaccional> transaccionales;
    private final List<ObservadorPedidoPostCommit> postCommit;
    private final EjecutorTransaccion ejecutorTransaccion;

    public PublicadorEventosPedido(
            List<ObservadorPedidoTransaccional> transaccionales,
            List<ObservadorPedidoPostCommit> postCommit,
            EjecutorTransaccion ejecutorTransaccion) {
        this.transaccionales = List.copyOf(transaccionales);
        this.postCommit = List.copyOf(postCommit);
        this.ejecutorTransaccion = Objects.requireNonNull(ejecutorTransaccion);
    }

    /** Debe llamarse dentro de una transacción de {@link EjecutorTransaccion}. */
    public void publicar(Connection conexion, EventoPedido evento) throws SQLException {
        for (ObservadorPedidoTransaccional observador : transaccionales) {
            observador.alCambiarEstado(conexion, evento);
        }
        for (ObservadorPedidoPostCommit observador : postCommit) {
            ejecutorTransaccion.trasConfirmar(() -> observador.alConfirmar(evento));
        }
    }
}
