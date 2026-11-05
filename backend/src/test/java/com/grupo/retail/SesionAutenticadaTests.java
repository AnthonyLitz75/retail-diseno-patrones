package com.grupo.retail;

import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.SesionAutenticada;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SesionAutenticadaTests {
    @Test
    void sesionDeCuentaDesactivadaSeInvalida() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        when(dao.sesionSigueVigente(42L, "ALMACEN")).thenReturn(false);
        MockHttpServletRequest solicitud = solicitud(42L, "ALMACEN");

        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> new SesionAutenticada(dao).exigirUsuario(solicitud))
                .getStatusCode().value());
        assertEquals(null, solicitud.getSession(false));
        verify(dao).sesionSigueVigente(42L, "ALMACEN");
    }

    @Test
    void sesionConRolAntiguoSeInvalidaDespuesDeUnCambioDeRol() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        when(dao.sesionSigueVigente(42L, "VENDEDOR")).thenReturn(false);
        MockHttpServletRequest solicitud = solicitud(42L, "VENDEDOR");

        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> new SesionAutenticada(dao).exigirUsuario(solicitud))
                .getStatusCode().value());
        verify(dao).sesionSigueVigente(42L, "VENDEDOR");
    }

    @Test
    void sesionPersistidaActivaConRolCoincidenteSeAcepta() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        when(dao.sesionSigueVigente(42L, "ADMIN")).thenReturn(true);

        var usuario = new SesionAutenticada(dao).exigirUsuario(solicitud(42L, "ADMIN"));

        assertEquals(42L, usuario.usuarioId());
        assertEquals("ADMIN", usuario.rol());
    }

    @Test
    void consultaDeVigenciaUsaIdYRolyEstadoComoParametros() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        Connection conexion = mock(Connection.class);
        PreparedStatement consulta = mock(PreparedStatement.class);
        ResultSet resultado = mock(ResultSet.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        when(conexion.prepareStatement(contains("activo = TRUE"))).thenReturn(consulta);
        when(consulta.executeQuery()).thenReturn(resultado);
        when(resultado.next()).thenReturn(true);

        assertEquals(true, new UsuarioDAO(proveedor).sesionSigueVigente(42L, "ADMIN"));
        verify(consulta).setLong(1, 42L);
        verify(consulta).setString(2, "ADMIN");
    }

    @Test
    void solicitudSinSesionNoConsultaBaseDeDatos() {
        UsuarioDAO dao = mock(UsuarioDAO.class);

        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> new SesionAutenticada(dao).exigirUsuario(new MockHttpServletRequest()))
                .getStatusCode().value());
        verify(dao, never()).sesionSigueVigente(org.mockito.ArgumentMatchers.anyLong(), anyString());
    }

    private MockHttpServletRequest solicitud(Long id, String rol) {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
        solicitud.getSession().setAttribute("usuarioId", id);
        solicitud.getSession().setAttribute("usuarioRol", rol);
        return solicitud;
    }
}