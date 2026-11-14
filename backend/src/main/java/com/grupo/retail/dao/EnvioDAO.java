package com.grupo.retail.dao;

import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.model.EnvioPedido;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;

/**
 * Acceso a datos para los envíos físicos de pedidos y su trazabilidad (Spec 009).
 * Desacoplado de {@link PedidoDAO} para garantizar alta cohesión y responsabilidad única (SRP).
 * Las transiciones de almacén las coordina {@code PedidoService} y los métodos reciben la
 * conexión activa de la transacción sin cerrarla ni confirmarla.
 */
@Repository
public class EnvioDAO {

    /** SQLState de PostgreSQL para unique_violation. */
    private static final String VIOLACION_UNICA = "23505";

    private static final String INSERTAR_ENVIO_SQL = """
            INSERT INTO envio (pedido_id, transportista, codigo_seguimiento)
            VALUES (?, ?, ?)
            """;

    private static final String MARCAR_ENTREGA_SQL = """
            UPDATE envio
            SET entregado_en = CURRENT_TIMESTAMP
            WHERE pedido_id = ? AND entregado_en IS NULL
            """;

    /** Registra el despacho del pedido asociando transportista y código de seguimiento. */
    public void registrarEnvio(Connection conexion, long pedidoId, EnvioPedido envio) throws SQLException {
        if (envio == null) {
            return;
        }
        try (PreparedStatement insertarEnvio = conexion.prepareStatement(INSERTAR_ENVIO_SQL)) {
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

    /** Marca la fecha de entrega efectiva del pedido si aún no estaba entregado. */
    public void registrarEntrega(Connection conexion, long pedidoId) throws SQLException {
        try (PreparedStatement registrarEntrega = conexion.prepareStatement(MARCAR_ENTREGA_SQL)) {
            registrarEntrega.setLong(1, pedidoId);
            registrarEntrega.executeUpdate();
        }
    }

    /** Mapea el registro de envío desde un ResultSet activo con proyección LEFT JOIN envio. */
    public EnvioPedido mapearEnvio(ResultSet resultado) throws SQLException {
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
}
