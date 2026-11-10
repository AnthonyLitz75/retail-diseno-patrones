package com.grupo.retail.seguridad;

import com.grupo.retail.dao.UsuarioDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CsrfTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @BeforeEach
    void setup() {
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
    }

    static Stream<Arguments> mutacionesSinToken() {
        return Stream.of(
                // Rutas públicas (login, registro)
                Arguments.of("POST", "/api/auth/login", "{\"correo\":\"admin@test.com\",\"clave\":\"Admin123*\"}", "ANONIMO", ""),
                Arguments.of("POST", "/api/auth/registro", "{\"nombre\":\"Test\",\"correo\":\"nuevo@test.com\",\"clave\":\"Clave123*\"}", "ANONIMO", ""),

                // Rutas de administración
                Arguments.of("POST", "/api/admin/usuarios", "{\"nombre\":\"Admin\",\"correo\":\"a@t.com\",\"clave\":\"C123*\",\"rol\":\"ALMACEN\"}", "ADMIN", "ROLE_ADMIN"),
                Arguments.of("PATCH", "/api/admin/usuarios/1/rol", "{\"rol\":\"VENDEDOR\"}", "ADMIN", "ROLE_ADMIN"),
                Arguments.of("PUT", "/api/admin/usuarios/1/desactivar", "{}", "ADMIN", "ROLE_ADMIN"),
                Arguments.of("POST", "/api/admin/categorias", "{\"nombre\":\"Nueva Cat\"}", "ADMIN", "ROLE_ADMIN"),

                // Rutas de inventario y pedidos operativos
                Arguments.of("POST", "/api/inventario/entradas", "{\"motivo\":\"Lote\",\"items\":[{\"productoId\":1,\"cantidad\":10}]}", "ALMACEN", "ROLE_ALMACEN"),
                Arguments.of("PUT", "/api/pedidos/1/preparar", "{}", "ALMACEN", "ROLE_ALMACEN"),
                Arguments.of("PUT", "/api/pedidos/1/despachar", "{\"transportista\":\"Olva\",\"codigoSeguimiento\":\"OLV-1\"}", "ALMACEN", "ROLE_ALMACEN"),
                Arguments.of("PUT", "/api/pedidos/1/entregar", "{}", "ALMACEN", "ROLE_ALMACEN"),

                // Rutas de productos y precios
                Arguments.of("POST", "/api/productos", "{\"nombre\":\"P\",\"descripcion\":\"D\",\"precio\":10.0,\"stock\":5,\"categoriaId\":1}", "VENDEDOR", "ROLE_VENDEDOR"),
                Arguments.of("PUT", "/api/productos/1/precio", "{\"precio\":20.0}", "VENDEDOR", "ROLE_VENDEDOR"),
                Arguments.of("PUT", "/api/productos/1/stock", "{\"stock\":15}", "ALMACEN", "ROLE_ALMACEN"),

                // Rutas de cliente
                Arguments.of("POST", "/api/carrito/productos", "{\"productoId\":1,\"cantidad\":2}", "CLIENTE", "ROLE_CLIENTE"),
                Arguments.of("PUT", "/api/carrito/productos/1", "{\"cantidad\":3}", "CLIENTE", "ROLE_CLIENTE"),
                Arguments.of("DELETE", "/api/carrito/productos/1", "", "CLIENTE", "ROLE_CLIENTE"),
                Arguments.of("POST", "/api/pedidos/confirmar", "{\"claveConfirmacion\":\"123e4567-e89b-12d3-a456-426614174000\",\"destinatario\":\"Juan\",\"direccionEnvio\":\"Av 1\"}", "CLIENTE", "ROLE_CLIENTE"),
                Arguments.of("PUT", "/api/pedidos/1/cancelar", "{}", "CLIENTE", "ROLE_CLIENTE"),
                Arguments.of("POST", "/api/productos/1/preguntas", "{\"pregunta\":\"¿Tiene stock?\"}", "CLIENTE", "ROLE_CLIENTE")
        );
    }

    @ParameterizedTest(name = "T014: {0} {1} sin CSRF token debe retornar 403 Forbidden")
    @MethodSource("mutacionesSinToken")
    void mutacionSinCsrfTokenEsRechazadaCon403(String metodo, String url, String cuerpo, String rol, String authority) throws Exception {
        MockHttpServletRequestBuilder requestBuilder = switch (metodo) {
            case "POST" -> post(url);
            case "PUT" -> put(url);
            case "PATCH" -> patch(url);
            case "DELETE" -> delete(url);
            default -> throw new IllegalArgumentException("Método no soportado: " + metodo);
        };

        requestBuilder.contentType(MediaType.APPLICATION_JSON);
        if (!cuerpo.isBlank()) {
            requestBuilder.content(cuerpo);
        }

        if (!"ANONIMO".equals(rol)) {
            MockHttpSession session = new MockHttpSession();
            session.setAttribute("usuarioId", 1L);
            session.setAttribute("usuarioRol", rol);
            requestBuilder.session(session);
            requestBuilder.with(user("test@retail.com").authorities(() -> authority));
        }

        // Intencionalmente NO se añade csrf() a la petición
        mockMvc.perform(requestBuilder)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("T016: GET /api/auth/csrf expone token y cabecera esperada")
    void endpointCsrfRetornaTokenYCabecera() throws Exception {
        mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.cabecera").value("X-XSRF-TOKEN"));
    }

    @Test
    @DisplayName("Mutación con token CSRF válido no es bloqueada por CSRF")
    void mutacionConCsrfValidoPermitida() throws Exception {
        when(usuarioDAO.desactivar(2L)).thenReturn(true);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("usuarioId", 1L);
        session.setAttribute("usuarioRol", "ADMIN");

        mockMvc.perform(put("/api/admin/usuarios/2/desactivar")
                        .session(session)
                        .with(user("admin@test.com").roles("ADMIN"))
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNoContent());
    }
}
