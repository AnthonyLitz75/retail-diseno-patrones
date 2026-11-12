package com.grupo.retail.seguridad;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import com.grupo.retail.dao.UsuarioDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ManejadorErroresSeguridadTest extends BaseIntegracionPostgres {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @BeforeEach
    void setup() {
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
    }

    @Test
    @DisplayName("T019: Petición no autenticada a ruta protegida retorna 401 con JSON {'error': 'Sesión requerida'}")
    void noAutenticadoRetornaJson401() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Sesión requerida"));
    }

    @Test
    @DisplayName("T019: Acceso denegado por rol retorna 403 con JSON {'error': 'Acceso denegado'}")
    void accesoDenegadoPorRolRetornaJson403() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("usuarioId", 5L);
        session.setAttribute("usuarioRol", "CLIENTE");

        mockMvc.perform(get("/api/admin/usuarios")
                        .session(session)
                        .with(user("cliente@test.com").roles("CLIENTE")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Acceso denegado"));
    }

    @Test
    @DisplayName("T019: Mutación sin token CSRF retorna 403 con JSON {'error': 'Token de seguridad inválido'}")
    void mutacionSinCsrfRetornaJson403() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("usuarioId", 1L);
        session.setAttribute("usuarioRol", "ADMIN");

        mockMvc.perform(post("/api/admin/usuarios")
                        .session(session)
                        .with(user("admin@test.com").roles("ADMIN"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"A\",\"correo\":\"a@t.com\",\"clave\":\"C123*\",\"rol\":\"ALMACEN\"}"))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.error").value("Token de seguridad inválido"));
    }
}
