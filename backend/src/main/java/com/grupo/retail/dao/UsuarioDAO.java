package com.grupo.retail.dao;

import com.grupo.retail.exception.CorreoYaRegistradoException;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class UsuarioDAO {

    private final DataSource dataSource;

    public UsuarioDAO(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public Usuario registrar(String nombre, String correo, String claveHash) {
        String sql = """
                INSERT INTO usuario (nombre, correo, clave_hash, rol)
                VALUES (?, ?, ?, 'CLIENTE')
                RETURNING id_usuario, nombre, correo, rol, activo, fecha_alta
                """;

        try (Connection conexion = dataSource.getConnection();
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

    public Optional<CredencialesUsuario> buscarPorCorreo(String correo) {
        String sql = """
                SELECT id_usuario, nombre, correo, clave_hash, rol, activo, fecha_alta
                FROM usuario
                WHERE correo = ?
                """;

        try (Connection conexion = dataSource.getConnection();
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