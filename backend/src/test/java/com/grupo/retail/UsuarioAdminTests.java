package com.grupo.retail;

import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.controller.UsuarioAdminController;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.ActualizarRolUsuario;
import com.grupo.retail.dto.RegistroPersonal;
import com.grupo.retail.exception.CorreoYaRegistradoException;
import com.grupo.retail.exception.GlobalExceptionHandler;
import com.grupo.retail.exception.OperacionAdminNoPermitidaException;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionEmpleado;
import com.grupo.retail.service.UsuarioService;
import com.grupo.retail.transaccion.EjecutorTransaccion;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UsuarioAdminTests {

    @Test
    void adminPuedeListarCuentasConModeloPublico() {
        UsuarioService servicio = mock(UsuarioService.class);
        when(servicio.listarUsuarios()).thenReturn(List.of(
                new Usuario(1L, "Admin", "admin@example.com", "ADMIN", true, null)));

        List<Usuario> usuarios = controller(servicio).listar(solicitud(1L, "ADMIN"));

        assertEquals(1, usuarios.size());
        assertFalse(usuarios.getFirst().toString().contains("clave"));
        verify(servicio).listarUsuarios();
    }

    @Test
    void crearPersonalNormalizaCorreoYEncriptaClaveAntesDePersistir() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        UsuarioService servicio = new UsuarioService(dao, encoder, mock(EjecutorTransaccion.class), mock(AuditoriaService.class));
        RegistroPersonal datos = new RegistroPersonal(
                "  Vendedora  ", "  VENDEDORA@example.com ", "clave-segura", "VENDEDOR");
        when(encoder.encode("clave-segura")).thenReturn("bcrypt-hash");
        when(dao.registrarPersonal("Vendedora", "vendedora@example.com", "bcrypt-hash", "VENDEDOR"))
                .thenReturn(new Usuario(7L, "Vendedora", "vendedora@example.com", "VENDEDOR", true, null));

        Usuario creado = servicio.registrarPersonal(datos, 1L);

        assertEquals("VENDEDOR", creado.rol());
        verify(dao).registrarPersonal("Vendedora", "vendedora@example.com", "bcrypt-hash", "VENDEDOR");
    }

    @Test
    void dtoValidaRolDeAltaYDatosObligatorios() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            // nombre, correo, rol y dos de la clave "corta": longitud y mayúscula/número (ReglasClave)
            assertEquals(5, validator.validate(new RegistroPersonal(
                    " ", "correo-invalido", "corta", "ROL_INVALIDO")).size());
            assertEquals(1, validator.validate(new ActualizarRolUsuario("ROL_INVALIDO")).size());
        }
    }

    @Test
    void noSePermiteCrearRolesFueraDeLaListaDePersonal() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        UsuarioService servicio = new UsuarioService(dao, mock(PasswordEncoder.class), mock(EjecutorTransaccion.class), mock(AuditoriaService.class));
        RegistroPersonal datos = new RegistroPersonal("Cliente", "c@example.com", "clave-segura", "ROL_INVALIDO");

        assertThrows(ResponseStatusException.class, () -> servicio.registrarPersonal(datos, 1L));
        verify(dao, never()).registrarPersonal(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void administradorNoPuedeDesactivarseNiQuitarseSuRol() throws Exception {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        UsuarioService servicio = new UsuarioService(dao, mock(PasswordEncoder.class), mock(EjecutorTransaccion.class), mock(AuditoriaService.class));

        assertThrows(OperacionAdminNoPermitidaException.class,
                () -> servicio.desactivar(4L, 4L));
        assertThrows(OperacionAdminNoPermitidaException.class,
                () -> servicio.actualizarRol(4L, 4L, new ActualizarRolUsuario("ALMACEN")));
        verify(dao, never()).marcarInactivo(any(), anyLong());
        verify(dao, never()).cambiarRol(any(), anyLong(), anyString());
    }

    @Test
    void controladorDevuelve409ParaCorreoDuplicado() {
        var respuesta = new GlobalExceptionHandler()
                .manejarCorreoDuplicado(new CorreoYaRegistradoException());
        assertEquals(409, respuesta.getStatusCode().value());
    }

    @Test
    void listadoSqlNuncaSeleccionaHashDeClave() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(anyString())).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(false);

        new UsuarioDAO(proveedor).listarUsuarios();

        verify(conexion).prepareStatement(contains("ORDER BY id_usuario"));
        verify(conexion).prepareStatement(contains("fecha_alta"));
        verify(conexion, never()).prepareStatement(contains("clave_hash"));
    }

    @Test
    void cambioDeRolProtegeElUltimoAdminConBloqueoOrdenado() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement admins = mock(PreparedStatement.class);
        ResultSet filasAdmins = mock(ResultSet.class);
        PreparedStatement buscar = mock(PreparedStatement.class);
        ResultSet filaAdmin = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("ORDER BY id_usuario"))).thenReturn(admins);
        when(admins.executeQuery()).thenReturn(filasAdmins);
        when(filasAdmins.next()).thenReturn(true, false);
        when(filasAdmins.getLong("id_usuario")).thenReturn(9L);
        when(conexion.prepareStatement(contains("WHERE id_usuario = ? AND activo = TRUE")))
                .thenReturn(buscar);
        when(buscar.executeQuery()).thenReturn(filaAdmin);
        when(filaAdmin.next()).thenReturn(true);
        when(filaAdmin.getLong("id_usuario")).thenReturn(9L);
        when(filaAdmin.getString("nombre")).thenReturn("Admin");
        when(filaAdmin.getString("correo")).thenReturn("admin@example.com");
        when(filaAdmin.getString("rol")).thenReturn("ADMIN");
        when(filaAdmin.getBoolean("activo")).thenReturn(true);

        assertThrows(OperacionAdminNoPermitidaException.class,
                () -> servicioSobre(proveedor).actualizarRol(9L, 1L, new ActualizarRolUsuario("VENDEDOR")));

        verify(conexion).prepareStatement(contains("ORDER BY id_usuario"));
        verify(conexion).rollback();
        verify(conexion, never()).prepareStatement(contains("UPDATE usuario SET rol"));
    }

    @Test
    void administradorPuedeDesactivarOtraCuentaConSuIdentidadDeSesion() {
        UsuarioService servicio = mock(UsuarioService.class);
        var respuesta = controller(servicio).desactivar(8L, solicitud(1L, "ADMIN"));

        assertEquals(204, respuesta.getStatusCode().value());
        verify(servicio).desactivar(8L, 1L);
    }

    @Test
    void noSePuedeDesactivarElUltimoAdministradorActivo() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement admins = mock(PreparedStatement.class);
        ResultSet filasAdmins = mock(ResultSet.class);
        PreparedStatement buscar = mock(PreparedStatement.class);
        ResultSet filaAdmin = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("ORDER BY id_usuario"))).thenReturn(admins);
        when(admins.executeQuery()).thenReturn(filasAdmins);
        when(filasAdmins.next()).thenReturn(true, false);
        when(filasAdmins.getLong("id_usuario")).thenReturn(9L);
        when(conexion.prepareStatement(contains("WHERE id_usuario = ? AND activo = TRUE")))
                .thenReturn(buscar);
        when(buscar.executeQuery()).thenReturn(filaAdmin);
        when(filaAdmin.next()).thenReturn(true);
        when(filaAdmin.getLong("id_usuario")).thenReturn(9L);
        when(filaAdmin.getString("nombre")).thenReturn("Admin");
        when(filaAdmin.getString("correo")).thenReturn("admin@example.com");
        when(filaAdmin.getString("rol")).thenReturn("ADMIN");
        when(filaAdmin.getBoolean("activo")).thenReturn(true);

        assertThrows(OperacionAdminNoPermitidaException.class,
                () -> servicioSobre(proveedor).desactivar(9L, 1L));
        verify(conexion).rollback();
        verify(conexion, never()).prepareStatement(contains("UPDATE usuario SET activo = FALSE"));
    }
    @Test
    void cuentaInexistenteParaCambioDeRolResponde404YRevierte() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement admins = mock(PreparedStatement.class);
        ResultSet filasAdmins = mock(ResultSet.class);
        PreparedStatement buscar = mock(PreparedStatement.class);
        ResultSet fila = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("ORDER BY id_usuario"))).thenReturn(admins);
        when(admins.executeQuery()).thenReturn(filasAdmins);
        when(filasAdmins.next()).thenReturn(false);
        when(conexion.prepareStatement(contains("WHERE id_usuario = ? AND activo = TRUE")))
                .thenReturn(buscar);
        when(buscar.executeQuery()).thenReturn(fila);
        when(fila.next()).thenReturn(false);

        assertThrows(java.util.NoSuchElementException.class,
                () -> servicioSobre(proveedor).actualizarRol(99L, 1L, new ActualizarRolUsuario("ALMACEN")));
        verify(conexion).rollback();
        verify(conexion, never()).prepareStatement(contains("UPDATE usuario SET rol"));
    }

    private UsuarioAdminController controller(UsuarioService servicio) {
        return new UsuarioAdminController(servicio,
                new SesionEmpleado(sesionActiva()));
    }

    private MockHttpServletRequest solicitud(Long usuarioId, String rol) {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
        solicitud.getSession().setAttribute("usuarioId", usuarioId);
        solicitud.getSession().setAttribute("usuarioRol", rol);
        return solicitud;
    }
    private static SesionAutenticada sesionActiva() {
        UsuarioDAO usuarioDAO = mock(UsuarioDAO.class);
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
        return new SesionAutenticada(usuarioDAO);
    }
    /** Servicio con DAO y transacción reales sobre JDBC simulado. */
    private static UsuarioService servicioSobre(ProveedorConexiones proveedor) {
        return new UsuarioService(new UsuarioDAO(proveedor), mock(PasswordEncoder.class),
                new EjecutorTransaccion(proveedor), mock(AuditoriaService.class));
    }
}
