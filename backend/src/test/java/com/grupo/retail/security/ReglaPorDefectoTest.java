package com.grupo.retail.security;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import com.grupo.retail.dao.UsuarioDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.oneOf;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Reglas por defecto de la cadena de seguridad (constitución, principio II):
 * - Toda ruta /api que no esté declarada en SecurityConfig se deniega, aunque haya sesión.
 *   Así una ruta nueva (por ejemplo /api/soporte/**) no queda abierta a cualquier rol
 *   si se olvida declararla.
 * - Los archivos estáticos de la SPA (servidos por Spring Boot en el despliegue Docker)
 *   son públicos: un visitante sin sesión debe poder cargar la página.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ReglaPorDefectoTest extends BaseIntegracionPostgres {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @BeforeEach
    void setup() {
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
    }

    private MockHttpServletRequestBuilder conRol(MockHttpServletRequestBuilder peticion, String rol) {
        return peticion
                .with(csrf())
                .with(user("test-" + rol.toLowerCase()).roles(rol))
                .sessionAttr("usuarioId", 1L)
                .sessionAttr("usuarioRol", rol);
    }

    @ParameterizedTest(name = "{0} con sesión CLIENTE -> 403")
    @ValueSource(strings = {"/api/soporte/reclamos", "/api/ruta-no-declarada"})
    @DisplayName("Una ruta /api no declarada se deniega aunque el usuario esté autenticado")
    void rutaApiNoDeclaradaSeDeniegaConSesion(String ruta) throws Exception {
        mockMvc.perform(conRol(get(ruta), "CLIENTE")).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "{0} sin sesión -> 401")
    @ValueSource(strings = {"/api/soporte/reclamos", "/api/ruta-no-declarada"})
    @DisplayName("Una ruta /api no declarada responde 401 a un visitante")
    void rutaApiNoDeclaradaSinSesion(String ruta) throws Exception {
        mockMvc.perform(get(ruta)).andExpect(status().isUnauthorized());
    }

    @ParameterizedTest(name = "{0} {1} con sesión CLIENTE -> 403")
    @org.junit.jupiter.params.provider.CsvSource({"PUT,/api/productos/1", "DELETE,/api/productos/1"})
    @DisplayName("Un cliente no puede editar ni borrar productos por rutas no declaradas")
    void edicionDeProductoNoDeclaradaSeDeniega(String metodo, String ruta) throws Exception {
        MockHttpServletRequestBuilder peticion = "PUT".equals(metodo) ? put(ruta) : delete(ruta);
        mockMvc.perform(conRol(peticion, "CLIENTE")).andExpect(status().isForbidden());
    }

    @ParameterizedTest(name = "GET {0} sin sesión no exige autenticación")
    @ValueSource(strings = {"/", "/index.html", "/login.html", "/assets/app.js"})
    @DisplayName("Los archivos estáticos de la SPA son públicos")
    void recursosEstaticosSonPublicos(String ruta) throws Exception {
        mockMvc.perform(get(ruta)).andExpect(status().is(not(oneOf(401, 403))));
    }
}
