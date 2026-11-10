package com.grupo.retail.security;

import com.grupo.retail.dao.UsuarioDAO;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class FiltroRevalidacionSesion extends OncePerRequestFilter {

    private final UsuarioDAO usuarioDAO;

    public FiltroRevalidacionSesion(UsuarioDAO usuarioDAO) {
        this.usuarioDAO = usuarioDAO;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)) {

            HttpSession session = request.getSession(false);
            if (session != null) {
                Object idAttr = session.getAttribute("usuarioId");
                Object rolAttr = session.getAttribute("usuarioRol");

                if (idAttr instanceof Long usuarioId && rolAttr instanceof String rol) {
                    if (!usuarioDAO.sesionSigueVigente(usuarioId, rol)) {
                        session.invalidate();
                        SecurityContextHolder.clearContext();
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.setCharacterEncoding("UTF-8");
                        response.getWriter().write("{\"error\":\"La cuenta o el rol cambiaron; inicia sesión nuevamente\"}");
                        return;
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
