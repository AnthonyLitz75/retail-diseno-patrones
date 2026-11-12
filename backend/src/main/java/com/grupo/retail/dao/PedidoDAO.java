package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.model.DetallePedido;
import com.grupo.retail.model.EventoEstadoPedido;
import com.grupo.retail.model.EnvioPedido;
import com.grupo.retail.model.LineaReposicion;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.model.PedidoBloqueado;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.model.ProductoEnCompra;
import com.grupo.retail.model.ResumenPago;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.exception.ClaveConfirmacionEnUsoException;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;

@Repository
public class PedidoDAO {

    /** SQLState de PostgreSQL para unique_violation. */
    private static final String VIOLACION_UNICA = "23505";
    private static final String INDICE_CLAVE_CONFIRMACION = "uq_pedido_clave_confirmacion";

    private final ProveedorConexiones proveedorConexiones;

    public PedidoDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public List<PedidoVista> listarPorCliente(Long clienteId) {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en,
                       e.transportista, e.codigo_seguimiento, e.despachado_en, e.entregado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE p.usuario_id = ?
                ORDER BY p.creado_en DESC, p.id_pedido DESC
                """;
        return listarPedidos(sql, clienteId);
    }

    public Optional<PedidoVista> buscarPorIdYCliente(Long pedidoId, Long clienteId) {
        return buscarVista(pedidoId, clienteId);
    }

    /** Vista del pedido sin filtro de propietario, solo para personal autorizado (RF27). */
    public Optional<PedidoVista> buscarPorId(long pedidoId) {
        return buscarVista(pedidoId, null);
    }

    private static final String VISTA_PEDIDO_SQL = """
            SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                   p.estado, p.total, p.creado_en,
                   e.transportista, e.codigo_seguimiento, e.despachado_en, e.entregado_en
            FROM pedido p
            JOIN usuario u ON u.id_usuario = p.usuario_id
            LEFT JOIN envio e ON e.pedido_id = p.id_pedido
            WHERE p.id_pedido = ?""";

    /** Variante con el filtro de propietario: el cliente solo ve sus pedidos. */
    private static final String VISTA_PEDIDO_PROPIO_SQL = VISTA_PEDIDO_SQL + " AND p.usuario_id = ?";

    private Optional<PedidoVista> buscarVista(long pedidoId, Long clienteId) {
        String sql = clienteId == null ? VISTA_PEDIDO_SQL : VISTA_PEDIDO_PROPIO_SQL;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            if (clienteId != null) {
                consulta.setLong(2, clienteId);
            }
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
            throw new ErrorAccesoDatosException("No se pudo consultar el pedido", error);
        }
    }

    /** Resumen del cobro del pedido, sin la referencia del proveedor (RF27). */
    public Optional<ResumenPago> buscarResumenPago(long pedidoId) {
        String sql = """
                SELECT estado, monto, monto_reembolsado, creado_en
                FROM pago
                WHERE pedido_id = ?
                ORDER BY (estado = 'APROBADO') DESC, creado_en DESC
                LIMIT 1
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet fila = consulta.executeQuery()) {
                if (!fila.next()) {
                    return Optional.empty();
                }
                return Optional.of(new ResumenPago(fila.getString("estado"), fila.getBigDecimal("monto"),
                        fila.getBigDecimal("monto_reembolsado"), fila.getObject("creado_en", OffsetDateTime.class)));
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo consultar el pago del pedido", error);
        }
    }

    public List<PedidoVista> listarPendientes() {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en,
                       e.transportista, e.codigo_seguimiento, e.despachado_en, e.entregado_en
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
                       e.transportista, e.codigo_seguimiento, e.despachado_en, e.entregado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                LEFT JOIN envio e ON e.pedido_id = p.id_pedido
                WHERE p.estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO')
                ORDER BY p.creado_en, p.id_pedido
                """;
        return listarPedidos(sql, null);
    }

    /**
     * Lista pedidos con sus productos e historial usando 3 consultas en total
     * (cabeceras, detalles de todos los pedidos e historial de todos los pedidos),
     * en lugar de 1 + 2 consultas por cada pedido.
     */
    private List<PedidoVista> listarPedidos(String sql, Long clienteId) {
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            if (clienteId != null) {
                consulta.setLong(1, clienteId);
            }
            List<CabeceraPedido> cabeceras = new ArrayList<>();
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    cabeceras.add(new CabeceraPedido(
                            resultado.getLong("id_pedido"),
                            resultado.getString("cliente_nombre"),
                            resultado.getString("cliente_correo"),
                            resultado.getString("estado"),
                            resultado.getBigDecimal("total"),
                            resultado.getObject("creado_en", OffsetDateTime.class),
                            mapearEnvio(resultado)));
                }
            }
            if (cabeceras.isEmpty()) {
                return new ArrayList<>();
            }

            Long[] pedidoIds = cabeceras.stream().map(CabeceraPedido::id).toArray(Long[]::new);
            Map<Long, List<DetallePedido>> detalles = listarDetallesPorPedidos(conexion, pedidoIds);
            Map<Long, List<EventoEstadoPedido>> historiales = listarHistorialPorPedidos(conexion, pedidoIds);

            List<PedidoVista> pedidos = new ArrayList<>(cabeceras.size());
            for (CabeceraPedido cabecera : cabeceras) {
                pedidos.add(new PedidoVista(
                        cabecera.id(),
                        cabecera.clienteNombre(),
                        cabecera.clienteCorreo(),
                        cabecera.estado(),
                        cabecera.total(),
                        cabecera.creadoEn(),
                        cabecera.envio(),
                        List.copyOf(detalles.getOrDefault(cabecera.id(), List.of())),
                        List.copyOf(historiales.getOrDefault(cabecera.id(), List.of()))));
            }
            return pedidos;
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar los pedidos", error);
        }
    }

    private Map<Long, List<DetallePedido>> listarDetallesPorPedidos(
            Connection conexion, Long[] pedidoIds) throws SQLException {
        String sql = """
                SELECT id_detalle, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal
                FROM pedido_detalle
                WHERE pedido_id = ANY (?)
                ORDER BY pedido_id, id_detalle
                """;
        Map<Long, List<DetallePedido>> detallesPorPedido = new HashMap<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setArray(1, conexion.createArrayOf("bigint", pedidoIds));
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    detallesPorPedido
                            .computeIfAbsent(resultado.getLong("pedido_id"), id -> new ArrayList<>())
                            .add(new DetallePedido(
                                    resultado.getLong("producto_id"),
                                    resultado.getString("nombre_producto"),
                                    resultado.getBigDecimal("precio_unitario"),
                                    resultado.getInt("cantidad"),
                                    resultado.getBigDecimal("subtotal"),
                                    resultado.getLong("id_detalle")));
                }
            }
        }
        return detallesPorPedido;
    }

    private Map<Long, List<EventoEstadoPedido>> listarHistorialPorPedidos(
            Connection conexion, Long[] pedidoIds) throws SQLException {
        String sql = """
                SELECT h.pedido_id, h.estado, u.nombre AS responsable, h.comentario, h.fecha
                FROM pedido_historial_estado h
                JOIN usuario u ON u.id_usuario = h.responsable_id
                WHERE h.pedido_id = ANY (?)
                ORDER BY h.pedido_id, h.fecha, h.id_historial
                """;
        Map<Long, List<EventoEstadoPedido>> historialPorPedido = new HashMap<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setArray(1, conexion.createArrayOf("bigint", pedidoIds));
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    historialPorPedido
                            .computeIfAbsent(resultado.getLong("pedido_id"), id -> new ArrayList<>())
                            .add(new EventoEstadoPedido(
                                    resultado.getString("estado"),
                                    resultado.getString("responsable"),
                                    resultado.getString("comentario"),
                                    resultado.getObject("fecha", OffsetDateTime.class)));
                }
            }
        }
        return historialPorPedido;
    }

    private EnvioPedido mapearEnvio(ResultSet resultado) throws SQLException {
        String transportista = resultado.getString("transportista");
        if (transportista == null) {
            return null;
        }
        return new EnvioPedido(
                transportista,
                resultado.getString("codigo_seguimiento"),
                resultado.getObject("despachado_en", OffsetDateTime.class),
                resultado.getObject("entregado_en", OffsetDateTime.class));
    }

    private List<DetallePedido> listarDetalles(Connection conexion, long pedidoId)
            throws SQLException {
        String sql = """
                SELECT id_detalle, producto_id, nombre_producto, precio_unitario, cantidad, subtotal
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
                            resultado.getBigDecimal("subtotal"),
                            resultado.getLong("id_detalle")));
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

    /**
     * Registra una transición de almacén ya autorizada por el patrón State sobre un pedido
     * que el servicio bloqueó con {@link #bloquearEstadoPedido}: cambia el estado, guarda
     * el envío al despachar o la fecha de entrega y deja historial. Los avisos los emite el
     * servicio (Observer). Usa la conexión de la transacción y nunca la confirma ni la cierra.
     */
    public void registrarTransicion(
            Connection conexion, long pedidoId, String nuevoEstado,
            long responsableId, String comentario, EnvioPedido envio) throws SQLException {
        String actualizarSql = """
                UPDATE pedido
                SET estado = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_pedido = ?
                """;
        String envioSql = """
                INSERT INTO envio (pedido_id, transportista, codigo_seguimiento)
                VALUES (?, ?, ?)
                """;
        String entregaSql = """
                UPDATE envio
                SET entregado_en = CURRENT_TIMESTAMP
                WHERE pedido_id = ? AND entregado_en IS NULL
                """;

        try (PreparedStatement actualizacion = conexion.prepareStatement(actualizarSql)) {
            actualizacion.setString(1, nuevoEstado);
            actualizacion.setLong(2, pedidoId);
            if (actualizacion.executeUpdate() != 1) {
                throw new NoSuchElementException("No existe el pedido solicitado");
            }
        }
        if (envio != null) {
            try (PreparedStatement insertarEnvio = conexion.prepareStatement(envioSql)) {
                insertarEnvio.setLong(1, pedidoId);
                insertarEnvio.setString(2, envio.transportista());
                insertarEnvio.setString(3, envio.codigoSeguimiento());
                insertarEnvio.executeUpdate();
            } catch (SQLException error) {
                if (VIOLACION_UNICA.equals(error.getSQLState())) {
                    throw new CodigoSeguimientoDuplicadoException(error);
                }
                throw error;
            }
        }
        if ("ENTREGADO".equals(nuevoEstado)) {
            try (PreparedStatement registrarEntrega = conexion.prepareStatement(entregaSql)) {
                registrarEntrega.setLong(1, pedidoId);
                registrarEntrega.executeUpdate();
            }
        }
        registrarHistorial(conexion, pedidoId, nuevoEstado, responsableId, comentario);
    }

    private static final String INSERTAR_HISTORIAL_SQL = """
            INSERT INTO pedido_historial_estado (pedido_id, estado, responsable_id, comentario)
            VALUES (?, ?, ?, ?)
            """;

    /** Deja una fila en el historial de estados del pedido. */
    public void registrarHistorial(Connection conexion, long pedidoId, String estado,
            Long responsableId, String comentario) throws SQLException {
        try (PreparedStatement historial = conexion.prepareStatement(INSERTAR_HISTORIAL_SQL)) {
            historial.setLong(1, pedidoId);
            historial.setString(2, estado);
            historial.setObject(3, responsableId, java.sql.Types.BIGINT);
            historial.setString(4, comentario);
            historial.executeUpdate();
        }
    }

    // ---------------------------------------------------------------------------------
    // Pasos SQL de la cancelación. PedidoService abre la transacción con
    // EjecutorTransaccion, decide la transición con el patrón State y llama a estos
    // métodos con la misma conexión, que nunca cierran (spec 004, T012).
    // ---------------------------------------------------------------------------------

    /**
     * Bloquea el pedido (FOR UPDATE) y devuelve su estado actual y su cliente. Con
     * {@code clienteId} solo encuentra pedidos de ese cliente: un pedido ajeno se comporta
     * como inexistente.
     */
    public Optional<PedidoBloqueado> bloquearEstadoPedido(
            Connection conexion, long pedidoId, Long clienteId) throws SQLException {
        String sql = clienteId == null
                ? "SELECT estado, usuario_id FROM pedido WHERE id_pedido = ? FOR UPDATE"
                : "SELECT estado, usuario_id FROM pedido WHERE id_pedido = ? AND usuario_id = ? FOR UPDATE";
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, pedidoId);
            if (clienteId != null) {
                consulta.setLong(2, clienteId);
            }
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next()
                        ? Optional.of(new PedidoBloqueado(
                                resultado.getString("estado"), resultado.getLong("usuario_id")))
                        : Optional.empty();
            }
        }
    }

    /**
     * Aplica los efectos de cancelar un pedido ya bloqueado y validado: repone stock con
     * movimientos CANCELACION (productos en orden ascendente), reversa el pago de prueba,
     * cambia el estado y deja historial. Los avisos los emite el servicio (Observer).
     */
    private static final String LINEAS_PEDIDO_BLOQUEANDO_PRODUCTOS_SQL = """
            SELECT pd.producto_id, pd.cantidad
            FROM pedido_detalle pd
            JOIN producto p ON p.id = pd.producto_id
            WHERE pd.pedido_id = ?
            ORDER BY pd.producto_id
            FOR UPDATE OF p
            """;
    private static final String MARCAR_CANCELADO_SQL = """
            UPDATE pedido SET estado = ?, actualizado_en = CURRENT_TIMESTAMP
            WHERE id_pedido = ? AND estado = 'PENDIENTE'
            """;

    /** Líneas del pedido con sus productos bloqueados en orden ascendente de id. */
    public List<LineaReposicion> bloquearLineasPedido(Connection conexion, long pedidoId) throws SQLException {
        List<LineaReposicion> lineas = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(LINEAS_PEDIDO_BLOQUEANDO_PRODUCTOS_SQL)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    lineas.add(new LineaReposicion(resultado.getLong("producto_id"), resultado.getInt("cantidad")));
                }
            }
        }
        return lineas;
    }

    /** Pasa el pedido a cancelado solo si sigue PENDIENTE; {@code false} si ya no lo estaba. */
    public boolean marcarCancelado(Connection conexion, long pedidoId, String estadoCancelado) throws SQLException {
        try (PreparedStatement actualizacion = conexion.prepareStatement(MARCAR_CANCELADO_SQL)) {
            actualizacion.setString(1, estadoCancelado);
            actualizacion.setLong(2, pedidoId);
            return actualizacion.executeUpdate() == 1;
        }
    }

    private record CabeceraPedido(
            long id, String clienteNombre, String clienteCorreo, String estado,
            BigDecimal total, OffsetDateTime creadoEn, EnvioPedido envio) {
    }

    // ---------------------------------------------------------------------------------
    // Pasos SQL de la confirmación de compra. Todos reciben la conexión de la transacción
    // que abre CheckoutFacade mediante EjecutorTransaccion y nunca la cierran (spec 004).
    // ---------------------------------------------------------------------------------

    /**
     * Serializa las confirmaciones de un mismo cliente: mientras una compra está en curso,
     * otra del mismo cliente espera aquí y después ve el pedido ya confirmado. Así la
     * idempotencia por clave no necesita una segunda conexión. FOR NO KEY UPDATE no choca
     * con las claves foráneas que otras tablas toman sobre el usuario.
     */
    public void bloquearClienteParaCompra(Connection conexion, long usuarioId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "SELECT id_usuario FROM usuario WHERE id_usuario = ? FOR NO KEY UPDATE")) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new NoSuchElementException("No existe el cliente de la compra");
                }
            }
        }
    }

    /** Indica si la clave ya pertenece a algún pedido, de cualquier cliente. */
    public boolean claveConfirmacionRegistrada(Connection conexion, String claveConfirmacion)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(
                "SELECT 1 FROM pedido WHERE clave_confirmacion = ?")) {
            consulta.setString(1, claveConfirmacion);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next();
            }
        }
    }

    public PedidoConfirmado registrarCompra(
            Connection conexion, Long usuarioId, BigDecimal total, ResultadoPago resultadoPago,
            List<ProductoEnCompra> productos, long carritoId,
            String claveConfirmacion, String destinatario, String direccionEnvio) throws SQLException {
        PedidoCreado pedido = insertarPedido(
                conexion, usuarioId, total, claveConfirmacion, destinatario, direccionEnvio);
        List<DetallePedido> detalles = new ArrayList<>();

        for (ProductoEnCompra producto : productos) {
            insertarDetalle(conexion, pedido.id(), producto);
            detalles.add(new DetallePedido(
                    producto.id(), producto.nombre(), producto.precio(),
                    producto.cantidad(), producto.subtotal()));
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

    public Optional<PedidoConfirmado> buscarPorClaveConfirmacion(
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

    public long bloquearCarritoActivo(Connection conexion, Long usuarioId) throws SQLException {
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

    public List<ProductoEnCompra> leerYBloquearProductos(
            Connection conexion, long carritoId) throws SQLException {
        String sql = """
                SELECT p.id, p.nombre, p.precio, p.stock, p.activo, cd.cantidad
                FROM carrito_detalle cd
                JOIN producto p ON p.id = cd.producto_id
                WHERE cd.carrito_id = ?
                ORDER BY p.id
                FOR UPDATE OF p
                """;
        List<ProductoEnCompra> productos = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, carritoId);
            try (ResultSet resultado = consulta.executeQuery()) {
                while (resultado.next()) {
                    productos.add(new ProductoEnCompra(
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
        } catch (SQLException error) {
            // Carrera entre dos clientes distintos con la misma clave: el índice único
            // decide quién la obtiene y el otro recibe un conflicto (409), no un 500.
            if (esViolacionUnica(error, INDICE_CLAVE_CONFIRMACION)) {
                throw new ClaveConfirmacionEnUsoException();
            }
            throw error;
        }
    }

    private static boolean esViolacionUnica(SQLException error, String indice) {
        return VIOLACION_UNICA.equals(error.getSQLState())
                && error.getMessage() != null
                && error.getMessage().contains(indice);
    }

    private void insertarDetalle(
            Connection conexion, long pedidoId, ProductoEnCompra producto) throws SQLException {
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
        registrarHistorial(conexion, pedidoId, "PENDIENTE", usuarioId, "Pedido creado y pago simulado aprobado");
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

    private record PedidoCreado(long id, OffsetDateTime creadoEn) {
    }
}
