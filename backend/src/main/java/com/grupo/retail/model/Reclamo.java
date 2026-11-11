package com.grupo.retail.model;

import java.time.OffsetDateTime;

/**
 * Reclamo de un cliente sobre un pedido propio entregado (RF13, RF24, RF28).
 *
 * @param soporteId agente de soporte que lo atiende (nulo hasta que alguien lo toma)
 * @param adminId   administrador que resolvió o devolvió el escalamiento
 */
public record Reclamo(
        Long id,
        Long pedidoId,
        Long clienteId,
        Long soporteId,
        Long adminId,
        String motivo,
        String descripcion,
        EstadoReclamo estado,
        String respuesta,
        String motivoEscalamiento,
        String resolucionAdmin,
        OffsetDateTime creadoEn,
        OffsetDateTime actualizadoEn) {

    public Reclamo tomadoPor(long agente) {
        return new Reclamo(id, pedidoId, clienteId, agente, adminId, motivo, descripcion,
                EstadoReclamo.EN_ATENCION, respuesta, motivoEscalamiento, resolucionAdmin, creadoEn, actualizadoEn);
    }

    public Reclamo respondido(String texto, EstadoReclamo nuevoEstado) {
        return new Reclamo(id, pedidoId, clienteId, soporteId, adminId, motivo, descripcion,
                nuevoEstado, texto, motivoEscalamiento, resolucionAdmin, creadoEn, actualizadoEn);
    }

    public Reclamo escalado(String motivoDelEscalamiento) {
        return new Reclamo(id, pedidoId, clienteId, soporteId, adminId, motivo, descripcion,
                EstadoReclamo.ESCALADO, respuesta, motivoDelEscalamiento, resolucionAdmin, creadoEn, actualizadoEn);
    }

    public Reclamo resueltoPorAdmin(long administrador, String resolucion, EstadoReclamo nuevoEstado) {
        return new Reclamo(id, pedidoId, clienteId, soporteId, administrador, motivo, descripcion,
                nuevoEstado, respuesta, motivoEscalamiento, resolucion, creadoEn, actualizadoEn);
    }
}
