package com.grupo.retail.patterns.state;

public class EstadoCancelado implements EstadoPedido {
    @Override
    public String nombre() {
        return "CANCELADO";
    }

    @Override
    public EstadoPedido preparar() {
        throw new IllegalStateException("Un pedido cancelado no puede prepararse");
    }

    @Override
    public EstadoPedido despachar() {
        throw new IllegalStateException("Un pedido cancelado no puede despacharse");
    }

    @Override
    public EstadoPedido entregar() {
        throw new IllegalStateException("Un pedido cancelado no puede entregarse");
    }

    @Override
    public EstadoPedido cancelar() {
        throw new IllegalStateException("El pedido ya está cancelado");
    }
}
