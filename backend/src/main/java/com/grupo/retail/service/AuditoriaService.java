package com.grupo.retail.service;

import com.grupo.retail.dao.AuditoriaDAO;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.PaginaAuditoria;
import com.grupo.retail.model.RangoFechas;
import com.grupo.retail.model.RegistroAuditoria;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.springframework.stereotype.Service;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;

/**
 * Módulo de auditoría: el administrador consulta quién hizo qué y cuándo (guía §2,
 * "consultar auditoría"; pantalla /admin/reportes).
 *
 * <p>Dos formas de registrar:</p>
 * <ul>
 *   <li>{@link #registrar(Connection, EventoAuditoria)} dentro de la transacción del caso de
 *       uso: si la operación se revierte, el registro también. La usan los servicios que ya
 *       tienen transacción (roles, cuentas, stock, productos) y el observador de pedidos.</li>
 *   <li>{@link #registrarAparte(EventoAuditoria)} en una transacción propia, para acciones
 *       que no la tienen o que deben quedar aunque fallen (un inicio de sesión fallido). Un
 *       error al auditar se registra en el log y no deshace la acción ya hecha.</li>
 * </ul>
 */
@Service
public class AuditoriaService {

    private static final System.Logger LOGGER = System.getLogger(AuditoriaService.class.getName());
    public static final int TAMANO_PAGINA_POR_DEFECTO = 20;
    public static final int TAMANO_PAGINA_MAXIMO = 100;
    /** Tope de filas de una exportación CSV, para no cargar la base sin límite. */
    public static final int MAXIMO_FILAS_EXPORTACION = 5000;

    private final AuditoriaDAO auditoriaDAO;
    private final EjecutorTransaccion ejecutorTransaccion;

    public AuditoriaService(AuditoriaDAO auditoriaDAO, EjecutorTransaccion ejecutorTransaccion) {
        this.auditoriaDAO = auditoriaDAO;
        this.ejecutorTransaccion = ejecutorTransaccion;
    }

    /** Registra dentro de la transacción en curso (misma conexión). */
    public void registrar(Connection conexion, EventoAuditoria evento) throws SQLException {
        auditoriaDAO.insertar(conexion, evento);
    }

    /** Registra en una transacción propia; nunca lanza (un fallo queda en el log del servidor). */
    public void registrarAparte(EventoAuditoria evento) {
        try {
            ejecutorTransaccion.ejecutar("No se pudo registrar la auditoría", conexion -> {
                auditoriaDAO.insertar(conexion, evento);
                return null;
            });
        } catch (RuntimeException error) {
            LOGGER.log(System.Logger.Level.ERROR,
                    "No se pudo registrar la auditoría " + evento.accion() + " de " + evento.entidad(), error);
        }
    }

    public PaginaAuditoria consultar(String desde, String hasta, String accion, String usuario,
            Integer pagina, Integer tamano) {
        RangoFechas rango = RangoFechas.de(desde, hasta);
        AccionAuditoria filtroAccion = parsearAccion(accion);
        String filtroUsuario = normalizarTexto(usuario);
        int numeroPagina = pagina == null ? 1 : pagina;
        int tamanoPagina = tamano == null ? TAMANO_PAGINA_POR_DEFECTO : tamano;
        if (numeroPagina < 1) {
            throw new IllegalArgumentException("La página debe ser 1 o mayor");
        }
        if (tamanoPagina < 1 || tamanoPagina > TAMANO_PAGINA_MAXIMO) {
            throw new IllegalArgumentException("El tamaño de página debe estar entre 1 y " + TAMANO_PAGINA_MAXIMO);
        }
        long total = auditoriaDAO.contar(rango, filtroAccion, filtroUsuario);
        List<RegistroAuditoria> items = auditoriaDAO.buscar(
                rango, filtroAccion, filtroUsuario, tamanoPagina, (numeroPagina - 1) * tamanoPagina);
        return new PaginaAuditoria(items, total, numeroPagina, tamanoPagina);
    }

    /** Los registros más recientes que cumplen los filtros, hasta {@link #MAXIMO_FILAS_EXPORTACION}. */
    public List<RegistroAuditoria> exportar(String desde, String hasta, String accion, String usuario) {
        return auditoriaDAO.buscar(RangoFechas.de(desde, hasta), parsearAccion(accion),
                normalizarTexto(usuario), MAXIMO_FILAS_EXPORTACION, 0);
    }

    private static AccionAuditoria parsearAccion(String accion) {
        String valor = normalizarTexto(accion);
        if (valor == null) {
            return null;
        }
        try {
            return AccionAuditoria.valueOf(valor.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("La acción de auditoría no es válida", error);
        }
    }

    private static String normalizarTexto(String texto) {
        return texto == null || texto.isBlank() ? null : texto.strip();
    }
}
