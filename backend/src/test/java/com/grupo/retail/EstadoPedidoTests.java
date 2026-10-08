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
}
