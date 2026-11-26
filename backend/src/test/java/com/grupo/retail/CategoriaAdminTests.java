package com.grupo.retail;

import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.controller.CategoriaAdminController;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.ActualizarEstadoCategoria;
import com.grupo.retail.dto.CategoriaAdminDTO;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.exception.CategoriaDuplicadaException;
import com.grupo.retail.exception.GlobalExceptionHandler;
import com.grupo.retail.exception.RecursoNoEncontradoException;
import com.grupo.retail.exception.ReglaNegocioException;
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
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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
    void administradorPuedeListarTodasIncluidasInactivas() {
        CategoriaService service = mock(CategoriaService.class);
        when(service.listarConConteos()).thenReturn(List.of(
                new CategoriaAdminDTO(1L, "Audio", true, null, 3),
                new CategoriaAdminDTO(2L, "Video", false, null, 0)));

        var resultado = controller(service).listar(solicitud(4L, "ADMIN"));
        assertEquals(2, resultado.size());
        assertEquals(3, resultado.get(0).totalProductos());
        assertEquals(0, resultado.get(1).totalProductos());
    }

    @Test
    void servicioListaCategoriasConConteoDeProductosSinNMasUno() {
        CategoriaDAO dao = mock(CategoriaDAO.class);
        CategoriaService service = new CategoriaService(dao, mock(AuditoriaService.class));
        when(dao.listarTodas()).thenReturn(List.of(
                new Categoria(1L, "Periféricos", true, null),
                new Categoria(2L, "Teclados", true, 1L),
                new Categoria(3L, "Obsoleta", false, null)));
        when(dao.consultarConteosPorCategoria()).thenReturn(Map.of(2L, 5, 3L, 2));

        List<CategoriaAdminDTO> resultado = service.listarConConteos();

        assertEquals(3, resultado.size());
        assertEquals(0, resultado.get(0).totalProductos());
        assertEquals(5, resultado.get(1).totalProductos());
        assertEquals(2, resultado.get(2).totalProductos());
        verify(dao).listarTodas();
        verify(dao).consultarConteosPorCategoria();
    }

    @Test
    void crearNormalizaNombreYDevuelve201() {
        CategoriaService service = mock(CategoriaService.class);
        when(service.crear(new SolicitudCategoria(" Audio "), 4L))
                .thenReturn(new Categoria(7L, "Audio", true));

        var respuesta = controller(service).crear(
                new SolicitudCategoria(" Audio "), solicitud(4L, "ADMIN"));

        assertEquals(201, respuesta.getStatusCode().value());
        assertEquals("/api/admin/categorias/7", respuesta.getHeaders().getLocation().toString());
        verify(service).crear(new SolicitudCategoria(" Audio "), 4L);
    }

    @Test
    void actualizacionesInexistentesDevuelven404() {
        CategoriaService service = mock(CategoriaService.class);
        when(service.actualizar(88L, new SolicitudCategoria("Audio"), 4L))
                .thenReturn(Optional.empty());
        when(service.actualizarEstado(88L, false, 4L)).thenReturn(Optional.empty());
        CategoriaAdminController controller = controller(service);
        var solicitud = solicitud(4L, "ADMIN");

        assertEquals(404, controller.actualizar(88L,
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
        CategoriaService service = new CategoriaService(dao, mock(AuditoriaService.class));
        when(dao.crear("Audio", null)).thenReturn(new Categoria(1L, "Audio", true));

        service.crear(new SolicitudCategoria("  Audio  "), 4L);
        assertThrows(IllegalArgumentException.class,
                () -> service.crear(new SolicitudCategoria(" "), 4L));
        verify(dao).crear("Audio", null);
    }

    @Test
    void crearYEditarSubcategoriaValidanJerarquiaDeDosNiveles() {
        CategoriaDAO dao = mock(CategoriaDAO.class);
        AuditoriaService auditoria = mock(AuditoriaService.class);
        CategoriaService service = new CategoriaService(dao, auditoria);
        Categoria raiz = new Categoria(1L, "Periféricos", true, null);
        Categoria hija = new Categoria(2L, "Mouse", true, 1L);
        Categoria otraRaiz = new Categoria(5L, "Accesorios", true, null);

        when(dao.buscarPorId(1L)).thenReturn(Optional.of(raiz));
        when(dao.buscarPorId(2L)).thenReturn(Optional.of(hija));
        when(dao.buscarPorId(5L)).thenReturn(Optional.of(otraRaiz));
        when(dao.buscarPorId(99L)).thenReturn(Optional.empty());
        when(dao.crear("Teclados", 1L)).thenReturn(new Categoria(4L, "Teclados", true, 1L));
        when(dao.tieneSubcategorias(1L)).thenReturn(true);
        when(dao.tieneSubcategorias(2L)).thenReturn(false);
        when(dao.actualizar(2L, "Mouse Pro", null)).thenReturn(Optional.of(new Categoria(2L, "Mouse Pro", true, null)));

        Categoria creada = service.crear(new SolicitudCategoria("Teclados", 1L), 10L);
        assertEquals(1L, creada.categoriaPadreId());

        assertThrows(RecursoNoEncontradoException.class,
                () -> service.crear(new SolicitudCategoria("Otra", 99L), 10L));
        assertThrows(ReglaNegocioException.class,
                () -> service.crear(new SolicitudCategoria("SubSub", 2L), 10L));
        assertThrows(ReglaNegocioException.class,
                () -> service.actualizar(2L, new SolicitudCategoria("Mouse", 2L), 10L));
        assertThrows(ReglaNegocioException.class,
                () -> service.actualizar(1L, new SolicitudCategoria("Periféricos", 5L), 10L));

        Categoria movidaARaiz = service.actualizar(2L, new SolicitudCategoria("Mouse Pro", null), 10L).orElseThrow();
        assertNull(movidaARaiz.categoriaPadreId());
        verify(dao, never()).crear("Otra", 99L);
        verify(dao, never()).crear("SubSub", 2L);
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

        new CategoriaDAO(provider).listarActivas();

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