package com.grupo.retail.patterns.observer;

/**
 * Patrón Observer (GoF) - Observador que reacciona solo cuando el cambio ya está
 * confirmado (después del commit). No recibe conexión ni puede afectar la transacción;
 * si la transacción se revierte, nunca se le avisa.
 */
public interface ObservadorPedidoPostCommit {

    void alConfirmar(EventoPedido evento);
}
