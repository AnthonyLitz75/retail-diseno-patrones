package com.grupo.retail.service;

import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.state.EstadoPedido;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.function.Function;

@Service
public class PedidoService {
    private static final String CANCELADO = "CANCELADO";
    private static final String MOTIVO_CANCELACION = "Pedido cancelado; stock y pago simulado reversados";

    private final PedidoDAO pedidoDAO;
    private final EjecutorTransaccion ejecutorTransaccion;
    private final PublicadorEventosPedido publicadorEventos;

    public PedidoService(
            PedidoDAO pedidoDAO,
            EjecutorTransaccion ejecutorTransaccion,
            PublicadorEventosPedido publicadorEventos) {
        this.pedidoDAO = pedidoDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
        this.publicadorEventos = publicadorEventos;
    }

    public List<PedidoVista> listarPedidosCliente(Long clienteId) {
        return pedidoDAO.listarPorCliente(clienteId);
    }

    public PedidoVista buscarPedidoCliente(Long pedidoId, Long clienteId) {
        return pedidoDAO.buscarPorIdYCliente(pedidoId, clienteId)
                .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
    }

    public List<PedidoVista> listarPendientes() {
        return pedidoDAO.listarPendientes();
    }

    public List<PedidoVista> listarOperativos() {
        return pedidoDAO.listarOperativos();
    }

    public void prepararPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::preparar,
                "Pedido preparado por almacén", null);
    }

    public void despacharPedido(
            Long pedidoId, Long responsableId, String transportista, String codigoSeguimiento) {
        if (transportista == null || transportista.isBlank()
                || codigoSeguimiento == null || codigoSeguimiento.isBlank()) {
            throw new IllegalArgumentException(
                    "El transportista y el código de seguimiento son obligatorios");
        }
        cambiarEstado(pedidoId, responsableId, EstadoPedido::despachar,
                "Pedido despachado por almacén", new EnvioPedido(
                        transportista.strip(), codigoSeguimiento.strip(), null));
    }

    public void entregarPedido(Long pedidoId, Long responsableId) {
        cambiarEstado(pedidoId, responsableId, EstadoPedido::entregar,
                "Entrega del pedido registrada por almacén", null);
    }

    public void cancelarPedidoComoCliente(Long pedidoId, Long clienteId) {
        cancelarPedido(pedidoId, clienteId, clienteId);
    }

    public void cancelarPedidoComoVendedor(Long pedidoId, Long vendedorId) {
        cancelarPedido(pedidoId, null, vendedorId);
    }

    public void cancelarPedidoComoAdmin(Long pedidoId, Long adminId) {
        cancelarPedido(pedidoId, null, adminId);
    }

    /**
     * Cancela en una sola transacción. El pedido se bloquea primero y la transición la
     * decide el patrón State con el estado real leído bajo ese bloqueo: dos cancelaciones
     * simultáneas se serializan y la segunda encuentra el pedido ya cancelado.
     * Un estado que no admite cancelar lanza IllegalStateException (409).
     */
    private void cancelarPedido(Long pedidoId, Long clienteId, Long responsableId) {
        ejecutorTransaccion.ejecutar("No se pudo cancelar el pedido", conexion -> {
            PedidoBloqueado pedido = pedidoDAO.bloquearEstadoPedido(conexion, pedidoId, clienteId)
                    .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
            if (CANCELADO.equals(pedido.estado())) {
                // Repetir la cancelación es seguro: la primera ya aplicó todos los efectos.
                return null;
            }
            EstadoPedido cancelado = EstadoPedido.desde(pedido.estado()).cancelar();
            pedidoDAO.registrarCancelacion(conexion, pedidoId, responsableId, cancelado.nombre());
            publicadorEventos.publicar(conexion, new EventoPedido(
                    pedidoId, pedido.clienteId(), pedido.estado(), cancelado.nombre(),
                    OffsetDateTime.now(), MOTIVO_CANCELACION));
            return null;
        });
    }

    /**
     * Transición de almacén en una sola transacción: bloquea el pedido, el patrón State
     * decide con el estado real leído bajo ese bloqueo, el DAO registra el cambio con su
     * envío e historial y el patrón Observer avisa a los canales registrados. Una
     * transición no válida lanza IllegalStateException y un código de seguimiento
     * repetido CodigoSeguimientoDuplicadoException; ambas responden 409.
     */
    private void cambiarEstado(
            Long pedidoId, Long responsableId,
            Function<EstadoPedido, EstadoPedido> transicion,
            String comentario, EnvioPedido envio) {
        ejecutorTransaccion.ejecutar("No se pudo actualizar el estado del pedido", conexion -> {
            PedidoBloqueado pedido = pedidoDAO.bloquearEstadoPedido(conexion, pedidoId, null)
                    .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
            EstadoPedido nuevoEstado = transicion.apply(EstadoPedido.desde(pedido.estado()));
            pedidoDAO.registrarTransicion(
                    conexion, pedidoId, nuevoEstado.nombre(), responsableId, comentario, envio);
            publicadorEventos.publicar(conexion, new EventoPedido(
                    pedidoId, pedido.clienteId(), pedido.estado(), nuevoEstado.nombre(),
                    OffsetDateTime.now(), comentario));
            return null;
        });
    }
}
