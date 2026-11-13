package com.grupo.retail.service;

import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.PagoDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.LineaReposicion;
import com.grupo.retail.model.PagoReembolsable;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.model.RegistroMovimiento.TipoMovimiento;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.adapter.PuertoPago;
import com.grupo.retail.patterns.state.EstadoPedido;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.function.Function;

@Service
public class PedidoService {
    private static final String CANCELADO = "CANCELADO";
    private static final String MOTIVO_CANCELACION = "Pedido cancelado; stock y pago simulado reversados";

    private final PedidoDAO pedidoDAO;
    private final PagoDAO pagoDAO;
    private final InventarioDAO inventarioDAO;
    private final PuertoPago puertoPago;
    private final EjecutorTransaccion ejecutorTransaccion;
    private final PublicadorEventosPedido publicadorEventos;

    public PedidoService(
            PedidoDAO pedidoDAO,
            PagoDAO pagoDAO,
            InventarioDAO inventarioDAO,
            PuertoPago puertoPago,
            EjecutorTransaccion ejecutorTransaccion,
            PublicadorEventosPedido publicadorEventos) {
        this.pedidoDAO = pedidoDAO;
        this.pagoDAO = pagoDAO;
        this.inventarioDAO = inventarioDAO;
        this.puertoPago = puertoPago;
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
     *
     * <p>El cobro se devuelve a través de {@link PuertoPago} (Adapter), igual que en las
     * devoluciones. El reembolso se pide al final, después de reponer stock y registrar la
     * cancelación: si el proveedor lo rechaza, se lanza IllegalStateException y la
     * transacción se revierte entera (el pedido sigue pendiente).</p>
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
            PagoReembolsable pago = pagoDAO.bloquearPagoAprobado(conexion, pedidoId)
                    .orElseThrow(() -> new IllegalStateException("No se encontró un pago aprobado para reversar"));
            reponerStock(conexion, pedidoId, responsableId);
            if (!pagoDAO.marcarReversado(conexion, pago.id())) {
                throw new IllegalStateException("No se encontró un pago aprobado para reversar");
            }
            if (!pedidoDAO.marcarCancelado(conexion, pedidoId, cancelado.nombre())) {
                throw new IllegalStateException("El pedido dejó de estar pendiente");
            }
            pedidoDAO.registrarHistorial(conexion, pedidoId, cancelado.nombre(), responsableId, MOTIVO_CANCELACION);
            ResultadoPago reembolso = puertoPago.reembolsar(pago.disponible(), pago.referencia(), null);
            if (reembolso == null || !reembolso.aprobado()) {
                throw new IllegalStateException("El proveedor de pago rechazó la devolución del cobro; "
                        + "el pedido sigue pendiente");
            }
            publicadorEventos.publicar(conexion, new EventoPedido(
                    pedidoId, pedido.clienteId(), pedido.estado(), cancelado.nombre(),
                    OffsetDateTime.now(), MOTIVO_CANCELACION, responsableId));
            return null;
        });
    }

    /** Devuelve al stock las unidades del pedido y deja un movimiento CANCELACION por línea. */
    private void reponerStock(Connection conexion, long pedidoId, Long responsableId) throws SQLException {
        List<LineaReposicion> lineas = pedidoDAO.bloquearLineasPedido(conexion, pedidoId);
        if (lineas.isEmpty()) {
            throw new IllegalStateException("El pedido no tiene productos para reponer");
        }
        for (LineaReposicion linea : lineas) {
            if (!inventarioDAO.sumarStock(conexion, linea.productoId(), linea.cantidad())) {
                throw new IllegalStateException("No se pudo reponer un producto del pedido");
            }
            inventarioDAO.registrarMovimiento(conexion, new RegistroMovimiento(
                    linea.productoId(), TipoMovimiento.CANCELACION, linea.cantidad(),
                    "Reposición por cancelación del pedido #" + pedidoId, responsableId, pedidoId, null));
        }
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
                    OffsetDateTime.now(), comentario, responsableId));
            return null;
        });
    }
}
