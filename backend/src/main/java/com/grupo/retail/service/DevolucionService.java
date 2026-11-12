package com.grupo.retail.service;

import com.grupo.retail.dao.DevolucionDAO;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.PagoDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.dto.DecidirDevolucion;
import com.grupo.retail.dto.LineaRecepcionDevolucion;
import com.grupo.retail.dto.LineaSolicitudDevolucion;
import com.grupo.retail.dto.RecepcionDevolucion;
import com.grupo.retail.dto.SolicitarDevolucion;
import com.grupo.retail.model.DetalleDevolucion;
import com.grupo.retail.model.Devolucion;
import com.grupo.retail.model.EstadoDevolucion;
import com.grupo.retail.model.LineaDevolvible;
import com.grupo.retail.model.PagoReembolsable;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.model.RegistroMovimiento.TipoMovimiento;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.observer.PublicadorEventosPedido;
import com.grupo.retail.patterns.pago.PuertoPago;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Devoluciones (spec 006: RF14, RF25, RF26). Cada operación es una transacción:
 * <ul>
 *   <li>solicitar bloquea el pedido, así dos solicitudes simultáneas no superan lo comprado;</li>
 *   <li>decidir bloquea la devolución y valida la transición ({@link EstadoDevolucion});</li>
 *   <li>cerrar repone las líneas aptas (productos en orden ascendente), reembolsa por el
 *   precio histórico con {@link PuertoPago} (Adapter) y cierra; si el reembolso se
 *   rechaza, se revierte todo.</li>
 * </ul>
 * El cliente recibe cada cambio por el patrón Observer.
 */
@Service
public class DevolucionService {

    private static final String ENTREGADO = "ENTREGADO";
    private static final String PREFIJO_EVENTO = "DEVOLUCION_";

    private final DevolucionDAO devolucionDAO;
    private final PedidoDAO pedidoDAO;
    private final PagoDAO pagoDAO;
    private final InventarioDAO inventarioDAO;
    private final PuertoPago puertoPago;
    private final EjecutorTransaccion ejecutorTransaccion;
    private final PublicadorEventosPedido publicadorEventos;

    public DevolucionService(DevolucionDAO devolucionDAO, PedidoDAO pedidoDAO, PagoDAO pagoDAO,
            InventarioDAO inventarioDAO, PuertoPago puertoPago, EjecutorTransaccion ejecutorTransaccion,
            PublicadorEventosPedido publicadorEventos) {
        this.devolucionDAO = devolucionDAO;
        this.pedidoDAO = pedidoDAO;
        this.pagoDAO = pagoDAO;
        this.inventarioDAO = inventarioDAO;
        this.puertoPago = puertoPago;
        this.ejecutorTransaccion = ejecutorTransaccion;
        this.publicadorEventos = publicadorEventos;
    }

    /** RF14: pedido propio ENTREGADO (ajeno 404, otro estado 400) y sin superar el saldo. */
    public Devolucion solicitar(long clienteId, long pedidoId, SolicitarDevolucion datos) {
        return ejecutorTransaccion.ejecutar("No se pudo registrar la devolución", conexion -> {
            PedidoBloqueado pedido = pedidoDAO.bloquearEstadoPedido(conexion, pedidoId, clienteId)
                    .orElseThrow(() -> new NoSuchElementException("No existe el pedido solicitado"));
            if (!ENTREGADO.equals(pedido.estado())) {
                throw new IllegalArgumentException("Solo puedes devolver productos de un pedido entregado");
            }
            Map<Long, LineaDevolvible> devolvibles = devolucionDAO.lineasDevolvibles(conexion, pedidoId);
            Set<Long> vistas = new HashSet<>();
            BigDecimal importe = BigDecimal.ZERO;
            for (LineaSolicitudDevolucion linea : datos.lineas()) {
                LineaDevolvible devolvible = devolvibles.get(linea.pedidoDetalleId());
                if (devolvible == null) {
                    throw new IllegalArgumentException("La línea " + linea.pedidoDetalleId()
                            + " no pertenece a este pedido");
                }
                if (!vistas.add(linea.pedidoDetalleId())) {
                    throw new IllegalArgumentException("Cada línea del pedido se indica una sola vez");
                }
                if (linea.cantidad() > devolvible.saldo()) {
                    throw new IllegalArgumentException("Solo puedes devolver " + devolvible.saldo()
                            + " unidad(es) de esa línea");
                }
                importe = importe.add(devolvible.precioUnitario().multiply(BigDecimal.valueOf(linea.cantidad())));
            }
            long devolucionId = devolucionDAO.insertar(conexion, pedidoId, clienteId, datos.motivo().strip(), importe);
            for (LineaSolicitudDevolucion linea : datos.lineas()) {
                devolucionDAO.insertarDetalle(conexion, devolucionId,
                        devolvibles.get(linea.pedidoDetalleId()), linea.cantidad());
            }
            Devolucion devolucion = devolucionDAO.buscar(conexion, devolucionId);
            avisar(conexion, devolucion, null, EstadoDevolucion.SOLICITADA,
                    "Registramos tu solicitud de devolución #" + devolucionId);
            return devolucion;
        });
    }

    public List<Devolucion> listarDelCliente(long clienteId) {
        return devolucionDAO.listarPorCliente(clienteId);
    }

    /** Bandeja de Soporte (SOPORTE y ADMIN); sin filtro, las que esperan decisión o recepción. */
    public List<Devolucion> listarBandeja(String estado) {
        return devolucionDAO.listarPorEstado(estado == null || estado.isBlank()
                ? null
                : EstadoDevolucion.desdeFiltro(estado.strip()));
    }

    /** RF25: Soporte aprueba o rechaza una devolución SOLICITADA. */
    public Devolucion decidir(long devolucionId, long soporteId, DecidirDevolucion datos) {
        return ejecutorTransaccion.ejecutar("No se pudo registrar la decisión", conexion -> {
            Devolucion devolucion = bloquear(conexion, devolucionId);
            EstadoDevolucion destino = datos.aprobada() ? EstadoDevolucion.APROBADA : EstadoDevolucion.RECHAZADA;
            devolucion.estado().validarTransicion(destino);
            devolucionDAO.registrarDecision(conexion, devolucionId, destino, soporteId,
                    datos.observacion() == null || datos.observacion().isBlank() ? null : datos.observacion().strip());
            Devolucion actualizada = devolucionDAO.buscar(conexion, devolucionId);
            avisar(conexion, actualizada, devolucion.estado(), destino, destino == EstadoDevolucion.APROBADA
                    ? "Aprobamos tu devolución #" + devolucionId + "; envíanos los productos"
                    : "Tu devolución #" + devolucionId + " fue rechazada");
            return actualizada;
        });
    }

    /**
     * RF25 y RF26 (SC-003): recepción y cierre en una sola transacción. Repetirlo es 409
     * (la devolución ya está CERRADA) y un reembolso rechazado revierte stock, movimientos
     * y estado.
     */
    public Devolucion cerrar(long devolucionId, long soporteId, RecepcionDevolucion datos) {
        return ejecutorTransaccion.ejecutar("No se pudo cerrar la devolución", conexion -> {
            Devolucion devolucion = bloquear(conexion, devolucionId);
            devolucion.estado().validarTransicion(EstadoDevolucion.CERRADA);
            Map<Long, Boolean> reintegros = validarRecepcion(devolucion, datos);

            List<DetalleDevolucion> aptas = devolucion.lineas().stream()
                    .filter(linea -> reintegros.get(linea.id()))
                    .sorted(Comparator.comparingLong(DetalleDevolucion::productoId))
                    .toList();
            for (DetalleDevolucion linea : devolucion.lineas()) {
                devolucionDAO.marcarReintegro(conexion, linea.id(), reintegros.get(linea.id()));
            }
            for (DetalleDevolucion linea : aptas) {
                inventarioDAO.sumarStock(conexion, linea.productoId(), linea.cantidad());
                inventarioDAO.registrarMovimiento(conexion, new RegistroMovimiento(
                        linea.productoId(), TipoMovimiento.DEVOLUCION, linea.cantidad(),
                        "Devolución #" + devolucionId + " del pedido #" + devolucion.pedidoId(),
                        soporteId, devolucion.pedidoId(), devolucionId));
            }

            BigDecimal importe = devolucion.lineas().stream()
                    .map(DetalleDevolucion::subtotalReembolso)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            reembolsar(conexion, devolucion, importe, datos.escenarioReembolso());
            devolucionDAO.cerrar(conexion, devolucionId, soporteId, importe);

            Devolucion cerrada = devolucionDAO.buscar(conexion, devolucionId);
            avisar(conexion, cerrada, devolucion.estado(), EstadoDevolucion.CERRADA,
                    "Cerramos tu devolución #" + devolucionId + "; reembolsamos S/ " + importe.toPlainString());
            return cerrada;
        });
    }

    /** Cada línea de la devolución debe venir exactamente una vez (400 si no). */
    private static Map<Long, Boolean> validarRecepcion(Devolucion devolucion, RecepcionDevolucion datos) {
        Map<Long, DetalleDevolucion> lineas = devolucion.lineas().stream()
                .collect(Collectors.toMap(DetalleDevolucion::id, Function.identity()));
        Map<Long, Boolean> reintegros = new HashMap<>();
        for (LineaRecepcionDevolucion linea : datos.lineas()) {
            if (!lineas.containsKey(linea.detalleDevolucionId())) {
                throw new IllegalArgumentException("La línea " + linea.detalleDevolucionId()
                        + " no pertenece a esta devolución");
            }
            if (reintegros.put(linea.detalleDevolucionId(), linea.reintegrarStock()) != null) {
                throw new IllegalArgumentException("Cada línea de la devolución se indica una sola vez");
            }
        }
        if (reintegros.size() != lineas.size()) {
            throw new IllegalArgumentException("Indica el resultado de todas las líneas de la devolución");
        }
        return reintegros;
    }

    private void reembolsar(Connection conexion, Devolucion devolucion, BigDecimal importe, String escenario)
            throws SQLException {
        PagoReembolsable pago = pagoDAO.bloquearPagoAprobado(conexion, devolucion.pedidoId())
                .orElseThrow(() -> new IllegalStateException("El pedido no tiene un cobro aprobado que reembolsar"));
        if (importe.compareTo(pago.disponible()) > 0) {
            throw new IllegalStateException("El reembolso supera lo cobrado y aún no reembolsado");
        }
        ResultadoPago resultado = puertoPago.reembolsar(importe, pago.referencia(), escenario);
        if (!resultado.aprobado()) {
            throw new IllegalStateException("El reembolso fue rechazado por el proveedor de pago; "
                    + "la devolución sigue APROBADA y no se aplicó ningún cambio");
        }
        pagoDAO.acumularReembolso(conexion, pago.id(), importe);
    }

    private Devolucion bloquear(Connection conexion, long devolucionId) throws SQLException {
        return devolucionDAO.bloquear(conexion, devolucionId)
                .orElseThrow(() -> new NoSuchElementException("No existe la devolución solicitada"));
    }

    private void avisar(Connection conexion, Devolucion devolucion, EstadoDevolucion anterior,
            EstadoDevolucion nuevo, String mensaje) throws SQLException {
        publicadorEventos.publicar(conexion, new EventoPedido(
                devolucion.pedidoId(), devolucion.clienteId(),
                anterior == null ? null : PREFIJO_EVENTO + anterior.name(),
                PREFIJO_EVENTO + nuevo.name(), OffsetDateTime.now(), mensaje));
    }
}
