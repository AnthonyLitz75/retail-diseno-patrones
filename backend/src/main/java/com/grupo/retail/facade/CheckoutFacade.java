package com.grupo.retail.facade;

import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.PedidoDAO;
import com.grupo.retail.exception.ClaveConfirmacionEnUsoException;
import com.grupo.retail.exception.PagoRechazadoException;
import com.grupo.retail.exception.StockInsuficienteException;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.ProductoEnCompra;
import com.grupo.retail.model.RegistroMovimiento;
import com.grupo.retail.model.RegistroMovimiento.TipoMovimiento;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Patrón Estructural Facade (GoF).
 *
 * <p>Ofrece {@code confirmarCompra} como entrada única al caso de uso de compra y oculta
 * sus subsistemas: el control transaccional ({@link EjecutorTransaccion}), la persistencia
 * ({@link PedidoDAO}), el inventario ({@link InventarioDAO}) y el proveedor de pago
 * ({@link PuertoPago}, un Adapter).</p>
 *
 * <p>La fachada orquesta los pasos y aplica las reglas del negocio; el DAO solo ejecuta
 * SQL sobre la conexión que recibe. Todos los pasos comparten una única transacción:
 * o se guarda el pedido completo (detalle, stock, movimientos, pago, historial y carrito
 * convertido) o no se guarda nada.</p>
 */
@Service
public class CheckoutFacade {

    private static final String ESTADO_INICIAL = "PENDIENTE";
    private static final String MOTIVO_CONFIRMACION = "Pedido confirmado; pago simulado aprobado";

    private final PedidoDAO pedidoDAO;
    private final InventarioDAO inventarioDAO;
    private final PuertoPago puertoPago;
    private final EjecutorTransaccion ejecutorTransaccion;
    private final PublicadorEventosPedido publicadorEventos;

    public CheckoutFacade(
            PedidoDAO pedidoDAO,
            InventarioDAO inventarioDAO,
            PuertoPago puertoPago,
            EjecutorTransaccion ejecutorTransaccion,
            PublicadorEventosPedido publicadorEventos) {
        this.pedidoDAO = Objects.requireNonNull(pedidoDAO, "pedidoDAO no puede ser null");
        this.inventarioDAO = Objects.requireNonNull(inventarioDAO, "inventarioDAO no puede ser null");
        this.puertoPago = Objects.requireNonNull(puertoPago, "puertoPago no puede ser null");
        this.ejecutorTransaccion = Objects.requireNonNull(
                ejecutorTransaccion, "ejecutorTransaccion no puede ser null");
        this.publicadorEventos = Objects.requireNonNull(
                publicadorEventos, "publicadorEventos no puede ser null");
    }

    public PedidoConfirmado confirmarCompra(Long usuarioId, String metodoPago) {
        return confirmarCompra(usuarioId, metodoPago, null, null, null);
    }

    public PedidoConfirmado confirmarCompra(
            Long usuarioId,
            String metodoPago,
            String claveConfirmacion,
            String destinatario,
            String direccionEnvio) {
        validarParametros(usuarioId, metodoPago);
        String metodo = metodoPago.trim();
        String clave = normalizar(claveConfirmacion);
        String destino = normalizar(destinatario);
        String direccion = normalizar(direccionEnvio);

        return ejecutorTransaccion.ejecutar("No se pudo confirmar la compra",
                conexion -> confirmarEnTransaccion(conexion, usuarioId, metodo, clave, destino, direccion));
    }

    private PedidoConfirmado confirmarEnTransaccion(
            Connection conexion, Long usuarioId, String metodoPago,
            String clave, String destinatario, String direccion) throws SQLException {
        // 1. Una compra a la vez por cliente: un reintento espera aquí y luego ve el pedido.
        pedidoDAO.bloquearClienteParaCompra(conexion, usuarioId);

        // 2. Idempotencia: la misma clave devuelve el pedido ya confirmado.
        if (clave != null) {
            Optional<PedidoConfirmado> existente =
                    pedidoDAO.buscarPorClaveConfirmacion(conexion, usuarioId, clave);
            if (existente.isPresent()) {
                return existente.get();
            }
            if (pedidoDAO.claveConfirmacionRegistrada(conexion, clave)) {
                throw new ClaveConfirmacionEnUsoException();
            }
        }

        // 3. Carrito y productos bloqueados (productos en orden ascendente de id).
        long carritoId = pedidoDAO.bloquearCarritoActivo(conexion, usuarioId);
        List<ProductoEnCompra> productos = pedidoDAO.leerYBloquearProductos(conexion, carritoId);
        validarProductos(productos);
        BigDecimal total = calcularTotal(productos);

        // 4. Pago simulado a través del Adapter; un rechazo revierte toda la transacción.
        ResultadoPago pago = puertoPago.procesar(total, metodoPago);
        if (pago == null || !pago.aprobado()) {
            throw new PagoRechazadoException(pago != null ? pago.mensaje() : "Pago rechazado");
        }

        // 5. Persistencia del pedido completo en la misma conexión.
        PedidoConfirmado pedido = pedidoDAO.registrarCompra(
                conexion, usuarioId, total, pago, productos, carritoId, clave, destinatario, direccion);
        descontarStock(conexion, pedido.idPedido(), usuarioId, productos);

        // 6. Observer: la alerta in-app entra en esta transacción; la auditoría y el
        //    correo simulado salen solo después del commit.
        publicadorEventos.publicar(conexion, new EventoPedido(
                pedido.idPedido(), usuarioId, null, ESTADO_INICIAL,
                OffsetDateTime.now(), MOTIVO_CONFIRMACION));
        return pedido;
    }

    /**
     * Descuenta lo vendido (solo si alcanza el stock y el producto sigue activo) y deja el
     * movimiento SALIDA en el kardex. Si algo cambió, StockInsuficienteException revierte la compra.
     */
    private void descontarStock(Connection conexion, long pedidoId, Long usuarioId,
            List<ProductoEnCompra> productos) throws SQLException {
        for (ProductoEnCompra producto : productos) {
            if (!inventarioDAO.descontarStock(conexion, producto.id(), producto.cantidad())) {
                throw new StockInsuficienteException(
                        "El stock de " + producto.nombre() + " cambió; actualiza el carrito");
            }
            inventarioDAO.registrarMovimiento(conexion, new RegistroMovimiento(
                    producto.id(), TipoMovimiento.SALIDA, -producto.cantidad(),
                    "Venta del pedido #" + pedidoId, usuarioId, pedidoId, null));
        }
    }

    private static void validarProductos(List<ProductoEnCompra> productos) {
        if (productos.isEmpty()) {
            throw new IllegalArgumentException("Tu carrito está vacío");
        }
        for (ProductoEnCompra producto : productos) {
            if (!producto.activo()) {
                throw new IllegalArgumentException(
                        "El producto " + producto.nombre() + " ya no está disponible");
            }
            if (producto.precio().signum() <= 0) {
                throw new IllegalArgumentException(
                        "El precio de " + producto.nombre() + " debe ser mayor que cero");
            }
            if (producto.cantidad() > producto.stock()) {
                throw new StockInsuficienteException(
                        "Stock insuficiente para " + producto.nombre()
                                + ". Disponible: " + producto.stock());
            }
        }
    }

    /** El total siempre lo calcula el servidor con los precios bloqueados en la transacción. */
    private static BigDecimal calcularTotal(List<ProductoEnCompra> productos) {
        return productos.stream()
                .map(ProductoEnCompra::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static void validarParametros(Long usuarioId, String metodoPago) {
        if (usuarioId == null) {
            throw new IllegalArgumentException("El identificador del usuario es obligatorio para confirmar la compra");
        }
        if (metodoPago == null || metodoPago.isBlank()) {
            throw new IllegalArgumentException("El método de pago es obligatorio");
        }
    }

    private static String normalizar(String valor) {
        return valor != null && !valor.isBlank() ? valor.trim() : null;
    }
}
