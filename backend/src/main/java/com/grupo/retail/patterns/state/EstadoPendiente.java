package com.grupo.retail.patterns.state;

public class EstadoPendiente implements EstadoPedido {
    @Override
    public String nombre() {
        return "PENDIENTE";
    }

    @Override
    public EstadoPedido preparar() {
        return new EstadoEnPreparacion();
    }

    @Override
    public EstadoPedido despachar() {
        throw new IllegalStateException("El pedido debe prepararse antes del despacho");
    }

    @Override
    public EstadoPedido entregar() {
        throw new IllegalStateException("El pedido debe despacharse antes de la entrega");
    }
}
