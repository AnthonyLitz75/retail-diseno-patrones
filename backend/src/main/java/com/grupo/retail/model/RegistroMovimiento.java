package com.grupo.retail.model;

/**
 * Datos de un movimiento de inventario por registrar en el kardex. {@code pedidoId} y
 * {@code devolucionId} son opcionales y dejan la trazabilidad del documento de origen.
 */
public record RegistroMovimiento(
        long productoId,
        TipoMovimiento tipo,
        int cantidadFirmada,
        String motivo,
        Long responsableId,
        Long pedidoId,
        Long devolucionId) {

    /** Tipos admitidos por la restricción CHECK de {@code movimiento_inventario.tipo}. */
    public enum TipoMovimiento { ENTRADA, SALIDA, AJUSTE, CANCELACION, DEVOLUCION }

    public RegistroMovimiento {
        if (cantidadFirmada == 0) {
            throw new IllegalArgumentException("Un movimiento de inventario no puede ser de cero unidades");
        }
    }

    public static RegistroMovimiento simple(long productoId, TipoMovimiento tipo, int cantidadFirmada,
            String motivo, Long responsableId) {
        return new RegistroMovimiento(productoId, tipo, cantidadFirmada, motivo, responsableId, null, null);
    }
}
