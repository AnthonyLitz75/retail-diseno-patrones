package com.grupo.retail;

import com.grupo.retail.controller.CategoriaAdminController;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.ActualizarEstadoCategoria;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.exception.CategoriaDuplicadaException;
import com.grupo.retail.exception.GlobalExceptionHandler;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.CategoriaService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CategoriaAdminTests {
    @Test
    void rutasDeCategoriaExigenAdmin() {
        CategoriaService service = mock(CategoriaService.class);
        CategoriaAdminController controller = controller(service);

        assertEquals(401, assertThrows(ResponseStatusException.class,
                () -> controller.listar(new MockHttpServletRequest())).getStatusCode().value());
        assertEquals(403, assertThrows(ResponseStatusException.class,
                () -> controller.listar(solicitud(4L, "ALMACEN"))).getStatusCode().value());
        verify(service, never()).listarTodas();
    }

    @Test
    void administradorPuedeListarTodasIncluidasInactivas() {
        CategoriaService service = mock(CategoriaService.class);
        when(service.listarTodas()).thenReturn(List.of(
                new Categoria(1L, "Audio", true), new Categoria(2L, "Video", false)));

        assertEquals(2, controller(service).listar(solicitud(4L, "ADMIN")).size());
    }

    @Test
    void crearNormalizaNombreYDevuelve201() {
        CategoriaService service = mock(CategoriaService.class);
        when(service.crear(new SolicitudCategoria(" Audio ")))
                .thenReturn(new Categoria(7L, "Audio", true));

        var respuesta = controller(service).crear(
                new SolicitudCategoria(" Audio "), solicitud(4L, "ADMIN"));

        assertEquals(201, respuesta.getStatusCode().value());
        assertEquals("/api/admin/categorias/7", respuesta.getHeaders().getLocation().toString());
        verify(service).crear(new SolicitudCategoria(" Audio "));
    }

    @Test
    void actualizacionesInexistentesDevuelven404() {
        CategoriaService service = mock(CategoriaService.class);
        when(service.actualizarNombre(88L, new SolicitudCategoria("Audio")))
                .thenReturn(Optional.empty());
        when(service.actualizarEstado(88L, false)).thenReturn(Optional.empty());
        CategoriaAdminController controller = controller(service);
        var solicitud = solicitud(4L, "ADMIN");

        assertEquals(404, controller.actualizarNombre(88L,
                new SolicitudCategoria("Audio"), solicitud).getStatusCode().value());
        assertEquals(404, controller.actualizarEstado(88L,
                new ActualizarEstadoCategoria(false), solicitud).getStatusCode().value());
    }

    @Test
    void dtoRechazaNombreVacioOMayorDe80Caracteres() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertEquals(1, validator.validate(new SolicitudCategoria(" ")).size());
            assertEquals(1, validator.validate(new SolicitudCategoria("x".repeat(81))).size());
            assertEquals(1, validator.validate(new ActualizarEstadoCategoria(null)).size());
        }
    }

    @Test
    void servicioEliminaEspaciosYRechazaNombreInvalidoAntesDeDAO() {
        CategoriaDAO dao = mock(CategoriaDAO.class);
        CategoriaService service = new CategoriaService(dao);
        when(dao.crear("Audio")).thenReturn(new Categoria(1L, "Audio", true));

        service.crear(new SolicitudCategoria("  Audio  "));
        assertThrows(IllegalArgumentException.class,
                () -> service.crear(new SolicitudCategoria(" ")));
        verify(dao).crear("Audio");
    }

    @Test
    void daoDeAdminListaCategoriasInactivasSinFiltroActivo() throws Exception {
        ProveedorConexiones provider = mock(ProveedorConexiones.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet result = mock(ResultSet.class);
        when(provider.obtenerConexion()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(result);
        when(result.next()).thenReturn(false);

        new CategoriaDAO(provider).listarTodas();

        verify(connection).prepareStatement(contains("ORDER BY nombre, id_categoria"));
        verify(connection, never()).prepareStatement(contains("WHERE activa = TRUE"));
    }

    @Test
    void daoConvierteRestriccionUnicaEnConflicto() throws Exception {
        ProveedorConexiones provider = mock(ProveedorConexiones.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        when(provider.obtenerConexion()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenThrow(new SQLException("duplicate", "23505"));

        assertThrows(CategoriaDuplicadaException.class,
                () -> new CategoriaDAO(provider).crear("Audio"));
        verify(statement).setString(1, "Audio");
    }

    @Test
    void actualizacionDeEstadoUsaValoresParametrizados() throws Exception {
        ProveedorConexiones provider = mock(ProveedorConexiones.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet result = mock(ResultSet.class);
        when(provider.obtenerConexion()).thenReturn(connection);
        when(connection.prepareStatement(contains("UPDATE categoria SET activa = ?")))
                .thenReturn(statement);
        when(statement.executeQuery()).thenReturn(result);
        when(result.next()).thenReturn(false);

        assertEquals(Optional.empty(), new CategoriaDAO(provider).actualizarEstado(3L, false));
        verify(statement).setBoolean(1, false);
        verify(statement).setLong(2, 3L);
    }

    @Test
    void categoriaPublicaSigueListandoSoloActivas() throws Exception {
        ProveedorConexiones provider = mock(ProveedorConexiones.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet result = mock(ResultSet.class);
        when(provider.obtenerConexion()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(result);
        when(result.next()).thenReturn(false);

        new ProductoDAO(provider).listarCategorias();

        verify(connection).prepareStatement(contains("WHERE activa = TRUE"));
    }

    @Test
    void duplicadoSeTraduceA409() {
        var respuesta = new GlobalExceptionHandler()
                .manejarCategoriaDuplicada(new CategoriaDuplicadaException());
        assertEquals(409, respuesta.getStatusCode().value());
    }

    private CategoriaAdminController controller(CategoriaService service) {
        UsuarioDAO userDao = mock(UsuarioDAO.class);
        when(userDao.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
        return new CategoriaAdminController(service,
                new SesionEmpleado(new SesionAutenticada(userDao)));
    }

    private MockHttpServletRequest solicitud(Long userId, String rol) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.getSession().setAttribute("usuarioId", userId);
        request.getSession().setAttribute("usuarioRol", rol);
        return request;
    }
}