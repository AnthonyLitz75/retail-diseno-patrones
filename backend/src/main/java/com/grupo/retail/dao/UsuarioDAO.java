package com.grupo.retail.dao;

import com.grupo.retail.exception.CorreoYaRegistradoException;
import com.grupo.retail.exception.OperacionAdminNoPermitidaException;
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
            throw new IllegalStateException("No se pudo registrar el cliente", error);
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
            throw new IllegalStateException("No se pudo registrar la cuenta de personal", error);
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
            throw new IllegalStateException("No se pudieron consultar las cuentas", error);
        }
    }

    public Optional<Usuario> actualizarRol(Long usuarioId, String rol) {
        String sqlBuscar = """
                SELECT id_usuario, nombre, correo, rol, activo, fecha_alta
                FROM usuario
                WHERE id_usuario = ? AND activo = TRUE
                FOR UPDATE
                """;
        String sqlActualizar = """
                UPDATE usuario SET rol = ?
                WHERE id_usuario = ? AND activo = TRUE
                RETURNING id_usuario, nombre, correo, rol, activo, fecha_alta
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                List<Long> administradores = bloquearAdministradoresActivos(conexion);
                Usuario actual = buscarBloqueado(conexion, sqlBuscar, usuarioId).orElse(null);
                if (actual == null) {
                    conexion.commit();
                    return Optional.empty();
                }
                validarInvarianteUltimoAdminParaCambioRol(actual, rol, administradores.size());
                if (actual.rol().equals(rol)) {
                    conexion.commit();
                    return Optional.of(actual);
                }
                try (PreparedStatement consulta = conexion.prepareStatement(sqlActualizar)) {
                    consulta.setString(1, rol);
                    consulta.setLong(2, usuarioId);
                    try (ResultSet resultado = consulta.executeQuery()) {
                        if (!resultado.next()) {
                            conexion.commit();
                            return Optional.empty();
                        }
                        Usuario actualizado = mapearUsuario(resultado);
                        conexion.commit();
                        return Optional.of(actualizado);
                    }
                }
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo actualizar el rol", error);
        }
    }

    public boolean desactivar(Long usuarioId) {
        String sqlBuscar = """
                SELECT id_usuario, nombre, correo, rol, activo, fecha_alta
                FROM usuario
                WHERE id_usuario = ? AND activo = TRUE
                FOR UPDATE
                """;
        String sqlDesactivar = """
                UPDATE usuario SET activo = FALSE
                WHERE id_usuario = ? AND activo = TRUE
                """;
        try (Connection conexion = proveedorConexiones.obtenerConexion()) {
            conexion.setAutoCommit(false);
            try {
                List<Long> administradores = bloquearAdministradoresActivos(conexion);
                Usuario actual = buscarBloqueado(conexion, sqlBuscar, usuarioId).orElse(null);
                if (actual == null) {
                    conexion.commit();
                    return false;
                }
                validarInvarianteUltimoAdminParaDesactivacion(actual, administradores.size());
                try (PreparedStatement consulta = conexion.prepareStatement(sqlDesactivar)) {
                    consulta.setLong(1, usuarioId);
                    boolean desactivado = consulta.executeUpdate() == 1;
                    conexion.commit();
                    return desactivado;
                }
            } catch (SQLException | RuntimeException error) {
                conexion.rollback();
                throw error;
            }
        } catch (SQLException error) {
            throw new IllegalStateException("No se pudo desactivar la cuenta", error);
        }
    }

    private void validarInvarianteUltimoAdminParaCambioRol(
            Usuario actual, String nuevoRol, int totalAdminsActivos) {
        if ("ADMIN".equals(actual.rol()) && !"ADMIN".equals(nuevoRol) && totalAdminsActivos <= 1) {
            throw new OperacionAdminNoPermitidaException(
                    "No se puede cambiar el rol del último administrador activo");
        }
    }

    private void validarInvarianteUltimoAdminParaDesactivacion(
            Usuario actual, int totalAdminsActivos) {
        if ("ADMIN".equals(actual.rol()) && totalAdminsActivos <= 1) {
            throw new OperacionAdminNoPermitidaException(
                    "No se puede desactivar el último administrador activo");
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
            throw new IllegalStateException("No se pudo validar la sesión", error);
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
            throw new IllegalStateException("No se pudo consultar la cuenta", error);
        }
    }

    private List<Long> bloquearAdministradoresActivos(Connection conexion) throws SQLException {
        List<Long> ids = new ArrayList<>();
        try (PreparedStatement consulta = conexion.prepareStatement(BLOQUEAR_ADMINS);
                ResultSet resultado = consulta.executeQuery()) {
            while (resultado.next()) {
                ids.add(resultado.getLong("id_usuario"));
            }
        }
        return ids;
    }

    private Optional<Usuario> buscarBloqueado(Connection conexion, String sql, Long usuarioId)
            throws SQLException {
        try (PreparedStatement consulta = conexion.prepareStatement(sql)) {
            consulta.setLong(1, usuarioId);
            try (ResultSet resultado = consulta.executeQuery()) {
                return resultado.next() ? Optional.of(mapearUsuario(resultado)) : Optional.empty();
            }
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
