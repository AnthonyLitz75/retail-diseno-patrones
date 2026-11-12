package com.grupo.retail.seguridad;

import com.grupo.retail.integracion.BaseIntegracionPostgres;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import com.grupo.retail.dao.UsuarioDAO;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.oneOf;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class MatrizAccesoTest extends BaseIntegracionPostgres {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UsuarioDAO usuarioDAO;

    @BeforeEach
    void setup() {
        when(usuarioDAO.sesionSigueVigente(anyLong(), anyString())).thenReturn(true);
    }

    public enum Expectativa {
        PERMITIDO,
        UNAUTHORIZED_401,
        FORBIDDEN_403
    }

    public record EscenarioAcceso(
            String metodo,
            String ruta,
            String rol,
            Expectativa expectativa,
            String payload) {

        @Override
        public String toString() {
            String etiquetaRol = rol == null ? "VISITANTE" : rol;
            return metodo + " " + ruta + " con rol " + etiquetaRol + " -> " + expectativa;
        }
    }

    @ParameterizedTest(name = "{index}: {0}")
    @MethodSource("proveerEscenariosMatriz")
    @DisplayName("Validar matriz de autorización declarativa por ruta y rol")
    void evaluarMatrizAcceso(EscenarioAcceso escenario) throws Exception {
        MockHttpServletRequestBuilder peticion = switch (escenario.metodo()) {
            case "GET" -> get(escenario.ruta());
            case "POST" -> post(escenario.ruta());
            case "PUT" -> put(escenario.ruta());
            case "PATCH" -> patch(escenario.ruta());
            case "DELETE" -> delete(escenario.ruta());
            default -> throw new IllegalArgumentException("Método HTTP no soportado: " + escenario.metodo());
        };

        peticion.contentType(MediaType.APPLICATION_JSON);
        if (escenario.payload() != null) {
            peticion.content(escenario.payload());
        }

        // Se adjunta CSRF para evaluar exclusivamente la regla de autorización por rol
        peticion.with(csrf());

        if (escenario.rol() != null) {
            peticion.with(user("test-" + escenario.rol().toLowerCase()).roles(escenario.rol()));
            peticion.sessionAttr("usuarioId", 1L);
            peticion.sessionAttr("usuarioNombre", "Usuario Test");
            peticion.sessionAttr("usuarioCorreo", "test@pixelandino.pe");
            peticion.sessionAttr("usuarioRol", escenario.rol());
        }

        ResultActions resultado = mockMvc.perform(peticion);

        switch (escenario.expectativa()) {
            case UNAUTHORIZED_401 -> resultado.andExpect(status().isUnauthorized());
            case FORBIDDEN_403 -> resultado.andExpect(status().isForbidden());
            case PERMITIDO -> resultado.andExpect(status().is(not(oneOf(401, 403))));
        }
    }

    private static final List<String> TODOS_LOS_ROLES = List.of("CLIENTE", "VENDEDOR", "ALMACEN", "ADMIN", "SOPORTE");

    private static record DefinicionRuta(
            String metodo,
            String ruta,
            boolean esPublica,
            boolean requiereSoloAutenticacion,
            Set<String> rolesPermitidos,
            String payloadDummy) {}

    static Stream<EscenarioAcceso> proveerEscenariosMatriz() {
        List<DefinicionRuta> rutas = List.of(
                // 1. Rutas Públicas
                new DefinicionRuta("GET", "/api/categorias", true, false, Set.of(), null),
                new DefinicionRuta("GET", "/api/productos", true, false, Set.of(), null),
                new DefinicionRuta("POST", "/api/auth/login", true, false, Set.of(), "{}"),
                new DefinicionRuta("POST", "/api/auth/registro", true, false, Set.of(), "{}"),

                // 2. Rutas que requieren solo autenticación
                new DefinicionRuta("GET", "/api/auth/sesion", false, true, Set.of(), null),
                new DefinicionRuta("POST", "/api/auth/logout", false, true, Set.of(), null),
                new DefinicionRuta("GET", "/api/notificaciones/mias", false, true, Set.of(), null),
                new DefinicionRuta("PATCH", "/api/notificaciones/1/leida", false, true, Set.of(), null),

                // 3. Rutas exclusivas de CLIENTE
                new DefinicionRuta("GET", "/api/carrito", false, false, Set.of("CLIENTE"), null),
                new DefinicionRuta("POST", "/api/carrito/productos", false, false, Set.of("CLIENTE"), "{}"),
                new DefinicionRuta("POST", "/api/carrito/deshacer", false, false, Set.of("CLIENTE"), null),
                new DefinicionRuta("GET", "/api/pedidos/mis-pedidos", false, false, Set.of("CLIENTE"), null),
                new DefinicionRuta("POST", "/api/pedidos/confirmar", false, false, Set.of("CLIENTE"), "{}"),
                new DefinicionRuta("POST", "/api/productos/1/preguntas", false, false, Set.of("CLIENTE"), "{}"),
                new DefinicionRuta("GET", "/api/preguntas/mis-preguntas", false, false, Set.of("CLIENTE"), null),

                // 4. Rutas operativas de ALMACEN y ADMIN
                new DefinicionRuta("GET", "/api/pedidos/operativos", false, false, Set.of("ADMIN", "ALMACEN"), null),
                new DefinicionRuta("PUT", "/api/pedidos/1/preparar", false, false, Set.of("ADMIN", "ALMACEN"), null),
                new DefinicionRuta("PUT", "/api/pedidos/1/despachar", false, false, Set.of("ADMIN", "ALMACEN"), "{}"),
                new DefinicionRuta("PUT", "/api/pedidos/1/entregar", false, false, Set.of("ADMIN", "ALMACEN"), null),
                new DefinicionRuta("POST", "/api/inventario/entradas", false, false, Set.of("ADMIN", "ALMACEN"), "{}"),

                // 5. Rutas de ADMIN, VENDEDOR y ALMACEN
                new DefinicionRuta("GET", "/api/pedidos/pendientes", false, false, Set.of("ADMIN", "VENDEDOR", "ALMACEN"), null),
                new DefinicionRuta("GET", "/api/inventario/movimientos", false, false, Set.of("ADMIN", "VENDEDOR", "ALMACEN"), null),
                new DefinicionRuta("GET", "/api/productos/1/movimientos", false, false, Set.of("ADMIN", "VENDEDOR", "ALMACEN"), null),
                new DefinicionRuta("PUT", "/api/productos/1/stock", false, false, Set.of("ADMIN", "VENDEDOR", "ALMACEN"), "{}"),

                // 6. Rutas de ADMIN y VENDEDOR (Catálogo y Precio)
                new DefinicionRuta("POST", "/api/productos", false, false, Set.of("ADMIN", "VENDEDOR"), "{}"),
                new DefinicionRuta("PUT", "/api/productos/1/precio", false, false, Set.of("ADMIN", "VENDEDOR"), "{}"),
                new DefinicionRuta("GET", "/api/productos/gestion", false, false, Set.of("ADMIN", "VENDEDOR"), null),
                new DefinicionRuta("PUT", "/api/productos/1", false, false, Set.of("ADMIN", "VENDEDOR"), "{}"),
                new DefinicionRuta("PATCH", "/api/productos/1/estado", false, false, Set.of("ADMIN", "VENDEDOR"), "{}"),

                // 7. Cancelación de Pedidos (CLIENTE, VENDEDOR, ADMIN)
                new DefinicionRuta("PUT", "/api/pedidos/1/cancelar", false, false, Set.of("CLIENTE", "VENDEDOR", "ADMIN"), null),

                // 8. Consultas de Vendedor (VENDEDOR exclusivo)
                new DefinicionRuta("GET", "/api/vendedor/preguntas", false, false, Set.of("VENDEDOR"), null),
                new DefinicionRuta("POST", "/api/vendedor/preguntas/1/responder", false, false, Set.of("VENDEDOR"), "{}"),

                // 9. Módulo de Administración (ADMIN exclusivo)
                new DefinicionRuta("GET", "/api/admin/usuarios", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("POST", "/api/admin/usuarios", false, false, Set.of("ADMIN"), "{}"),
                new DefinicionRuta("PATCH", "/api/admin/usuarios/1/rol", false, false, Set.of("ADMIN"), "{}"),
                new DefinicionRuta("PUT", "/api/admin/usuarios/1/desactivar", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("GET", "/api/admin/categorias", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("POST", "/api/admin/categorias", false, false, Set.of("ADMIN"), "{}"),
                new DefinicionRuta("PUT", "/api/admin/categorias/1", false, false, Set.of("ADMIN"), "{}"),
                new DefinicionRuta("PATCH", "/api/admin/categorias/1/estado", false, false, Set.of("ADMIN"), "{}"),
                new DefinicionRuta("GET", "/api/admin/reportes/resumen", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("GET", "/api/admin/reportes/ventas.csv", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("GET", "/api/admin/reportes/inventario.csv", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("GET", "/api/admin/reportes/movimientos.csv", false, false, Set.of("ADMIN"), null),

                // 10. Atención y soporte (spec 006)
                new DefinicionRuta("POST", "/api/pedidos/1/reclamos", false, false, Set.of("CLIENTE"), "{}"),
                new DefinicionRuta("GET", "/api/reclamos/mis-reclamos", false, false, Set.of("CLIENTE"), null),
                new DefinicionRuta("GET", "/api/soporte/reclamos", false, false, Set.of("SOPORTE", "ADMIN"), null),
                new DefinicionRuta("PUT", "/api/soporte/reclamos/1/tomar", false, false, Set.of("SOPORTE"), null),
                new DefinicionRuta("PUT", "/api/soporte/reclamos/1/responder", false, false, Set.of("SOPORTE"), "{}"),
                new DefinicionRuta("PUT", "/api/soporte/reclamos/1/escalar", false, false, Set.of("SOPORTE"), "{}"),
                new DefinicionRuta("POST", "/api/pedidos/1/devoluciones", false, false, Set.of("CLIENTE"), "{}"),
                new DefinicionRuta("GET", "/api/devoluciones/mis-devoluciones", false, false, Set.of("CLIENTE"), null),
                new DefinicionRuta("GET", "/api/soporte/devoluciones", false, false, Set.of("SOPORTE", "ADMIN"), null),
                new DefinicionRuta("PUT", "/api/soporte/devoluciones/1/decision", false, false, Set.of("SOPORTE"), "{}"),
                new DefinicionRuta("PUT", "/api/soporte/devoluciones/1/recepcion", false, false, Set.of("SOPORTE"), "{}"),
                new DefinicionRuta("GET", "/api/soporte/pedidos/1", false, false, Set.of("SOPORTE"), null),
                new DefinicionRuta("GET", "/api/admin/incidencias", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("GET", "/api/admin/incidencias/sin-agente", false, false, Set.of("ADMIN"), null),
                new DefinicionRuta("PUT", "/api/admin/incidencias/1/reasignar", false, false, Set.of("ADMIN"), "{}"),
                new DefinicionRuta("PUT", "/api/admin/incidencias/1/resolver", false, false, Set.of("ADMIN"), "{}")
        );

        List<EscenarioAcceso> escenarios = new ArrayList<>();

        for (DefinicionRuta r : rutas) {
            // Caso VISITANTE (sin autenticación, rol = null)
            if (r.esPublica()) {
                escenarios.add(new EscenarioAcceso(r.metodo(), r.ruta(), null, Expectativa.PERMITIDO, r.payloadDummy()));
            } else {
                escenarios.add(new EscenarioAcceso(r.metodo(), r.ruta(), null, Expectativa.UNAUTHORIZED_401, r.payloadDummy()));
            }

            // Casos con cada uno de los roles autenticados
            for (String rol : TODOS_LOS_ROLES) {
                Expectativa exp;
                if (r.esPublica() || r.requiereSoloAutenticacion()) {
                    exp = Expectativa.PERMITIDO;
                } else if (r.rolesPermitidos().contains(rol)) {
                    exp = Expectativa.PERMITIDO;
                } else {
                    exp = Expectativa.FORBIDDEN_403;
                }
                escenarios.add(new EscenarioAcceso(r.metodo(), r.ruta(), rol, exp, r.payloadDummy()));
            }
        }

        return escenarios.stream();
    }
}
