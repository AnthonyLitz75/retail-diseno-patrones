package com.grupo.retail.patterns.observer;

import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.service.AuditoriaService;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Patrón Observer (GoF) - Observador concreto transaccional.
 *
 * <p>Deja en el registro de auditoría cada creación o cambio de estado de pedidos, reclamos
 * y devoluciones, con quién lo hizo. Escribe con la conexión del caso de uso: si el cambio
 * se revierte, el registro también. Se agregó sin modificar los servicios que publican los
 * eventos (abierto/cerrado): basta con ser un {@code @Component} de esta interfaz.</p>
 */
@Component
public class AuditoriaPedidoObservador implements ObservadorPedidoTransaccional {

    private static final String PREFIJO_RECLAMO = "RECLAMO_";
    private static final String PREFIJO_DEVOLUCION = "DEVOLUCION_";

    private final AuditoriaService auditoriaService;

    public AuditoriaPedidoObservador(AuditoriaService auditoriaService) {
        this.auditoriaService = auditoriaService;
    }

    @Override
    public void alCambiarEstado(Connection conexion, EventoPedido evento) throws SQLException {
        auditoriaService.registrar(conexion, convertir(evento));
    }

    /** El evento de pedido como registro de auditoría (público para probarlo sin base de datos). */
    public static EventoAuditoria convertir(EventoPedido evento) {
        String anterior = evento.estadoAnterior() == null ? "(nuevo)" : evento.estadoAnterior();
        String detalle = "Pedido #" + evento.pedidoId() + ": " + anterior + " → " + evento.estadoNuevo()
                + ". " + evento.motivo();
        return EventoAuditoria.de(evento.responsableId(), AccionAuditoria.PEDIDO_ESTADO,
                entidad(evento.estadoNuevo()), evento.pedidoId(), detalle);
    }

    private static String entidad(String estadoNuevo) {
        if (estadoNuevo.startsWith(PREFIJO_RECLAMO)) {
            return "RECLAMO";
        }
        if (estadoNuevo.startsWith(PREFIJO_DEVOLUCION)) {
            return "DEVOLUCION";
        }
        return "PEDIDO";
    }
}
