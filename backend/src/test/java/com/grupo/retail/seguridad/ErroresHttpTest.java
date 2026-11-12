package com.grupo.retail.seguridad;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import com.grupo.retail.dao.UsuarioDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Contrato de API (constitución, principio VII): los errores propios de Spring MVC
 * conservan su código HTTP (404, 405) con el cuerpo {"error": "..."}, en lugar de
 * convertirse en 500 dentro del manejador global.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ErroresHttpTest extends BaseIntegracionPostgres {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @BeforeEach
    void setup() {
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
    }

    @Test
    @DisplayName("Un archivo estático inexistente responde 404 con cuerpo de error")
    void recursoInexistenteResponde404() throws Exception {
        mockMvc.perform(get("/no-existe.html"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Recurso no encontrado"));
    }

    @Test
    @DisplayName("Un método HTTP no soportado en una ruta existente responde 405 con cabecera Allow")
    void metodoNoSoportadoResponde405() throws Exception {
        mockMvc.perform(get("/api/pedidos/1/preparar")
                        .with(user("test-admin").roles("ADMIN"))
                        .sessionAttr("usuarioId", 1L)
                        .sessionAttr("usuarioRol", "ADMIN"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().exists("Allow"))
                .andExpect(jsonPath("$.error").value("Método HTTP no permitido para esta ruta"));
    }
}
