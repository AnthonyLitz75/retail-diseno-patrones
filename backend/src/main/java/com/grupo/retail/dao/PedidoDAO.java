package com.grupo.retail.dao;

import com.grupo.retail.model.DetallePedido;
import com.grupo.retail.model.EventoNotificacion;
import com.grupo.retail.model.EventoEstadoPedido;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.exception.PagoRechazadoException;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.patterns.factory.FabricaNotificador;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.function.Function;

@Repository
public class PedidoDAO {

    private final ProveedorConexiones proveedorConexiones;
    private final FabricaNotificador fabricaNotificador;

    public PedidoDAO(ProveedorConexiones proveedorConexiones) {
        this(proveedorConexiones, new com.grupo.retail.patterns.factory.FabricaNotificadorInApp());
    }

    @Autowired
    public PedidoDAO(ProveedorConexiones proveedorConexiones, FabricaNotificador fabricaNotificador) {
        this.proveedorConexiones = proveedorConexiones;
        this.fabricaNotificador = fabricaNotificador;
    }

    public List<PedidoVista> listarPorCliente(Long clienteId) {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en,
                       e.transportista, e.codigo_seguimiento, e.despachado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE p.usuario_id = ?
                ORDER BY p.creado_en DESC, p.id_pedido DESC
                """;
        return listarPedidos(sql, clienteId);
    }

    public Optional<PedidoVista> buscarPorIdYCliente(Long pedidoId, Long clienteId) {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en,
                       e.transportista, e.codigo_seguimiento, e.despachado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE p.id_pedido = ? AND p.usuario_id = ?
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            consulta.setLong(2, clienteId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    return Optional.empty();
                }
                return Optional.of(new PedidoVista(
                        resultado.getLong("id_pedido"),
                        resultado.getString("cliente_nombre"),
                        resultado.getString("cliente_correo"),
                        resultado.getString("estado"),
                        resultado.getBigDecimal("total"),
                        resultado.getObject("creado_en", OffsetDateTime.class),
                        mapearEnvio(resultado),
                        listarDetalles(conexion, pedidoId),
                        listarHistorial(conexion, pedidoId)));
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo consultar el pedido", error);
        }
    }

    public List<PedidoVista> listarPendientes() {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en,
                       e.transportista, e.codigo_seguimiento, e.despachado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE p.estado = 'PENDIENTE'
                ORDER BY p.creado_en, p.id_pedido
                """;
        return listarPedidos(sql, null);
    }

    public List<PedidoVista> listarOperativos() {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en,
                       e.transportista, e.codigo_seguimiento, e.despachado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE p.estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO')
                ORDER BY p.creado_en, p.id_pedido
                """;
        return listarPedidos(sql, null);
    }

    private List<PedidoVista> listarPedidos(String sql, Long clienteId) {
        List<PedidoVista> pedidos = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (clienteId != null) {
                consulta.setLong(1, clienteId);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    long pedidoId = resultado.getLong("id_pedido");
                    pedidos.add(new PedidoVista(
                            pedidoId,
                            resultado.getString("cliente_nombre"),
                            resultado.getString("cliente_correo"),
                            resultado.getString("estado"),
                            resultado.getBigDecimal("total"),
                            resultado.getObject("creado_en", OffsetDateTime.class),
                            mapearEnvio(resultado),
                            listarDetalles(conexion, pedidoId),
                            listarHistorial(conexion, pedidoId)));
                }
            }
            return pedidos;
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudieron consultar los pedidos", error);
        }
    }

    private EnvioPedido mapearEnvio(ResultSet resultado) throws SQLException {
        String transportista = resultado.getString("transportista");
        if (transportista == null) {
            return null;
        }
        return new EnvioPedido(
                transportista,
                resultado.getString("codigo_seguimiento"),
                resultado.getObject("despachado_en", OffsetDateTime.class));
    }

    private List<DetallePedido> listarDetalles(Connection conexion, long pedidoId)
            throws SQLException {
        String sql = """
                SELECT producto_id, nombre_producto, precio_unitario, cantidad, subtotal
                FROM pedido_detalle
                WHERE pedido_id = ?
                ORDER BY id_detalle
                """;
        List<DetallePedido> detalles = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    detalles.add(new DetallePedido(
                            resultado.getLong("producto_id"),
                            resultado.getString("nombre_producto"),
                            resultado.getBigDecimal("precio_unitario"),
                            resultado.getInt("cantidad"),
                            resultado.getBigDecimal("subtotal")));
                }
            }
        }
        return List.copyOf(detalles);
    }

    private List<EventoEstadoPedido> listarHistorial(Connection conexion, long pedidoId)
            throws SQLException {
        String sql = """
                SELECT h.estado, u.nombre AS responsable, h.comentario, h.fecha
                FROM pedido_historial_estado h
                JOIN usuario u ON u.id_usuario = h.responsable_id
                WHERE h.pedido_id = ?
                ORDER BY h.fecha, h.id_historial
                """;
        List<EventoEstadoPedido> historial = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    historial.add(new EventoEstadoPedido(
                            resultado.getString("estado"),
                            resultado.getString("responsable"),
                            resultado.getString("comentario"),
                            resultado.getObject("fecha", OffsetDateTime.class)));
                }
            }
        }
        return List.copyOf(historial);
    }

    public Optional<String> buscarEstado(Long pedidoId) {
        String sql = "SELECT estado FROM pedido WHERE id_pedido = ?";
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next()
                        ? Optional.of(resultado.getString("estado"))
                        : Optional.empty();
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo consultar el estado del pedido", error);
        }
    }

    public boolean cambiarEstado(
            Long pedidoId, String estadoEsperado, String nuevoEstado,
            Long responsableId, String comentario) {
        return cambiarEstado(pedidoId, estadoEsperado, nuevoEstado, responsableId, comentario, null);
    }

    public boolean cambiarEstado(
            Long pedidoId, String estadoEsperado, String nuevoEstado,
            Long responsableId, String comentario, EnvioPedido envio) {
        String actualizarSql = """
                UPDATE pedido
                SET estado = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_pedido = ? AND estado = ?
                """;
        String historialSql = """
                INSERT INTO pedido_historial_estado (pedido_id, estado, responsable_id, comentario)
                VALUES (?, ?, ?, ?)
                """;
        String envioSql = """
                INSERT INTO envio (pedido_id, transportista, codigo_seguimiento)
                VALUES (?, ?, ?)
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                int filas;
                try (PreparedStatement actualizacion = conexion.prepareStatement(actualizarSql)) {
                    actualizacion.setString(1, nuevoEstado);
                    actualizacion.setLong(2, pedidoId);
                    actualizacion.setString(3, estadoEsperado);
                    filas = actualizacion.executeUpdate();
                }
                if (filas == 0) {
                    conexion.rollback();
                    return false;
                }
                if (envio != null) {
                    try (PreparedStatement insertarEnvio = conexion.prepareStatement(envioSql)) {
                        insertarEnvio.setLong(1, pedidoId);
                        insertarEnvio.setString(2, envio.transportista());
                        insertarEnvio.setString(3, envio.codigoSeguimiento());
                        insertarEnvio.executeUpdate();
                    }
                }
                Long clienteId = buscarClienteEnTransaccion(conexion, pedidoId);
                try (PreparedStatement historial = conexion.prepareStatement(historialSql)) {
                    historial.setLong(1, pedidoId);
                    historial.setString(2, nuevoEstado);
                    historial.setLong(3, responsableId);
                    historial.setString(4, comentario);
                    historial.executeUpdate();
                }
                notificarCambio(conexion, clienteId, pedidoId, nuevoEstado, comentario);
                conexion.commit();
                return true;
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            if ("23505".equals(error.getSQLState())) {
                throw new CodigoSeguimientoDuplicadoException(error);
            }
            throw new IllegalStateException("No se pudo actualizar el estado del pedido", error);
        }
    }

    public void cancelarPedido(
            Long pedidoId, Long clienteId, Long responsableId, String nuevoEstado) {
        String buscarPedidoSql = clienteId == null
                ? "SELECT estado FROM pedido WHERE id_pedido = ? FOR UPDATE"
                : "SELECT estado FROM pedido WHERE id_pedido = ? AND usuario_id = ? FOR UPDATE";
        String detallesSql = """
                SELECT pd.producto_id, pd.cantidad
                FROM pedido_detalle pd
                JOIN producto p ON p.id = pd.producto_id
                WHERE pd.pedido_id = ?
                ORDER BY pd.producto_id
                FOR UPDATE OF p
                """;
        String reponerSql = "UPDATE producto SET stock = stock + ? WHERE id = ?";
        String movimientoSql = """
                INSERT INTO movimiento_inventario
                    (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id)
                VALUES (?, 'CANCELACION', ?, ?, ?)
                """;
        String pagoSql = """
                UPDATE pago
                SET estado = 'REVERSADO'
                WHERE pedido_id = ? AND estado = 'APROBADO'
                """;
        String pedidoSql = clienteId == null
                ? "UPDATE pedido SET estado = ?, actualizado_en = CURRENT_TIMESTAMP "
                        + "WHERE id_pedido = ? AND estado = 'PENDIENTE'"
                : "UPDATE pedido SET estado = ?, actualizado_en = CURRENT_TIMESTAMP "
                        + "WHERE id_pedido = ? AND usuario_id = ? AND estado = 'PENDIENTE'";
        String historialSql = """
                INSERT INTO pedido_historial_estado
                    (pedido_id, estado, responsable_id, comentario)
                VALUES (?, ?, ?, 'Pedido cancelado; stock y pago simulado reversados')
                """;

        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                String estadoActual;
                try (PreparedStatement consulta = conexion.prepareStatement(buscarPedidoSql)) {
                    consulta.setLong(1, pedidoId);
                    if (clienteId != null) {
                        consulta.setLong(2, clienteId);
                    }
                    try (ResultSet resultado = consulta.executeQuery()) {
                        if (!resultado.next()) {
                            throw new NoSuchElementException("No existe el pedido solicitado");
                        }
                        estadoActual = resultado.getString("estado");
                    }
                }

                // A repeated PUT is safe: the first request already performed all side effects.
                if ("CANCELADO".equals(estadoActual)) {
                    conexion.commit();
                    return;
                }
                if (!"PENDIENTE".equals(estadoActual) || !"CANCELADO".equals(nuevoEstado)) {
                    throw new IllegalStateException("Solo se puede cancelar un pedido pendiente");
                }

                Long destinatarioId = buscarClienteEnTransaccion(conexion, pedidoId);
                List<LineaParaReponer> lineas = new ArrayList<>();
                try (PreparedStatement consulta = conexion.prepareStatement(detallesSql)) {
                    consulta.setLong(1, pedidoId);
                    try (ResultSet resultado = consulta.executeQuery()) {
                        while (resultado.next()) {
                            lineas.add(new LineaParaReponer(
                                    resultado.getLong("producto_id"), resultado.getInt("cantidad")));
                        }
                    }
                }
                if (lineas.isEmpty()) {
                    throw new IllegalStateException("El pedido no tiene productos para reponer");
                }

                for (LineaParaReponer linea : lineas) {
                    try (PreparedStatement reponer = conexion.prepareStatement(reponerSql)) {
                        reponer.setInt(1, linea.cantidad());
                        reponer.setLong(2, linea.productoId());
                        if (reponer.executeUpdate() != 1) {
                            throw new IllegalStateException("No se pudo reponer un producto del pedido");
                        }
                    }
                    try (PreparedStatement movimiento = conexion.prepareStatement(movimientoSql)) {
                        movimiento.setLong(1, linea.productoId());
                        movimiento.setInt(2, linea.cantidad());
                        movimiento.setString(3, "Reposición por cancelación del pedido #" + pedidoId);
                        movimiento.setLong(4, responsableId);
                        movimiento.executeUpdate();
                    }
                }

                int pagosReversados;
                try (PreparedStatement pago = conexion.prepareStatement(pagoSql)) {
                    pago.setLong(1, pedidoId);
                    pagosReversados = pago.executeUpdate();
                }
                if (pagosReversados != 1) {
                    throw new IllegalStateException("No se encontró un pago aprobado para reversar");
                }

                try (PreparedStatement actualizacion = conexion.prepareStatement(pedidoSql)) {
                    actualizacion.setString(1, nuevoEstado);
                    actualizacion.setLong(2, pedidoId);
                    if (clienteId != null) {
                        actualizacion.setLong(3, clienteId);
                    }
                    if (actualizacion.executeUpdate() != 1) {
                        throw new IllegalStateException("El pedido dejó de estar pendiente");
                    }
                }
                try (PreparedStatement historial = conexion.prepareStatement(historialSql)) {
                    historial.setLong(1, pedidoId);
                    historial.setString(2, nuevoEstado);
                    historial.setLong(3, responsableId);
                    historial.executeUpdate();
                }
                notificarCambio(conexion, destinatarioId, pedidoId, nuevoEstado,
                        "Pedido cancelado; stock y pago simulado reversados");
                conexion.commit();
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo cancelar el pedido", error);
        }
    }

    private Long buscarClienteEnTransaccion(Connection conexion, long pedidoId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "SELECT usuario_id FROM pedido WHERE id_pedido = ?")) {
            consulta.setLong(1, pedidoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next())
                    throw new NoSuchElementException("No existe el pedido solicitado");
                return resultado.getLong("usuario_id");
            }
        }
    }

    private void notificarCambio(Connection conexion, Long clienteId, long pedidoId,
            String estado, String mensaje) throws SQLException {
        fabricaNotificador.crearNotificador().notificar(conexion,
                new EventoNotificacion(clienteId, pedidoId, estado, mensaje));
    }

    private record LineaParaReponer(long productoId, int cantidad) {
    }

    public Optional<PedidoConfirmado> buscarPorClaveConfirmacion(
            Long usuarioId, String claveConfirmacion) {
        if (claveConfirmacion == null || claveConfirmacion.isBlank() || usuarioId == null) {
            return Optional.empty();
        }
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            return buscarPorClaveConfirmacion(conexion, usuarioId, claveConfirmacion.trim());
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo verificar la clave de confirmación", error);
        }
    }

    public PedidoConfirmado confirmarCompra(
            Long usuarioId, Function<BigDecimal, ResultadoPago> procesarPago) {
        return confirmarCompra(usuarioId, procesarPago, null, null, null);
    }

    public PedidoConfirmado confirmarCompra(
            Long usuarioId,
            Function<BigDecimal, ResultadoPago> procesarPago,
            String claveConfirmacion,
            String destinatario,
            String direccionEnvio) {
        String claveLimpia = claveConfirmacion != null && !claveConfirmacion.isBlank()
                ? claveConfirmacion.trim()
                : null;
        String destLimpio = destinatario != null && !destinatario.isBlank()
                ? destinatario.trim()
                : null;
        String dirLimpia = direccionEnvio != null && !direccionEnvio.isBlank()
                ? direccionEnvio.trim()
                : null;

        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                if (claveLimpia != null) {
                    Optional<PedidoConfirmado> existente = buscarPorClaveConfirmacion(
                            conexion, usuarioId, claveLimpia);
                    if (existente.isPresent()) {
                        conexion.commit();
                        return existente.get();
                    }
                }

                long carritoId = bloquearCarritoActivo(conexion, usuarioId);
                List<ProductoDelCarrito> productos = leerYBloquearProductos(conexion, carritoId);
                validarProductosParaCompra(productos);
                BigDecimal total = calcularTotal(productos);

                ResultadoPago resultadoPago = procesarPago.apply(total);
                validarResultadoPago(resultadoPago);

                PedidoConfirmado confirmado = registrarCompraEnTransaccion(
                        conexion, usuarioId, total, resultadoPago, productos,
                        carritoId, claveLimpia, destLimpio, dirLimpia);

                conexion.commit();
                return confirmado;
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                if (claveLimpia != null) {
                    try (Connection connCheck = proveedorConexiones.obtenerConexion()) {
                        Optional<PedidoConfirmado> creado = buscarPorClaveConfirmacion(
                                connCheck, usuarioId, claveLimpia);
                        if (creado.isPresent()) {
                            return creado.get();
                        }
                    } catch (SQLException ignored) {
                    }
                }
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo confirmar la compra", error);
        }
    }

    private void validarProductosParaCompra(List<ProductoDelCarrito> productos) {
        if (productos.isEmpty()) {
            throw new IllegalArgumentException("Tu carrito está vacío");
        }
        for (ProductoDelCarrito producto : productos) {
            if (!producto.activo()) {
                throw new IllegalArgumentException(
                        "El producto " + producto.nombre() + " ya no está disponible");
            }
            if (producto.precio().signum() <= 0) {
                throw new IllegalArgumentException(
                        "El precio de " + producto.nombre() + " debe ser mayor que cero");
            }
            if (producto.cantidad() > producto.stock()) {
                throw new IllegalArgumentException(
                        "Stock insuficiente para " + producto.nombre()
                                + ". Disponible: " + producto.stock());
            }
        }
    }

    private BigDecimal calcularTotal(List<ProductoDelCarrito> productos) {
        BigDecimal total = BigDecimal.ZERO;
        for (ProductoDelCarrito producto : productos) {
            total = total.add(
                    producto.precio().multiply(BigDecimal.valueOf(producto.cantidad())));
        }
        return total;
    }

    private void validarResultadoPago(ResultadoPago resultadoPago) {
        if (resultadoPago == null || !resultadoPago.aprobado()) {
            String mensaje = resultadoPago != null ? resultadoPago.mensaje() : "Pago rechazado";
            throw new PagoRechazadoException(mensaje);
        }
    }

    private PedidoConfirmado registrarCompraEnTransaccion(
            Connection conexion, Long usuarioId, BigDecimal total, ResultadoPago resultadoPago,
            List<ProductoDelCarrito> productos, long carritoId,
            String claveConfirmacion, String destinatario, String direccionEnvio) throws SQLException {
        PedidoCreado pedido = insertarPedido(
                conexion, usuarioId, total, claveConfirmacion, destinatario, direccionEnvio);
        List<DetallePedido> detalles = new ArrayList<>();

        for (ProductoDelCarrito producto : productos) {
            insertarDetalle(conexion, pedido.id(), producto);
            descontarStock(conexion, pedido.id(), usuarioId, producto);
            BigDecimal subtotal = producto.precio()
                    .multiply(BigDecimal.valueOf(producto.cantidad()));
            detalles.add(new DetallePedido(
                    producto.id(), producto.nombre(), producto.precio(),
                    producto.cantidad(), subtotal));
        }

        insertarPago(conexion, pedido.id(), total, resultadoPago);
        insertarHistorialInicial(conexion, pedido.id(), usuarioId);
        vaciarYConvertirCarrito(conexion, carritoId);

        return new PedidoConfirmado(
                pedido.id(), "PENDIENTE", total, pedido.creadoEn(),
                resultadoPago.metodo(), resultadoPago.estado(),
                resultadoPago.referencia(), List.copyOf(detalles),
                claveConfirmacion, destinatario, direccionEnvio);
    }

    private Optional<PedidoConfirmado> buscarPorClaveConfirmacion(
            Connection conexion, Long usuarioId, String claveConfirmacion) throws SQLException {
        String sql = """
                SELECT p.id_pedido, p.estado, p.total, p.creado_en, p.destinatario, p.direccion_envio,
                       pg.metodo, pg.estado AS estado_pago, pg.referencia
                FROM pedido p
                LEFT JOIN pago pg ON pg.pedido_id = p.id_pedido
                WHERE p.usuario_id = ? AND p.clave_confirmacion = ?
                """;
        Long pedidoId;
        String estado;
        BigDecimal total;
        OffsetDateTime creadoEn;
        String metodo;
        String estadoPago;
        String referencia;
        String destinatario;
        String direccionEnvio;

        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            consulta.setString(2, claveConfirmacion);
            try (ResultSet rs = consulta.executeQuery()) {
                if (!rs.next()) {
                    return Optional.empty();
                }
                pedidoId = rs.getLong("id_pedido");
                estado = rs.getString("estado");
                total = rs.getBigDecimal("total");
                creadoEn = rs.getObject("creado_en", OffsetDateTime.class);
                metodo = rs.getString("metodo");
                estadoPago = rs.getString("estado_pago");
                referencia = rs.getString("referencia");
                destinatario = rs.getString("destinatario");
                direccionEnvio = rs.getString("direccion_envio");
            }
        }

        String detallesSql = """
                SELECT producto_id, nombre_producto, precio_unitario, cantidad, subtotal
                FROM pedido_detalle
                WHERE pedido_id = ?
                ORDER BY producto_id
                """;
        List<DetallePedido> detalles = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(detallesSql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet rs = consulta.executeQuery()) {
                while (rs.next()) {
                    detalles.add(new DetallePedido(
                            rs.getLong("producto_id"),
                            rs.getString("nombre_producto"),
                            rs.getBigDecimal("precio_unitario"),
                            rs.getInt("cantidad"),
                            rs.getBigDecimal("subtotal")));
                }
            }
        }

        return Optional.of(new PedidoConfirmado(
                pedidoId, estado, total, creadoEn,
                metodo, estadoPago, referencia, List.copyOf(detalles),
                claveConfirmacion, destinatario, direccionEnvio));
    }

    private long bloquearCarritoActivo(Connection conexion, Long usuarioId) throws SQLException {
        String sql = """
                SELECT id_carrito
                FROM carrito
                WHERE usuario_id = ? AND estado = 'ACTIVO'
                FOR UPDATE
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException("No tienes un carrito activo");
                }
                return resultado.getLong("id_carrito");
            }
        }
    }

    private List<ProductoDelCarrito> leerYBloquearProductos(
            Connection conexion, long carritoId) throws SQLException {
        String sql = """
                SELECT p.id, p.nombre, p.precio, p.stock, p.activo, cd.cantidad
                FROM carrito_detalle cd
                JOIN producto p ON p.id = cd.producto_id
                WHERE cd.carrito_id = ?
                ORDER BY p.id
                FOR UPDATE OF p
                """;
        List<ProductoDelCarrito> productos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    productos.add(new ProductoDelCarrito(
                            resultado.getLong("id"),
                            resultado.getString("nombre"),
                            resultado.getBigDecimal("precio"),
                            resultado.getInt("stock"),
                            resultado.getBoolean("activo"),
                            resultado.getInt("cantidad")));
                }
            }
        }
        return productos;
    }

    private PedidoCreado insertarPedido(
            Connection conexion, Long usuarioId, BigDecimal total,
            String claveConfirmacion, String destinatario, String direccionEnvio) throws SQLException {
        String sql = """
                INSERT INTO pedido (usuario_id, estado, total, clave_confirmacion, destinatario, direccion_envio)
                VALUES (?, 'PENDIENTE', ?, ?, ?, ?)
                RETURNING id_pedido, creado_en
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            consulta.setBigDecimal(2, total);
            consulta.setString(3, claveConfirmacion);
            consulta.setString(4, destinatario);
            consulta.setString(5, direccionEnvio);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("PostgreSQL no devolvió el pedido creado");
                }
                return new PedidoCreado(
                        resultado.getLong("id_pedido"),
                        resultado.getObject("creado_en", OffsetDateTime.class));
            }
        }
    }

    private void insertarDetalle(
            Connection conexion, long pedidoId, ProductoDelCarrito producto) throws SQLException {
        String sql = """
                INSERT INTO pedido_detalle
                    (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad)
                VALUES (?, ?, ?, ?, ?)
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            consulta.setLong(2, producto.id());
            consulta.setString(3, producto.nombre());
            consulta.setBigDecimal(4, producto.precio());
            consulta.setInt(5, producto.cantidad());
            consulta.executeUpdate();
        }
    }

    private void descontarStock(
            Connection conexion, long pedidoId, Long usuarioId,
            ProductoDelCarrito producto) throws SQLException {
        String sql = """
                UPDATE producto
                SET stock = stock - ?
                WHERE id = ? AND activo = TRUE AND stock >= ?
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setInt(1, producto.cantidad());
            consulta.setLong(2, producto.id());
            consulta.setInt(3, producto.cantidad());
            if (consulta.executeUpdate() == 0) {
                throw new IllegalArgumentException(
                        "El stock de " + producto.nombre() + " cambió; actualiza el carrito");
            }
        }

        String movimiento = """
                INSERT INTO movimiento_inventario
                    (producto_id, tipo, cantidad_firmada, motivo, usuario_responsable_id)
                VALUES (?, 'SALIDA', ?, ?, ?)
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(movimiento)) {
            consulta.setLong(1, producto.id());
            consulta.setInt(2, -producto.cantidad());
            consulta.setString(3, "Venta del pedido #" + pedidoId);
            consulta.setLong(4, usuarioId);
            consulta.executeUpdate();
        }
    }

    private void insertarPago(
            Connection conexion, long pedidoId, BigDecimal total, ResultadoPago pago)
            throws SQLException {
        String sql = """
                INSERT INTO pago (pedido_id, metodo, estado, monto, referencia)
                VALUES (?, ?, ?, ?, ?)
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            consulta.setString(2, pago.metodo());
            consulta.setString(3, pago.estado());
            consulta.setBigDecimal(4, total);
            consulta.setString(5, pago.referencia());
            consulta.executeUpdate();
        }
    }

    private void insertarHistorialInicial(
            Connection conexion, long pedidoId, Long usuarioId) throws SQLException {
        String sql = """
                INSERT INTO pedido_historial_estado
                    (pedido_id, estado, responsable_id, comentario)
                VALUES (?, 'PENDIENTE', ?, 'Pedido creado y pago simulado aprobado')
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            consulta.setLong(2, usuarioId);
            consulta.executeUpdate();
        }
    }

    private void vaciarYConvertirCarrito(Connection conexion, long carritoId)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "DELETE FROM carrito_detalle WHERE carrito_id = ?")) {
            consulta.setLong(1, carritoId);
            consulta.executeUpdate();
        }

        try (PreparedStatement consulta = conexion.prepareStatement("""
                UPDATE carrito
                SET estado = 'CONVERTIDO', actualizado_en = CURRENT_TIMESTAMP
                WHERE id_carrito = ? AND estado = 'ACTIVO'
                """)) {
            consulta.setLong(1, carritoId);
            if (consulta.executeUpdate() == 0) {
                throw new IllegalArgumentException("El carrito ya fue procesado");
            }
        }
    }

    private record ProductoDelCarrito(
            long id, String nombre, BigDecimal precio, int stock, boolean activo, int cantidad) {
    }

    private record PedidoCreado(long id, OffsetDateTime creadoEn) {
    }
}
