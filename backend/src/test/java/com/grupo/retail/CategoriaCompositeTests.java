package com.grupo.retail;

import com.grupo.retail.controller.InicioController;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dto.CategoriaArbolDTO;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import com.grupo.retail.patterns.composite.CategoriaCompuesta;
import com.grupo.retail.patterns.composite.CategoriaSimple;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.service.ProductoService;
import com.grupo.retail.service.SesionEmpleado;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CategoriaCompositeTests {

    @Test
    @DisplayName("CategoriaSimple encapsula correctamente una hoja terminal del patrón Composite")
    void categoriaSimpleEncapsulaHojaTerminal() {
        CategoriaSimple simple = new CategoriaSimple(10L, "Teclados", 4);

        assertEquals(10L, simple.getId());
        assertEquals("Teclados", simple.getNombre());
        assertEquals(4, simple.getTotalProductos());
        assertFalse(simple.esCompuesta());
        assertEquals(List.of(10L), simple.obtenerIdsAsociados());
        assertTrue(simple.getSubcategorias().isEmpty());
    }

    @Test
    @DisplayName("CategoriaCompuesta agrega subcategorías y delega el cálculo total acumulado")
    void categoriaCompuestaAgregaSubcategoriasYCalculaTotalAcumulado() {
        CategoriaCompuesta pc = new CategoriaCompuesta(7L, "Componentes para PC", 0);
        CategoriaSimple procesadores = new CategoriaSimple(8L, "Procesadores", 3);
        CategoriaSimple ram = new CategoriaSimple(9L, "Memorias RAM", 3);
        CategoriaSimple almacenamiento = new CategoriaSimple(10L, "Almacenamiento", 3);
        CategoriaSimple gpus = new CategoriaSimple(11L, "Tarjetas de video", 2);

        pc.agregarSubcategoria(procesadores);
        pc.agregarSubcategoria(ram);
        pc.agregarSubcategoria(almacenamiento);
        pc.agregarSubcategoria(gpus);

        assertTrue(pc.esCompuesta());
        assertEquals(11, pc.getTotalProductos());
        assertEquals(List.of(7L, 8L, 9L, 10L, 11L), pc.obtenerIdsAsociados());
        assertEquals(4, pc.getSubcategorias().size());
    }

    @Test
    @DisplayName("CategoriaCompuesta para Periféricos agrupa Teclados, Mouse, Audio y Cámaras")
    void categoriaCompuestaParaPerifericosAgrupaSubcategorias() {
        CategoriaCompuesta perifericos = new CategoriaCompuesta(1L, "Periféricos", 0);
        perifericos.agregarSubcategoria(new CategoriaSimple(43L, "Teclados", 4));
        perifericos.agregarSubcategoria(new CategoriaSimple(44L, "Mouse", 4));
        perifericos.agregarSubcategoria(new CategoriaSimple(45L, "Audio", 3));
        perifericos.agregarSubcategoria(new CategoriaSimple(46L, "Cámaras", 3));

        assertTrue(perifericos.esCompuesta());
        assertEquals(14, perifericos.getTotalProductos());
        assertEquals(List.of(1L, 43L, 44L, 45L, 46L), perifericos.obtenerIdsAsociados());
        assertEquals(4, perifericos.getSubcategorias().size());
    }

    @Test
    @DisplayName("construirArbol excluye categorías y subcategorías con cero productos")
    void construirArbolExcluyeCategoriasVacias() {
        List<Categoria> categorias = List.of(
                new Categoria(1L, "Teclados", true, null),
                new Categoria(2L, "Mouse", true, null),
                new Categoria(3L, "General", true, null), // Vacía
                new Categoria(7L, "Componentes para PC", true, null),
                new Categoria(8L, "Procesadores", true, 7L),
                new Categoria(9L, "Refrigeración Líquida", true, 7L) // Subcategoría vacía
        );

        Map<Long, Integer> conteos = new HashMap<>();
        conteos.put(1L, 4);
        conteos.put(2L, 4);
        conteos.put(3L, 0); // 0 productos
        conteos.put(7L, 0); // 0 directos
        conteos.put(8L, 3);
        conteos.put(9L, 0); // 0 productos

        List<CategoriaComponente> arbol = CategoriaDAO.construirArbol(categorias, conteos, 0);

        assertEquals(3, arbol.size());
        assertEquals("Teclados", arbol.get(0).getNombre());
        assertEquals("Mouse", arbol.get(1).getNombre());

        CategoriaComponente componentes = arbol.get(2);
        assertEquals("Componentes para PC", componentes.getNombre());
        assertTrue(componentes.esCompuesta());
        assertEquals(3, componentes.getTotalProductos());
        assertEquals(1, componentes.getSubcategorias().size());
        assertEquals("Procesadores", componentes.getSubcategorias().get(0).getNombre());
    }

    @Test
    @DisplayName("construirArbol genera categoría virtual Otros si existen productos sin categoría")
    void construirArbolGeneraCategoriaOtrosSiExistenProductosHuérfanos() {
        List<Categoria> categorias = List.of(
                new Categoria(1L, "Teclados", true, null)
        );
        Map<Long, Integer> conteos = Map.of(1L, 2);

        List<CategoriaComponente> arbolConOtros = CategoriaDAO.construirArbol(categorias, conteos, 1);
        assertEquals(2, arbolConOtros.size());

        CategoriaComponente otros = arbolConOtros.get(1);
        assertNull(otros.getId());
        assertEquals("Otros", otros.getNombre());
        assertEquals(1, otros.getTotalProductos());
        assertFalse(otros.esCompuesta());

        List<CategoriaComponente> arbolSinOtros = CategoriaDAO.construirArbol(categorias, conteos, 0);
        assertEquals(1, arbolSinOtros.size());
    }

    @Test
    @DisplayName("CategoriaArbolDTO serializa fielmente la jerarquía generada por el Composite")
    void dtoSerializaJerarquiaDelComposite() {
        CategoriaCompuesta pc = new CategoriaCompuesta(7L, "Componentes para PC", 0);
        pc.agregarSubcategoria(new CategoriaSimple(8L, "Procesadores", 3));

        CategoriaArbolDTO dto = CategoriaArbolDTO.desdeComponente(pc);

        assertEquals(7L, dto.id());
        assertEquals("Componentes para PC", dto.nombre());
        assertTrue(dto.compuesta());
        assertEquals(3, dto.totalProductos());
        assertEquals(1, dto.subcategorias().size());
        assertEquals("Procesadores", dto.subcategorias().get(0).nombre());
        assertFalse(dto.subcategorias().get(0).compuesta());
    }

    @Test
    @DisplayName("InicioController expone el árbol de categorías con el endpoint /api/categorias/arbol")
    void inicioControllerExponeArbolDeCategorias() {
        ProductoService service = mock(ProductoService.class);
        SesionEmpleado sesion = mock(SesionEmpleado.class);
        InicioController controller = new InicioController(service, sesion);

        CategoriaCompuesta pc = new CategoriaCompuesta(7L, "Componentes para PC", 0);
        pc.agregarSubcategoria(new CategoriaSimple(8L, "Procesadores", 3));
        when(service.listarArbolCategorias()).thenReturn(List.of(pc));

        List<CategoriaArbolDTO> resultado = controller.listarArbolCategorias();
        assertEquals(1, resultado.size());
        assertEquals("Componentes para PC", resultado.get(0).nombre());
        assertEquals(3, resultado.get(0).totalProductos());
        assertEquals(1, resultado.get(0).subcategorias().size());
    }

    @Test
    @DisplayName("ProductoDAO filtra subcategorías al consultar por categoría padre")
    void productoDaoFiltraSubcategoriasAlConsultarCategoriaPadre() throws Exception {
        ProveedorConexiones provider = mock(ProveedorConexiones.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet result = mock(ResultSet.class);

        when(provider.obtenerConexion()).thenReturn(connection);
        when(connection.prepareStatement(contains("c.categoria_padre_id"))).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(result);
        when(result.next()).thenReturn(false);

        ProductoDAO dao = new ProductoDAO(provider);
        dao.listarTodos(null, "Componentes para PC", null, null);

        verify(connection).prepareStatement(contains("c.categoria_padre_id"));
        verify(statement).setString(1, "Componentes para PC");
        verify(statement).setString(2, "Componentes para PC");
    }

    @Test
    @DisplayName("ProductoDAO filtra categoria_id IS NULL cuando la categoría es Otros")
    void productoDaoFiltraNulosCuandoCategoriaEsOtros() throws Exception {
        ProveedorConexiones provider = mock(ProveedorConexiones.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet result = mock(ResultSet.class);

        when(provider.obtenerConexion()).thenReturn(connection);
        when(connection.prepareStatement(contains("p.categoria_id IS NULL"))).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(result);
        when(result.next()).thenReturn(false);

        ProductoDAO dao = new ProductoDAO(provider);
        dao.listarTodos(null, "Otros", null, null);

        verify(connection).prepareStatement(contains("p.categoria_id IS NULL"));
    }
}
