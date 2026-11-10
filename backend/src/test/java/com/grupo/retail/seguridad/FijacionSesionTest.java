package com.grupo.retail.seguridad;

import com.grupo.retail.dao.UsuarioDAO;
import com.grupo.retail.model.CredencialesUsuario;
import com.grupo.retail.model.Usuario;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class FijacionSesionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @Test
    @DisplayName("T021: Login previene fijación de sesión invalidando la sesión previa y creando una nueva")
    void loginInvalidaSesionPreviaYGeneraNueva() throws Exception {
        String clavePlana = "Cliente123*";
        String claveHash = passwordEncoder.encode(clavePlana);

        Usuario usuario = new Usuario(50L, "Laura", "laura@test.com", "CLIENTE", true, OffsetDateTime.now());
        CredencialesUsuario credenciales = new CredencialesUsuario(usuario, claveHash);

        when(usuarioDAO.buscarPorCorreo("laura@test.com")).thenReturn(Optional.of(credenciales));

        MockHttpSession sesionPrevia = new MockHttpSession();
        String idSesionPrevia = sesionPrevia.getId();

        String payload = """
                {
                    "correo": "laura@test.com",
                    "clave": "Cliente123*"
                }
                """;

        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                        .session(sesionPrevia)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andReturn();

        assertTrue(sesionPrevia.isInvalid(), "La sesión previa debe ser invalidada");
        HttpSession nuevaSesion = resultado.getRequest().getSession(false);
        assertNotEquals(idSesionPrevia, nuevaSesion.getId(), "El ID de sesión debe cambiar tras el inicio de sesión");
    }
}
