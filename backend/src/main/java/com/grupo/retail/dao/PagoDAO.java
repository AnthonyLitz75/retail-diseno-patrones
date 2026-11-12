package com.grupo.retail.dao;

import com.grupo.retail.model.PagoReembolsable;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;

/**
 * Acceso a la tabla {@code pago} para reembolsos. Lo usan la cancelación de pedidos y el
 * cierre de devoluciones; ambos reembolsan a través de {@code PuertoPago} (Adapter) y
 * trabajan sobre la conexión de su transacción.
 */
@Repository
public class PagoDAO {

    private static final String BLOQUEAR_PAGO_APROBADO_SQL = """
            SELECT id_pago, monto, monto_reembolsado, referencia
            FROM pago
            WHERE pedido_id = ? AND estado = 'APROBADO'
            FOR UPDATE
            """;
    private static final String MARCAR_REVERSADO_SQL =
            "UPDATE pago SET estado = 'REVERSADO' WHERE id_pago = ? AND estado = 'APROBADO'";
    private static final String ACUMULAR_REEMBOLSO_SQL =
            "UPDATE pago SET monto_reembolsado = monto_reembolsado + ? WHERE id_pago = ?";

    /** Bloquea el cobro APROBADO del pedido para reembolsar sin carreras. */
    public Optional<PagoReembolsable> bloquearPagoAprobado(Connection conexion, long pedidoId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_PAGO_APROBADO_SQL)) {
            consulta.setLong(1, pedidoId);
            try (ResultSet fila = consulta.executeQuery()) {
                if (!fila.next()) {
                    return Optional.empty();
                }
                return Optional.of(new PagoReembolsable(fila.getLong("id_pago"), fila.getBigDecimal("monto"),
                        fila.getBigDecimal("monto_reembolsado"), fila.getString("referencia")));
            }
        }
    }

    /** Marca el cobro como reversado (cancelación del pedido); {@code false} si ya no estaba aprobado. */
    public boolean marcarReversado(Connection conexion, long pagoId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(MARCAR_REVERSADO_SQL)) {
            consulta.setLong(1, pagoId);
            return consulta.executeUpdate() == 1;
        }
    }

    public void acumularReembolso(Connection conexion, long pagoId, BigDecimal importe) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(ACUMULAR_REEMBOLSO_SQL)) {
            consulta.setBigDecimal(1, importe);
            consulta.setLong(2, pagoId);
            consulta.executeUpdate();
        }
    }
}
