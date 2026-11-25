package com.grupo.retail.config;

import com.grupo.retail.security.FiltroRevalidacionSesion;
import com.grupo.retail.security.ManejadorErrores;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final FiltroRevalidacionSesion filtroRevalidacionSesion;
    private final ManejadorErrores manejadorErrores;

    public SecurityConfig(FiltroRevalidacionSesion filtroRevalidacionSesion, ManejadorErrores manejadorErrores) {
        this.filtroRevalidacionSesion = filtroRevalidacionSesion;
        this.manejadorErrores = manejadorErrores;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        HttpSessionCsrfTokenRepository csrfTokenRepository = new HttpSessionCsrfTokenRepository();
        csrfTokenRepository.setHeaderName("X-XSRF-TOKEN");

        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName(null);

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        .csrfTokenRequestHandler(requestHandler)
                )
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .addFilterBefore(filtroRevalidacionSesion, AuthorizationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(manejadorErrores)
                        .accessDeniedHandler(manejadorErrores)
                )
                .authorizeHttpRequests(this::configurarAutorizacion);

        return http.build();
    }

    private void configurarAutorizacion(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
        configurarRutasPublicasYPersonal(auth);
        configurarRutasClienteSoporteYAutenticado(auth);
        // 10. Denegación por defecto: toda ruta /api nueva debe declararse aquí y en MatrizAccesoTest.
        auth.requestMatchers("/api/**").denyAll()
                // 11. Archivos estáticos de la SPA (despliegue Docker).
                .anyRequest().permitAll();
    }

    private static void configurarRutasPublicasYPersonal(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
        // 1. Rutas públicas de catálogo, auth y bienvenida
        auth.requestMatchers(HttpMethod.GET,
                        "/api/hello", "/api/categorias", "/api/categorias/**",
                        "/api/productos", "/api/productos/{id:[0-9]+}", "/api/auth/csrf")
                .permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/registro")
                .permitAll()
                // 2-3. Administración (ADMIN) y Consultas de Vendedor (VENDEDOR)
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/vendedor/**").hasRole("VENDEDOR")
                // 4. Operaciones de Almacén y Logística (ADMIN y ALMACEN)
                .requestMatchers(
                        "/api/pedidos/operativos", "/api/pedidos/{id:[0-9]+}/preparar",
                        "/api/pedidos/{id:[0-9]+}/despachar", "/api/pedidos/{id:[0-9]+}/entregar",
                        "/api/inventario/entradas")
                .hasAnyRole("ADMIN", "ALMACEN")
                // 5. Gestión de Catálogo y Precios (ADMIN y VENDEDOR; RF16 spec 007)
                .requestMatchers(HttpMethod.POST, "/api/productos").hasAnyRole("ADMIN", "VENDEDOR")
                .requestMatchers(HttpMethod.PUT, "/api/productos/{id:[0-9]+}/precio").hasAnyRole("ADMIN", "VENDEDOR")
                .requestMatchers(HttpMethod.GET, "/api/productos/gestion").hasAnyRole("ADMIN", "VENDEDOR")
                .requestMatchers(HttpMethod.PUT, "/api/productos/{id:[0-9]+}").hasAnyRole("ADMIN", "VENDEDOR")
                .requestMatchers(HttpMethod.PATCH, "/api/productos/{id:[0-9]+}/estado").hasAnyRole("ADMIN", "VENDEDOR")
                // 6. Inventario y Pedidos Pendientes (ADMIN, VENDEDOR y ALMACEN)
                .requestMatchers("/api/pedidos/pendientes", "/api/inventario/movimientos", "/api/productos/{id:[0-9]+}/movimientos")
                .hasAnyRole("ADMIN", "VENDEDOR", "ALMACEN")
                .requestMatchers(HttpMethod.PUT, "/api/productos/{id:[0-9]+}/stock")
                .hasAnyRole("ADMIN", "VENDEDOR", "ALMACEN")
                // 7. Cancelación de Pedidos (CLIENTE, VENDEDOR y ADMIN)
                .requestMatchers(HttpMethod.PUT, "/api/pedidos/{id:[0-9]+}/cancelar")
                .hasAnyRole("CLIENTE", "VENDEDOR", "ADMIN");
    }

    private static void configurarRutasClienteSoporteYAutenticado(
            AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry auth) {
        // 8. Rutas exclusivas de CLIENTE (incluye atención spec 006)
        auth.requestMatchers(
                        "/api/carrito", "/api/carrito/**", "/api/pedidos/mis-pedidos",
                        "/api/pedidos/confirmar", "/api/preguntas/mis-preguntas", "/api/productos/{id:[0-9]+}/preguntas")
                .hasRole("CLIENTE")
                .requestMatchers(HttpMethod.GET, "/api/pedidos/{id:[0-9]+}").hasRole("CLIENTE")
                .requestMatchers(HttpMethod.POST, "/api/pedidos/{id:[0-9]+}/reclamos").hasRole("CLIENTE")
                .requestMatchers(HttpMethod.GET, "/api/reclamos/mis-reclamos").hasRole("CLIENTE")
                .requestMatchers(HttpMethod.POST, "/api/pedidos/{id:[0-9]+}/devoluciones").hasRole("CLIENTE")
                .requestMatchers(HttpMethod.GET, "/api/devoluciones/mis-devoluciones").hasRole("CLIENTE")
                // 8b. Soporte (spec 006): bandeja vista por SOPORTE y ADMIN; atención exclusiva SOPORTE
                .requestMatchers(HttpMethod.GET, "/api/soporte/reclamos").hasAnyRole("SOPORTE", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/soporte/devoluciones").hasAnyRole("SOPORTE", "ADMIN")
                .requestMatchers("/api/soporte/**").hasRole("SOPORTE")
                // 9. Rutas de cualquier usuario autenticado
                .requestMatchers("/api/auth/sesion", "/api/auth/logout", "/api/notificaciones/**").authenticated();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }
}
