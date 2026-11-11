package com.grupo.retail.transaccion;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;

/**
 * Dueño de la transacción de un caso de uso (spec 004, constitución III).
 *
 * <p>El servicio coordinador pide aquí una transacción; el ejecutor toma una conexión
 * del pool, desactiva autoCommit, entrega esa misma conexión a la operación y hace
 * commit si termina o rollback ante cualquier fallo. Los DAO que participan reciben la
 * conexión por parámetro y nunca la cierran, de modo que un caso de uso usa una sola
 * conexión y todo se guarda o nada.</p>
 *
 * <p>Las excepciones de negocio (RuntimeException) se propagan intactas para que el
 * manejador HTTP responda su código (400, 404, 409...). Un SQLException se traduce a
 * {@link ErrorAccesoDatosException} (500).</p>
 */
@Component
public class EjecutorTransaccion {

    /** Operación de un caso de uso que trabaja sobre la conexión de la transacción. */
    @FunctionalInterface
    public interface OperacionTransaccional<T> {
        T ejecutar(Connection conexion) throws SQLException;
    }

    private final ProveedorConexiones proveedorConexiones;

    public EjecutorTransaccion(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = Objects.requireNonNull(
                proveedorConexiones, "proveedorConexiones no puede ser null");
    }

    /**
     * @param mensajeFallo mensaje de {@link ErrorAccesoDatosException} si falla el SQL
     * @param operacion    pasos del caso de uso, todos sobre la conexión recibida
     */
    public <T> T ejecutar(String mensajeFallo, OperacionTransaccional<T> operacion) {
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                T resultado = operacion.ejecutar(conexion);
                conexion.commit();
                return resultado;
            } catch (SQLException | RuntimeException error) {
                revertir(conexion, error);
                throw error;
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException(mensajeFallo, error);
        }
    }

    private static void revertir(Connection conexion, Exception errorOriginal) {
        try {
            conexion.rollback();
        } catch (SQLException errorAlRevertir) {
            // El error del caso de uso es el relevante; el del rollback queda adjunto.
            errorOriginal.addSuppressed(errorAlRevertir);
        }
    }
}
