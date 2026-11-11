package com.grupo.retail.transaccion;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Component;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
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
 *
 * <p>Durante la operación se pueden registrar acciones con {@link #trasConfirmar}: corren
 * solo después del commit (por ejemplo, avisos post-commit del patrón Observer) y se
 * descartan si la transacción se revierte.</p>
 */
@Component
public class EjecutorTransaccion {

    private static final System.Logger LOGGER = System.getLogger(EjecutorTransaccion.class.getName());

    /** Operación de un caso de uso que trabaja sobre la conexión de la transacción. */
    @FunctionalInterface
    public interface OperacionTransaccional<T> {
        T ejecutar(Connection conexion) throws SQLException;
    }

    private final ProveedorConexiones proveedorConexiones;
    private final ThreadLocal<List<Runnable>> accionesTrasConfirmar = new ThreadLocal<>();

    public EjecutorTransaccion(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = Objects.requireNonNull(
                proveedorConexiones, "proveedorConexiones no puede ser null");
    }

    /**
     * @param mensajeFallo mensaje de {@link ErrorAccesoDatosException} si falla el SQL
     * @param operacion    pasos del caso de uso, todos sobre la conexión recibida
     */
    public <T> T ejecutar(String mensajeFallo, OperacionTransaccional<T> operacion) {
        if (accionesTrasConfirmar.get() != null) {
            throw new IllegalStateException("No se admiten transacciones anidadas en el mismo hilo");
        }
        List<Runnable> pendientes = new ArrayList<>();
        accionesTrasConfirmar.set(pendientes);
        T resultado;
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                resultado = operacion.ejecutar(conexion);
                conexion.commit();
            } catch (SQLException | RuntimeException error) {
                revertir(conexion, error);
                throw error;
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException(mensajeFallo, error);
        } finally {
            accionesTrasConfirmar.remove();
        }
        ejecutarTrasConfirmar(pendientes);
        return resultado;
    }

    /**
     * Programa una acción para después del commit de la transacción en curso. Si la
     * transacción se revierte, la acción no corre.
     *
     * @throws IllegalStateException si no hay una transacción en curso en este hilo
     */
    public void trasConfirmar(Runnable accion) {
        List<Runnable> pendientes = accionesTrasConfirmar.get();
        if (pendientes == null) {
            throw new IllegalStateException("trasConfirmar solo se puede usar dentro de una transacción");
        }
        pendientes.add(Objects.requireNonNull(accion, "accion no puede ser null"));
    }

    /**
     * La transacción ya está confirmada: un fallo de una acción (por ejemplo, un canal de
     * aviso caído) se registra y no cambia el resultado ni impide las demás.
     */
    private static void ejecutarTrasConfirmar(List<Runnable> pendientes) {
        for (Runnable accion : pendientes) {
            try {
                accion.run();
            } catch (RuntimeException error) {
                LOGGER.log(System.Logger.Level.WARNING, "Falló una acción posterior al commit", error);
            }
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
