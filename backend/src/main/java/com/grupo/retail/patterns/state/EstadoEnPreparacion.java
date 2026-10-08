package com.grupo.retail.patterns.state;

public class EstadoEnPreparacion implements EstadoPedido {
    @Override
    public String nombre() {
        return "EN_PREPARACION";
    }

    @Override
    public EstadoPedido preparar() {
        throw new IllegalStateException("El pedido ya se encuentra en preparación");
    }

    @Override
    public EstadoPedido despachar() {
        return new EstadoDespachado();
    }

    @Override
    public EstadoPedido entregar() {
        throw new IllegalStateException("El pedido debe despacharse antes de la entrega");
    }
}
