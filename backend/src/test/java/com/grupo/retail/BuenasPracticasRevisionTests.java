package com.grupo.retail;

import com.grupo.retail.service.AuditoriaService;
import com.grupo.retail.controller.AuthController;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dao.InventarioDAO;
import com.grupo.retail.dao.ProductoDAO;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.dto.InicioSesion;
import com.grupo.retail.exception.DemasiadosIntentosException;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Rol;
import com.grupo.retail.model.Usuario;
import com.grupo.retail.security.LimitadorIntentosLogin;
import com.grupo.retail.service.ProductoService;
import com.grupo.retail.service.SesionAutenticada;
import com.grupo.retail.service.UsuarioService;
import com.grupo.retail.transaccion.EjecutorTransaccion;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Arreglos rápidos de la revisión de buenas prácticas del backend (puntos 6, 7 y 9). */
class BuenasPracticasRevisionTests {

    private static final Usuario ANA = new Usuario(5L, "Ana", "ana@example.com", "CLIENTE", true, OffsetDateTime.now());
    private static final Usuario ANA_INACTIVA = new Usuario(5L, "Ana", "ana@example.com", "CLIENTE", false, OffsetDateTime.now());

    // ---------- Punto 6: el login siempre compara un hash

    @Test
    void conUnCorreoInexistenteIgualSeComparaUnHashParaNoRevelarloPorTiempo() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(dao.buscarPorCorreo("nadie@example.com")).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenReturn("$2a$10$senuelo");

        Optional<Usuario> resultado = new UsuarioService(dao, encoder, mock(EjecutorTransaccion.class), mock(AuditoriaService.class))
                .autenticarCliente(new InicioSesion("nadie@example.com", "ClaveSegura1"));

        assertTrue(resultado.isEmpty());
        verify(encoder).matches("ClaveSegura1", "$2a$10$senuelo");
    }

    @Test
    void elHashSenueloSeCalculaUnaSolaVez() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(dao.buscarPorCorreo(anyString())).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenReturn("$2a$10$senuelo");
        UsuarioService servicio = new UsuarioService(dao, encoder, mock(EjecutorTransaccion.class), mock(AuditoriaService.class));

        servicio.autenticarCliente(new InicioSesion("uno@example.com", "ClaveSegura1"));
        servicio.autenticarCliente(new InicioSesion("dos@example.com", "ClaveSegura1"));

        verify(encoder, times(1)).encode(anyString());
    }

    @Test
    void unaCuentaDesactivadaTambienComparaElHashYNoInicia() {
        UsuarioDAO dao = mock(UsuarioDAO.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(dao.buscarPorCorreo("ana@example.com")).thenReturn(Optional.of(new CredencialesUsuario(ANA_INACTIVA, "$hash")));
        when(encoder.matches("ClaveSegura1", "$hash")).thenReturn(true);

        Optional<Usuario> resultado = new UsuarioService(dao, encoder, mock(EjecutorTransaccion.class), mock(AuditoriaService.class))
                .autenticarCliente(new InicioSesion("ana@example.com", "ClaveSegura1"));

        assertTrue(resultado.isEmpty());
        verify(encoder).matches("ClaveSegura1", "$hash");
    }

    @Test
    void elLoginCuentaLosFallosYTrasCincoResponde429SinConsultarLaClave() {
        UsuarioService servicio = mock(UsuarioService.class);
        when(servicio.autenticarCliente(any())).thenReturn(Optional.empty());
        AuthController controller = new AuthController(servicio, mock(SesionAutenticada.class), new LimitadorIntentosLogin(), mock(AuditoriaService.class));
        InicioSesion datos = new InicioSesion("ana@example.com", "ClaveIncorrecta");

        for (int i = 0; i < LimitadorIntentosLogin.MAX_FALLOS; i++) {
            assertEquals(401, controller.iniciarSesion(datos, new MockHttpServletRequest()).getStatusCode().value());
        }

        assertThrows(DemasiadosIntentosException.class,
                () -> controller.iniciarSesion(datos, new MockHttpServletRequest()));
        verify(servicio, times(LimitadorIntentosLogin.MAX_FALLOS)).autenticarCliente(any());
    }

    @Test
    void unLoginCorrectoReiniciaLosFallos() {
        UsuarioService servicio = mock(UsuarioService.class);
        InicioSesion mala = new InicioSesion("ana@example.com", "ClaveIncorrecta");
        InicioSesion buena = new InicioSesion("ana@example.com", "ClaveSegura1");
        when(servicio.autenticarCliente(mala)).thenReturn(Optional.empty());
        when(servicio.autenticarCliente(buena)).thenReturn(Optional.of(ANA));
        AuthController controller = new AuthController(servicio, mock(SesionAutenticada.class), new LimitadorIntentosLogin(), mock(AuditoriaService.class));

        for (int i = 0; i < LimitadorIntentosLogin.MAX_FALLOS - 1; i++) {
            controller.iniciarSesion(mala, new MockHttpServletRequest());
        }
        assertEquals(200, controller.iniciarSesion(buena, new MockHttpServletRequest()).getStatusCode().value());
        for (int i = 0; i < LimitadorIntentosLogin.MAX_FALLOS - 1; i++) {
            assertEquals(401, controller.iniciarSesion(mala, new MockHttpServletRequest()).getStatusCode().value());
        }
    }

    // ---------- Punto 7: la validación de precios vive en el servicio

    @Test
    void unRangoDePreciosInvertidoSeRechazaSinConsultarLaBase() {
        ProductoDAO dao = mock(ProductoDAO.class);
        ProductoService servicio = new ProductoService(dao, mock(CategoriaDAO.class), mock(InventarioDAO.class), mock(EjecutorTransaccion.class), mock(AuditoriaService.class));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> servicio.listarProductos(null, null, new BigDecimal("100"), new BigDecimal("50")));

        assertEquals("El precio mínimo no puede superar al máximo", error.getMessage());
        verify(dao, never()).listarTodos(any(), any(), any(), any());
    }

    @Test
    void unRangoDePreciosValidoConsultaLaBase() {
        ProductoDAO dao = mock(ProductoDAO.class);
        new ProductoService(dao, mock(CategoriaDAO.class), mock(InventarioDAO.class), mock(EjecutorTransaccion.class), mock(AuditoriaService.class))
                .listarProductos("mouse", null, new BigDecimal("50"), new BigDecimal("50"));
        verify(dao).listarTodos(eq("mouse"), eq(null), eq(new BigDecimal("50")), eq(new BigDecimal("50")));
    }

    // ---------- Punto 9: enum Rol en lugar de textos repetidos

    @Test
    void rolReconoceSoloLosTextosValidos() {
        assertEquals(Optional.of(Rol.ALMACEN), Rol.desde("ALMACEN"));
        assertTrue(Rol.desde("almacen").isEmpty(), "los roles se guardan en mayúsculas");
        assertTrue(Rol.desde(null).isEmpty());
        assertTrue(Rol.desde("SUPERUSUARIO").isEmpty());
        assertTrue(Rol.ADMIN.es("ADMIN"));
    }
}
