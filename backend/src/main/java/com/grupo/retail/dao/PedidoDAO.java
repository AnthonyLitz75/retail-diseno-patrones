package com.grupo.retail.dao;

import com.grupo.retail.model.DetallePedido;
import com.grupo.retail.model.EventoEstadoPedido;
import com.grupo.retail.model.PedidoConfirmado;
import com.grupo.retail.model.PedidoVista;
import com.grupo.retail.model.ResultadoPago;
import com.grupo.retail.exception.PagoRechazadoException;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
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

    private final DataSource dataSource;

    public PedidoDAO(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public List<PedidoVista> listarPorCliente(Long clienteId) {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                WHERE p.usuario_id = ?
                ORDER BY p.creado_en DESC, p.id_pedido DESC
                """;
        return listarPedidos(sql, clienteId);
    }

    public List<PedidoVista> listarPendientes() {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                WHERE p.estado = 'PENDIENTE'
                ORDER BY p.creado_en, p.id_pedido
                """;
        return listarPedidos(sql, null);
    }

    public List<PedidoVista> listarOperativos() {
        String sql = """
                SELECT p.id_pedido, u.nombre AS cliente_nombre, u.correo AS cliente_correo,
                       p.estado, p.total, p.creado_en
                FROM pedido p
                JOIN usuario u ON u.id_usuario = p.usuario_id
                WHERE p.estado IN ('PENDIENTE', 'EN_PREPARACION', 'DESPACHADO')
                ORDER BY p.creado_en, p.id_pedido
                """;
        return listarPedidos(sql, null);
    }

    private List<PedidoVista> listarPedidos(String sql, Long clienteId) {
        List<PedidoVista> pedidos = new ArrayList<>();
        try (Connection conexion = dataSource.getConnection();
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
                            listarDetalles(conexion, pedidoId),
                            listarHistorial(conexion, pedidoId)));
                }
            }
            return pedidos;
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudieron consultar los pedidos", error);
        }
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
        try (Connection conexion = dataSource.getConnection();
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
        String actualizarSql = """
                UPDATE pedido
                SET estado = ?, actualizado_en = CURRENT_TIMESTAMP
                WHERE id_pedido = ? AND estado = ?
                """;
        String historialSql = """
                INSERT INTO pedido_historial_estado (pedido_id, estado, responsable_id, comentario)
                VALUES (?, ?, ?, ?)
                """;
        try (Connection conexion = dataSource.getConnection()) {
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
                try (PreparedStatement historial = conexion.prepareStatement(historialSql)) {
                    historial.setLong(1, pedidoId);
                    historial.setString(2, nuevoEstado);
                    historial.setLong(3, responsableId);
                    historial.setString(4, comentario);
                    historial.executeUpdate();
                }
                conexion.commit();
                return true;
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo actualizar el estado del pedido", error);
        }
    }

    public PedidoConfirmado confirmarCompra(
            Long usuarioId, Function<BigDecimal, ResultadoPago> procesarPago) {
        try (Connection conexion = dataSource.getConnection()) {
            conexion.setAutoCommit(false);
            try {
                long carritoId = bloquearCarritoActivo(conexion, usuarioId);
                List<ProductoDelCarrito> productos = leerYBloquearProductos(conexion, carritoId);
                if (productos.isEmpty()) {
                    throw new IllegalArgumentException("Tu carrito está vacío");
                }

                BigDecimal total = BigDecimal.ZERO;
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
                    total = total.add(
                            producto.precio().multiply(BigDecimal.valueOf(producto.cantidad())));
                }

                ResultadoPago resultadoPago = procesarPago.apply(total);
                if (!resultadoPago.aprobado()) {
                    throw new PagoRechazadoException(resultadoPago.mensaje());
                }

                PedidoCreado pedido = insertarPedido(conexion, usuarioId, total);
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

                conexion.commit();
                return new PedidoConfirmado(
                        pedido.id(), "PENDIENTE", total, pedido.creadoEn(),
                        resultadoPago.metodo(), resultadoPago.estado(),
                        resultadoPago.referencia(), List.copyOf(detalles));
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo confirmar la compra", error);
        }
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
            Connection conexion, Long usuarioId, BigDecimal total) throws SQLException {
        String sql = """
                INSERT INTO pedido (usuario_id, estado, total)
                VALUES (?, 'PENDIENTE', ?)
                RETURNING id_pedido, creado_en
                """;
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            consulta.setBigDecimal(2, total);
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
