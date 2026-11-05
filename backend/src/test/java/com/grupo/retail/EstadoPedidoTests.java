package com.grupo.retail;

import com.grupo.retail.patterns.state.EstadoPedido;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class EstadoPedidoTests {
    @Test
    void elPedidoAvanzaEnOrdenHastaLaEntrega() {
        EstadoPedido preparacion = EstadoPedido.desde("PENDIENTE").preparar();
        assertEquals("EN_PREPARACION", preparacion.nombre());

        EstadoPedido despacho = preparacion.despachar();
        assertEquals("DESPACHADO", despacho.nombre());
        assertEquals("ENTREGADO", despacho.entregar().nombre());
    }

    @Test
    void noSePuedeDespacharAntesDePreparar() {
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("PENDIENTE").despachar());
    }

    @Test
    void noSePuedeEntregarAntesDeDespachar() {
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("EN_PREPARACION").entregar());
    }

    @Test
    void noSePuedeRepetirUnaTransicion() {
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("DESPACHADO").despachar());
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("ENTREGADO").entregar());
    }

    @Test
    void soloUnPedidoPendientePuedeCancelarse() {
        assertEquals("CANCELADO", EstadoPedido.desde("PENDIENTE").cancelar().nombre());
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("EN_PREPARACION").cancelar());
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("DESPACHADO").cancelar());
        assertThrows(IllegalStateException.class,
                () -> EstadoPedido.desde("ENTREGADO").cancelar());
    }

    @Test
    void unPedidoCanceladoEsTerminal() {
        EstadoPedido cancelado = EstadoPedido.desde("CANCELADO");
        assertThrows(IllegalStateException.class, cancelado::preparar);
        assertThrows(IllegalStateException.class, cancelado::despachar);
        assertThrows(IllegalStateException.class, cancelado::entregar);
        assertThrows(IllegalStateException.class, cancelado::cancelar);
    }
}
