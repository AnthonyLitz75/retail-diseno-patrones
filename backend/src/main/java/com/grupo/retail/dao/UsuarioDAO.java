package com.grupo.retail.dao;

import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.exception.CorreoYaRegistradoException;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import org.springframework.stereotype.Repository;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Repository
public class UsuarioDAO {
    private static final String COLUMNAS_PUBLICAS =
            "id_usuario, nombre, correo, rol, activo, fecha_alta";
    private static final String BLOQUEAR_ADMINS = """
            SELECT id_usuario
            FROM usuario
            WHERE rol = 'ADMIN' AND activo = TRUE
            ORDER BY id_usuario
            FOR UPDATE
            """;

    private final ProveedorConexiones proveedorConexiones;

    public UsuarioDAO(ProveedorConexiones proveedorConexiones) {
        this.proveedorConexiones = proveedorConexiones;
    }

    public Usuario registrar(String nombre, String correo, String claveHash) {
        String sql = """
                INSERT INTO usuario (nombre, correo, clave_hash, rol)
                VALUES (?, ?, ?, 'CLIENTE')
                RETURNING id_usuario, nombre, correo, rol, activo, fecha_alta
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, nombre);
            consulta.setString(2, correo);
            consulta.setString(3, claveHash);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("PostgreSQL no devolvió el usuario creado");
                }
                return mapearUsuario(resultado);
            }
        } catch (SQLException error) {
            if ("23505".equals(error.getSQLState())) {
                throw new CorreoYaRegistradoException();
            }
            throw new ErrorAccesoDatosException("No se pudo registrar el cliente", error);
        }
    }

    public Usuario registrarPersonal(String nombre, String correo, String claveHash, String rol) {
        String sql = """
                INSERT INTO usuario (nombre, correo, clave_hash, rol)
                VALUES (?, ?, ?, ?)
                RETURNING id_usuario, nombre, correo, rol, activo, fecha_alta
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, nombre);
            consulta.setString(2, correo);
            consulta.setString(3, claveHash);
            consulta.setString(4, rol);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    throw new SQLException("PostgreSQL no devolvió la cuenta creada");
                }
                return mapearUsuario(resultado);
            }
        } catch (SQLException error) {
            if ("23505".equals(error.getSQLState())) {
                throw new CorreoYaRegistradoException();
            }
            throw new ErrorAccesoDatosException("No se pudo registrar la cuenta de personal", error);
        }
    }

    public List<Usuario> listarUsuarios() {
        String sql = "SELECT " + COLUMNAS_PUBLICAS + " FROM usuario ORDER BY id_usuario";
        List<Usuario> usuarios = new ArrayList<>();
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql);
                ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                usuarios.add(mapearUsuario(resultado));
            }
            return List.copyOf(usuarios);
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudieron consultar las cuentas", error);
        }
    }

    private static final String BLOQUEAR_ACTIVO_SQL = """
            SELECT id_usuario, nombre, correo, rol, activo, fecha_alta
            FROM usuario
            WHERE id_usuario = ? AND activo = TRUE
            FOR UPDATE
            """;
    private static final String CAMBIAR_ROL_SQL = """
            UPDATE usuario SET rol = ?
            WHERE id_usuario = ? AND activo = TRUE
            RETURNING id_usuario, nombre, correo, rol, activo, fecha_alta
            """;
    private static final String DESACTIVAR_SQL = "UPDATE usuario SET activo = FALSE WHERE id_usuario = ? AND activo = TRUE";

    /**
     * Bloquea a todos los administradores activos (en orden de id) y devuelve cuántos son.
     * El servicio lo llama antes de bloquear la cuenta objetivo para proteger al último ADMIN.
     */
    public int bloquearAdministradoresActivos(Connection conexion) throws SQLException {
        int total = 0;
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_ADMINS);
                ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                total++;
            }
        }
        return total;
    }

    /** Bloquea una cuenta activa; vacío si no existe o ya está desactivada. */
    public Optional<Usuario> bloquearActivo(Connection conexion, long usuarioId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_ACTIVO_SQL)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearUsuario(resultado)) : Optional.empty();
            }
        }
    }

    public Optional<Usuario> cambiarRol(Connection conexion, long usuarioId, String rol) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(CAMBIAR_ROL_SQL)) {
            consulta.setString(1, rol);
            consulta.setLong(2, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearUsuario(resultado)) : Optional.empty();
            }
        }
    }

    public boolean marcarInactivo(Connection conexion, long usuarioId) throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(DESACTIVAR_SQL)) {
            consulta.setLong(1, usuarioId);
            return consulta.executeUpdate() == 1;
        }
    }

    public boolean sesionSigueVigente(Long usuarioId, String rol) {
        String sql = "SELECT 1 FROM usuario WHERE id_usuario = ? AND rol = ? AND activo = TRUE";
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            consulta.setString(2, rol);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next();
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo validar la sesión", error);
        }
    }

    public Optional<CredencialesUsuario> buscarPorCorreo(String correo) {
        String sql = """
                SELECT id_usuario, nombre, correo, clave_hash, rol, activo, fecha_alta
                FROM usuario
                WHERE correo = ?
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion();
                PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setString(1, correo);
            try (ResultSet resultado = consulta.executeQuery()) {
                if (!resultado.next()) {
                    return Optional.empty();
                }
                Usuario usuario = mapearUsuario(resultado);
                String claveHash = resultado.getString("clave_hash");
                return Optional.of(new CredencialesUsuario(usuario, claveHash));
            }
        } catch (SQLException error) {
            throw new ErrorAccesoDatosException("No se pudo consultar la cuenta", error);
        }
    }

    private Usuario mapearUsuario(ResultSet resultado) throws SQLException {
        return new Usuario(
                resultado.getLong("id_usuario"),
                resultado.getString("nombre"),
                resultado.getString("correo"),
                resultado.getString("rol"),
                resultado.getBoolean("activo"),
                resultado.getObject("fecha_alta", OffsetDateTime.class));
    }
}
