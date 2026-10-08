package com.grupo.retail.patterns.state;

public class EstadoEntregado implements EstadoPedido {
    @Override
    public String nombre() {
        return "ENTREGADO";
    }

    @Override
    public EstadoPedido preparar() {
        throw new IllegalStateException("El pedido ya fue entregado");
    }

    @Override
    public EstadoPedido despachar() {
        throw new IllegalStateException("El pedido ya fue entregado");
    }

    @Override
    public EstadoPedido entregar() {
        throw new IllegalStateException("El pedido ya fue entregado");
    }
}
