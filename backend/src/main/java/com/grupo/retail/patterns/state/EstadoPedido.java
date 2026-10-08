package com.grupo.retail.patterns.state;

public interface EstadoPedido {
    String nombre();

    EstadoPedido preparar();

    EstadoPedido despachar();

    EstadoPedido entregar();

    static EstadoPedido desde(String nombre) {
        return switch (nombre) {
            case "PENDIENTE" -> new EstadoPendiente();
            case "EN_PREPARACION" -> new EstadoEnPreparacion();
            case "DESPACHADO" -> new EstadoDespachado();
            case "ENTREGADO" -> new EstadoEntregado();
            default -> throw new IllegalStateException("El pedido está en estado " + nombre
                    + " y no admite estas transiciones");
        };
    }
}
