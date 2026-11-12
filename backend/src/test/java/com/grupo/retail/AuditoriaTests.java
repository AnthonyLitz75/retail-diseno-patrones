package com.grupo.retail;

import com.grupo.retail.controller.AuthController;
import com.grupo.retail.dao.AuditoriaDAO;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.ActualizarRolUsuario;
import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.exception.DemasiadosIntentosException;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.PaginaAuditoria;
import com.grupo.retail.model.Producto;
import com.grupo.retail.model.RangoFechas;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.patterns.observer.AuditoriaPedidoObservador;
import com.grupo.retail.patterns.observer.EventoPedido;
import com.grupo.retail.patterns.singleton.ProveedorConexiones;
import com.grupo.retail.security.LimitadorIntentosLogin;
import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.service.ProductoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.UsuarioService;
import com.grupo.retail.transaccion.EjecutorTransaccion;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Módulo de auditoría: qué se registra, cómo y con qué validaciones. */
class AuditoriaTests {

    private final Connection conexion = mock(Connection.class);

    private EjecutorTransaccion ejecutor() throws Exception {
        ProveedorConexiones proveedor = mock(ProveedorConexiones.class);
        when(proveedor.obtenerConexion()).thenReturn(conexion);
        return new EjecutorTransaccion(proveedor);
    }

    // ---------- Evento

    @Test
    void elDetalleSeRecortaA500CaracteresYLaAccionEsObligatoria() {
        EventoAuditoria largo = EventoAuditoria.de(1L, AccionAuditoria.PRODUCTO_EDITADO, "PRODUCTO", 2L, "x".repeat(800));
        assertEquals(EventoAuditoria.LARGO_MAXIMO_DETALLE, largo.detalle().length());
        assertTrue(largo.detalle().endsWith("…"));
        assertEquals("", EventoAuditoria.de(1L, AccionAuditoria.INICIO_SESION, "USUARIO", 1L, null).detalle());
        assertThrows(NullPointerException.class, () -> EventoAuditoria.de(1L, null, "USUARIO", 1L, ""));
    }

    // ---------- Observer de pedidos

    @Test
    void elObservadorConvierteEventosDePedidoReclamoYDevolucion() {
        OffsetDateTime ahora = OffsetDateTime.now();
        EventoAuditoria creado = AuditoriaPedidoObservador.convertir(
                new EventoPedido(10L, 5L, null, "PENDIENTE", ahora, "Pedido confirmado", 5L));
        EventoAuditoria reclamo = AuditoriaPedidoObservador.convertir(
                new EventoPedido(10L, 5L, "RECLAMO_ABIERTO", "RECLAMO_RESPONDIDO", ahora, "Respondido", 9L));
        EventoAuditoria devolucion = AuditoriaPedidoObservador.convertir(
                new EventoPedido(10L, 5L, null, "DEVOLUCION_SOLICITADA", ahora, "Solicitada"));

        assertEquals(AccionAuditoria.PEDIDO_ESTADO, creado.accion());
        assertEquals("PEDIDO", creado.entidad());
        assertEquals(10L, creado.entidadId());
        assertEquals(5L, creado.usuarioId());
        assertEquals("Pedido #10: (nuevo) → PENDIENTE. Pedido confirmado", creado.detalle());
        assertEquals("RECLAMO", reclamo.entidad());
        assertEquals(9L, reclamo.usuarioId());
        assertEquals("DEVOLUCION", devolucion.entidad());
        assertNull(devolucion.usuarioId(), "sin responsable conocido");
    }

    @Test
    void elObservadorEscribeConLaConexionDelCasoDeUso() throws Exception {
        AuditoriaService auditoria = mock(AuditoriaService.class);
        new AuditoriaPedidoObservador(auditoria).alCambiarEstado(conexion,
                new EventoPedido(3L, 4L, "PENDIENTE", "CANCELADO", OffsetDateTime.now(), "Cancelado", 4L));
        verify(auditoria).registrar(eq(conexion), any(EventoAuditoria.class));
    }

    // ---------- Servicio

    @Test
    void registrarAparteNuncaRompeLaAccionSiLaAuditoriaFalla() throws Exception {
        AuditoriaDAO dao = mock(AuditoriaDAO.class);
        doThrow(new SQLException("sin tabla")).when(dao).insertar(any(), any());
        AuditoriaService servicio = new AuditoriaService(dao, ejecutor());

        assertDoesNotThrow(() -> servicio.registrarAparte(
                EventoAuditoria.de(1L, AccionAuditoria.INICIO_SESION, "USUARIO", 1L, "")));
        verify(conexion).rollback();
    }

    @Test
    void consultarCalculaElDesplazamientoYUsaValoresPorDefecto() throws Exception {
        AuditoriaDAO dao = mock(AuditoriaDAO.class);
        when(dao.contar(any(), any(), any())).thenReturn(45L);
        when(dao.buscar(any(), any(), any(), anyInt(), anyInt())).thenReturn(List.of());
        AuditoriaService servicio = new AuditoriaService(dao, ejecutor());

        PaginaAuditoria pagina = servicio.consultar(null, null, " rol_cambiado ", "  ana  ", 3, null);

        verify(dao).buscar(any(RangoFechas.class), eq(AccionAuditoria.ROL_CAMBIADO), eq("ana"), eq(20), eq(40));
        assertEquals(45, pagina.total());
        assertEquals(3, pagina.totalPaginas());
    }

    @Test
    void consultarRechazaFiltrosInvalidos() throws Exception {
        AuditoriaService servicio = new AuditoriaService(mock(AuditoriaDAO.class), ejecutor());
        assertThrows(IllegalArgumentException.class, () -> servicio.consultar(null, null, "INVENTADA", null, 1, 20));
        assertThrows(IllegalArgumentException.class, () -> servicio.consultar(null, null, null, null, 0, 20));
        assertThrows(IllegalArgumentException.class, () -> servicio.consultar(null, null, null, null, 1, 101));
        assertThrows(IllegalArgumentException.class, () -> servicio.consultar("2026-02-10", "2026-01-01", null, null, 1, 20));
    }

    @Test
    void losComodinesDeBusquedaSeEscapan() throws Exception {
        java.lang.reflect.Method metodo = AuditoriaDAO.class.getDeclaredMethod("escaparLike", String.class);
        metodo.setAccessible(true);
        assertEquals("100\\%\\_a\\\\b", metodo.invoke(null, "100%_a\\b"));
    }

    // ---------- Puntos de registro

    @Test
    void elCambioDeRolSeRegistraEnLaMismaTransaccionConElRolAnteriorYElNuevo() throws Exception {
        UsuarioDAO usuarios = mock(UsuarioDAO.class);
        AuditoriaService auditoria = mock(AuditoriaService.class);
        Usuario vendedor = new Usuario(8L, "Vera", "vera@example.com", "VENDEDOR", true, OffsetDateTime.now());
        when(usuarios.bloquearActivo(conexion, 8L)).thenReturn(Optional.of(vendedor));
        when(usuarios.cambiarRol(conexion, 8L, "ALMACEN")).thenReturn(Optional.of(
                new Usuario(8L, "Vera", "vera@example.com", "ALMACEN", true, OffsetDateTime.now())));

        new UsuarioService(usuarios, mock(PasswordEncoder.class), ejecutor(), auditoria)
                .actualizarRol(8L, 1L, new ActualizarRolUsuario("ALMACEN"));

        ArgumentCaptor<EventoAuditoria> evento = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(auditoria).registrar(eq(conexion), evento.capture());
        assertEquals(AccionAuditoria.ROL_CAMBIADO, evento.getValue().accion());
        assertEquals(1L, evento.getValue().usuarioId());
        assertEquals("vera@example.com: VENDEDOR → ALMACEN", evento.getValue().detalle());
        verify(auditoria, never()).registrarAparte(any());
    }

    @Test
    void elCambioDePrecioGuardaElPrecioAnteriorYElNuevo() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        AuditoriaService auditoria = mock(AuditoriaService.class);
        Producto antes = new Producto(4L, "PA-0004", "Teclado", null, "Teclados", 1L, null,
                new BigDecimal("459"), null, 3, false, null, true);
        when(productos.buscarPorId(4L)).thenReturn(Optional.of(antes));
        when(productos.actualizarPrecio(4L, new BigDecimal("399.00"))).thenReturn(Optional.of(new Producto(4L,
                "PA-0004", "Teclado", null, "Teclados", 1L, null, new BigDecimal("399.00"), new BigDecimal("459"), 3,
                false, null, true)));

        new ProductoService(productos, mock(CategoriaDAO.class), mock(InventarioDAO.class), ejecutor(), auditoria)
                .actualizarPrecio(4L, new BigDecimal("399.00"), 7L);

        ArgumentCaptor<EventoAuditoria> evento = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(auditoria).registrarAparte(evento.capture());
        assertEquals(AccionAuditoria.PRECIO_CAMBIADO, evento.getValue().accion());
        assertEquals(7L, evento.getValue().usuarioId());
        assertEquals("Teclado (PA-0004): S/ 459.00 → S/ 399.00", evento.getValue().detalle());
    }

    @Test
    void unPrecioDeUnProductoInexistenteNoSeAudita() throws Exception {
        ProductoDAO productos = mock(ProductoDAO.class);
        AuditoriaService auditoria = mock(AuditoriaService.class);
        when(productos.actualizarPrecio(any(), any())).thenReturn(Optional.empty());

        new ProductoService(productos, mock(CategoriaDAO.class), mock(InventarioDAO.class), ejecutor(), auditoria)
                .actualizarPrecio(99L, BigDecimal.TEN, 7L);

        verify(auditoria, never()).registrarAparte(any());
    }

    @Test
    void elLoginRegistraFallosAciertosYBloqueos() {
        UsuarioService usuarios = mock(UsuarioService.class);
        AuditoriaService auditoria = mock(AuditoriaService.class);
        InicioSesion mala = new InicioSesion(" Ana@Example.com ", "ClaveIncorrecta");
        when(usuarios.autenticarCliente(mala)).thenReturn(Optional.empty());
        AuthController controller = new AuthController(usuarios, mock(SesionAutenticada.class),
                new LimitadorIntentosLogin(), auditoria);

        for (int i = 0; i < LimitadorIntentosLogin.MAX_FALLOS; i++) {
            controller.iniciarSesion(mala, new MockHttpServletRequest());
        }
        assertThrows(DemasiadosIntentosException.class, () -> controller.iniciarSesion(mala, new MockHttpServletRequest()));

        ArgumentCaptor<EventoAuditoria> eventos = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(auditoria, org.mockito.Mockito.times(LimitadorIntentosLogin.MAX_FALLOS + 1)).registrarAparte(eventos.capture());
        List<EventoAuditoria> lista = eventos.getAllValues();
        assertEquals(AccionAuditoria.INICIO_SESION_FALLIDO, lista.get(0).accion());
        assertEquals("ana@example.com", lista.get(0).usuarioCorreo(), "se guarda el correo intentado, normalizado");
        assertNull(lista.get(0).usuarioId());
        assertEquals(AccionAuditoria.INICIO_SESION_BLOQUEADO, lista.get(lista.size() - 1).accion());
    }

    @Test
    void unLoginCorrectoGuardaElActorConSuRol() {
        UsuarioService usuarios = mock(UsuarioService.class);
        AuditoriaService auditoria = mock(AuditoriaService.class);
        Usuario ana = new Usuario(5L, "Ana", "ana@example.com", "SOPORTE", true, OffsetDateTime.now());
        when(usuarios.autenticarCliente(any())).thenReturn(Optional.of(ana));

        new AuthController(usuarios, mock(SesionAutenticada.class), new LimitadorIntentosLogin(), auditoria)
                .iniciarSesion(new InicioSesion("ana@example.com", "ClaveSegura1"), new MockHttpServletRequest());

        ArgumentCaptor<EventoAuditoria> evento = ArgumentCaptor.forClass(EventoAuditoria.class);
        verify(auditoria).registrarAparte(evento.capture());
        assertEquals(AccionAuditoria.INICIO_SESION, evento.getValue().accion());
        assertEquals(5L, evento.getValue().usuarioId());
        assertEquals("SOPORTE", evento.getValue().rol());
        assertEquals("ana@example.com", evento.getValue().usuarioCorreo());
    }
}
