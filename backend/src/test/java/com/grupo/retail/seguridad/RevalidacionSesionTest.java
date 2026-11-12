package com.grupo.retail.seguridad;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import com.grupo.retail.dao.UsuarioDAO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class RevalidacionSesionTest extends BaseIntegracionPostgres {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @Test
    @DisplayName("T011: Cuenta desactivada en BD retorna 401 e invalida la sesión HTTP")
    void cuentaDesactivadaRetorna401EInvalidaSesion() throws Exception {
        when(usuarioDAO.sesionSigueVigente(42L, "CLIENTE")).thenReturn(false);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("usuarioId", 42L);
        session.setAttribute("usuarioRol", "CLIENTE");

        mockMvc.perform(get("/api/carrito")
                        .session(session)
                        .with(user("cliente@test.com").roles("CLIENTE")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());

        assertTrue(session.isInvalid());
        verify(usuarioDAO).sesionSigueVigente(42L, "CLIENTE");
    }

    @Test
    @DisplayName("T013: Cambio de rol en BD retorna 401 e invalida la sesión HTTP")
    void cambioDeRolRetorna401EInvalidaSesion() throws Exception {
        when(usuarioDAO.sesionSigueVigente(10L, "ADMIN")).thenReturn(false);

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("usuarioId", 10L);
        session.setAttribute("usuarioRol", "ADMIN");

        mockMvc.perform(get("/api/admin/usuarios")
                        .session(session)
                        .with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").exists());

        assertTrue(session.isInvalid());
        verify(usuarioDAO).sesionSigueVigente(10L, "ADMIN");
    }

    @Test
    @DisplayName("Cuenta activa y rol coincidente permite continuar la petición")
    void cuentaActivaPermiteAcceso() throws Exception {
        when(usuarioDAO.sesionSigueVigente(10L, "ADMIN")).thenReturn(true);
        when(usuarioDAO.listarUsuarios()).thenReturn(java.util.List.of());

        MockHttpSession session = new MockHttpSession();
        session.setAttribute("usuarioId", 10L);
        session.setAttribute("usuarioRol", "ADMIN");

        mockMvc.perform(get("/api/admin/usuarios")
                        .session(session)
                        .with(user("admin@test.com").roles("ADMIN")))
                .andExpect(status().isOk());

        assertFalse(session.isInvalid());
    }

    @Test
    @DisplayName("Petición anónima no consulta vigencia en base de datos")
    void peticionAnonimaNoConsultaVigencia() throws Exception {
        mockMvc.perform(get("/api/productos"))
                .andExpect(status().isOk());

        verify(usuarioDAO, never()).sesionSigueVigente(anyLong(), anyString());
    }
}
