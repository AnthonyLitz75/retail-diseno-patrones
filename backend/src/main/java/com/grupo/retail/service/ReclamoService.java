package com.grupo.retail.service;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dao.ReclamoDAO;
import com.grupo.retail.dto.EscalarReclamo;
import com.grupo.retail.dto.RegistrarReclamo;
import com.grupo.retail.dto.ResolverIncidencia;
import com.grupo.retail.dto.ResponderReclamo;
import com.grupo.retail.model.EstadoReclamo;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.Reclamo;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Reclamos del cliente, atención de Soporte y escalamiento al administrador (spec 006:
 * RF13, RF24, RF28). Cada transición es una transacción: se bloquea el reclamo, se valida
 * el estado ({@link EstadoReclamo}) y el responsable, se guarda y se avisa al cliente con
 * el patrón Observer (alerta in-app en la misma transacción, auditoría tras el commit).
 */
@Service
public class ReclamoService {

    private static final String ENTREGADO = "ENTREGADO";
    private static final String PREFIJO_EVENTO = "RECLAMO_";

    private final ReclamoDAO reclamoDAO;
    private final PedidoDAO pedidoDAO;
    private final EjecutorTransaccion ejecutorTransaccion;
    private final PublicadorEventosPedido publicadorEventos;

    public ReclamoService(ReclamoDAO reclamoDAO, PedidoDAO pedidoDAO,
            EjecutorTransaccion ejecutorTransaccion, PublicadorEventosPedido publicadorEventos) {
        this.reclamoDAO = reclamoDAO;
        this.pedidoDAO = pedidoDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
        this.publicadorEventos = publicadorEventos;
    }

    /** RF13: solo sobre un pedido propio ENTREGADO (ajeno 404, otro estado 400). */
    public Reclamo registrar(long clienteId, long pedidoId, RegistrarReclamo datos) {
        return ejecutorTransaccion.ejecutar("No se pudo registrar el reclamo", conexion -> {
            PedidoBloqueado pedido = pedidoDAO.bloquearEstadoPedido(conexion, pedidoId, clienteId)
                    .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
            if (!ENTREGADO.equals(pedido.estado())) {
                throw new IllegalArgumentException("Solo puedes reclamar sobre un pedido entregado");
            }
            Reclamo reclamo = reclamoDAO.insertar(
                    conexion, pedidoId, clienteId, datos.motivo().strip(), datos.descripcion().strip());
            avisar(conexion, reclamo, null, "RECLAMO_REGISTRADO",
                    "Registramos tu reclamo #" + reclamo.id() + "; Soporte lo atenderá pronto");
            return reclamo;
        });
    }

    public List<Reclamo> listarDelCliente(long clienteId) {
        return reclamoDAO.listarPorCliente(clienteId);
    }

    /** Bandeja de Soporte (SOPORTE y ADMIN); sin filtro, los reclamos no resueltos. */
    public List<Reclamo> listarBandeja(String estado) {
        return reclamoDAO.listarPorEstado(estado == null || estado.isBlank()
                ? null
                : EstadoReclamo.desdeFiltro(estado.strip()));
    }

    public List<Reclamo> listarIncidencias() {
        return reclamoDAO.listarPorEstado(EstadoReclamo.ESCALADO);
    }

    /** RF24: el agente toma un reclamo ABIERTO y queda como responsable. */
    public Reclamo tomar(long idReclamo, long soporteId) {
        return transicion(idReclamo, (conexion, reclamo) -> {
            reclamo.estado().validarTransicion(EstadoReclamo.EN_ATENCION);
            return reclamoDAO.guardar(conexion, reclamo.tomadoPor(soporteId));
        });
    }

    /** RF24: solo el agente responsable responde; RESUELTO cierra, EN_ATENCION es parcial. */
    public Reclamo responder(long idReclamo, long soporteId, ResponderReclamo datos) {
        return transicion(idReclamo, (conexion, reclamo) -> {
            exigirResponsable(reclamo, soporteId);
            EstadoReclamo destino = EstadoReclamo.valueOf(datos.estado());
            if (destino != EstadoReclamo.EN_ATENCION) {
                reclamo.estado().validarTransicion(destino);
            }
            Reclamo actualizado = reclamoDAO.guardar(conexion, reclamo.respondido(datos.respuesta().strip(), destino));
            boolean resuelto = destino == EstadoReclamo.RESUELTO;
            avisar(conexion, actualizado, reclamo.estado(),
                    resuelto ? "RECLAMO_RESUELTO" : "RECLAMO_RESPONDIDO",
                    (resuelto ? "Resolvimos tu reclamo #" : "Respondimos tu reclamo #") + reclamo.id());
            return actualizado;
        });
    }

    /** RF28: el agente responsable escala el reclamo al administrador. */
    public Reclamo escalar(long idReclamo, long soporteId, EscalarReclamo datos) {
        return transicion(idReclamo, (conexion, reclamo) -> {
            exigirResponsable(reclamo, soporteId);
            reclamo.estado().validarTransicion(EstadoReclamo.ESCALADO);
            Reclamo actualizado = reclamoDAO.guardar(conexion, reclamo.escalado(datos.motivoEscalamiento().strip()));
            avisar(conexion, actualizado, reclamo.estado(), "RECLAMO_ESCALADO",
                    "Tu reclamo #" + reclamo.id() + " pasó a revisión de un administrador");
            return actualizado;
        });
    }

    /**
     * RF28: el administrador resuelve un reclamo ESCALADO o lo devuelve a Soporte
     * (EN_ATENCION) con la resolución como instrucciones. Queda registrado como responsable.
     */
    public Reclamo resolverIncidencia(long idReclamo, long adminId, ResolverIncidencia datos) {
        return transicion(idReclamo, (conexion, reclamo) -> {
            if (reclamo.estado() != EstadoReclamo.ESCALADO) {
                throw new IllegalStateException("Solo se resuelven reclamos escalados");
            }
            EstadoReclamo destino = datos.devolverASoporte() ? EstadoReclamo.EN_ATENCION : EstadoReclamo.RESUELTO;
            reclamo.estado().validarTransicion(destino);
            Reclamo actualizado = reclamoDAO.guardar(
                    conexion, reclamo.resueltoPorAdmin(adminId, datos.resolucion().strip(), destino));
            if (destino == EstadoReclamo.RESUELTO) {
                avisar(conexion, actualizado, reclamo.estado(), "RECLAMO_RESUELTO",
                        "Resolvimos tu reclamo #" + reclamo.id());
            }
            return actualizado;
        });
    }

    @FunctionalInterface
    private interface Cambio {
        Reclamo aplicar(Connection conexion, Reclamo reclamoBloqueado) throws SQLException;
    }

    private Reclamo transicion(long idReclamo, Cambio cambio) {
        return ejecutorTransaccion.ejecutar("No se pudo actualizar el reclamo", conexion -> {
            Reclamo reclamo = reclamoDAO.bloquear(conexion, idReclamo)
                    .orElseThrow(() -> new NoSuchElementException("No existe el reclamo solicitado"));
            return cambio.aplicar(conexion, reclamo);
        });
    }

    private static void exigirResponsable(Reclamo reclamo, long soporteId) {
        if (reclamo.estado() != EstadoReclamo.EN_ATENCION) {
            throw new IllegalStateException("Primero toma el reclamo para atenderlo");
        }
        if (reclamo.soporteId() == null || reclamo.soporteId() != soporteId) {
            throw new IllegalStateException("Este reclamo lo atiende otro agente de soporte");
        }
    }

    private void avisar(Connection conexion, Reclamo reclamo, EstadoReclamo anterior, String evento, String mensaje)
            throws SQLException {
        publicadorEventos.publicar(conexion, new EventoPedido(
                reclamo.pedidoId(), reclamo.clienteId(),
                anterior == null ? null : PREFIJO_EVENTO + anterior.name(),
                evento, OffsetDateTime.now(), mensaje));
    }
}
