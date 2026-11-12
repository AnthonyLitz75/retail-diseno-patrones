package com.grupo.retail.seguridad;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.model.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class RegistroClienteRolTest extends BaseIntegracionPostgres {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @Test
    @DisplayName("T020: POST /api/auth/registro ignora cualquier rol malicioso inyectado y asigna CLIENTE")
    void registroIgnoraRolDelCuerpoYAsignaCliente() throws Exception {
        Usuario usuarioCreado = new Usuario(99L, "Carlos", "carlos@test.com", "CLIENTE", true, OffsetDateTime.now());
        when(usuarioDAO.registrar(eq("Carlos"), eq("carlos@test.com"), anyString())).thenReturn(usuarioCreado);

        String jsonConRolInyectado = """
                {
                    "nombre": "Carlos",
                    "correo": "carlos@test.com",
                    "clave": "Segura123*",
                    "rol": "ADMIN"
                }
                """;

        mockMvc.perform(post("/api/auth/registro")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonConRolInyectado))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(99))
                .andExpect(jsonPath("$.rol").value("CLIENTE"));

        verify(usuarioDAO).registrar(eq("Carlos"), eq("carlos@test.com"), anyString());
    }
}
