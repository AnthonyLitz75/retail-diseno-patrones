package com.grupo.retail.seguridad;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.env.Environment;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class ConfiguracionSeguridadCookieTest extends BaseIntegracionPostgres {

    @Autowired
    private Environment environment;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("T022: La cookie de sesión tiene configurado HttpOnly=true y SameSite=lax")
    void cookieDeSesionTieneHttpOnlyYSameSiteLax() {
        assertEquals("true", environment.getProperty("server.servlet.session.cookie.http-only"));
        assertEquals("lax", environment.getProperty("server.servlet.session.cookie.same-site"));
        assertEquals("false", environment.getProperty("server.servlet.session.cookie.secure"));
    }

    @Test
    @DisplayName("T022: Spring Security incluye cabeceras de protección HTTP estándares")
    void cabecerasDeSeguridadHttpPresentes() throws Exception {
        mockMvc.perform(get("/api/hello"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Cache-Control"));
    }
}
