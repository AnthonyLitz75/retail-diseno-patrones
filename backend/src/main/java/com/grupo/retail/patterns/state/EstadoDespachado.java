package com.grupo.retail.patterns.state;

public class EstadoDespachado implements EstadoPedido {
    @Override
    public String nombre() {
        return "DESPACHADO";
    }

    @Override
    public EstadoPedido preparar() {
        throw new IllegalStateException("El pedido ya fue despachado");
    }

    @Override
    public EstadoPedido despachar() {
        throw new IllegalStateException("El pedido ya fue despachado");
    }

    @Override
    public EstadoPedido entregar() {
        return new EstadoEntregado();
    }
}
