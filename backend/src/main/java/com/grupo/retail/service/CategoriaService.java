package com.grupo.retail.service;

import com.grupo.retail.model.EventoAuditoria;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.patterns.composite.ArbolCategoriaBuilder;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class CategoriaService {
    private static final String CATEGORIA = "CATEGORIA";

    private final CategoriaDAO categoriaDAO;
    private final AuditoriaService auditoriaService;

    public CategoriaService(CategoriaDAO categoriaDAO, AuditoriaService auditoriaService) {
        this.categoriaDAO = categoriaDAO;
        this.auditoriaService = auditoriaService;
    }

    public List<Categoria> listarTodas() {
        return categoriaDAO.listarTodas();
    }

    public List<CategoriaComponente> listarArbol() {
        List<Categoria> categorias = categoriaDAO.listarActivas();
        Map<Long, Integer> conteos = categoriaDAO.consultarConteosPorCategoria();
        int productosSinCategoria = categoriaDAO.consultarTotalSinCategoria();
        return ArbolCategoriaBuilder.construirArbol(categorias, conteos, productosSinCategoria);
    }

    public Categoria crear(SolicitudCategoria solicitud, Long administradorId) {
        Categoria creada = categoriaDAO.crear(normalizar(solicitud.nombre()));
        auditoriaService.registrarAparte(EventoAuditoria.de(administradorId, AccionAuditoria.CATEGORIA_CREADA,
                CATEGORIA, creada.idCategoria(), creada.nombre()));
        return creada;
    }

    public Optional<Categoria> actualizarNombre(Long id, SolicitudCategoria solicitud, Long administradorId) {
        Optional<Categoria> actualizada = categoriaDAO.actualizarNombre(id, normalizar(solicitud.nombre()));
        actualizada.ifPresent(categoria -> auditoriaService.registrarAparte(EventoAuditoria.de(administradorId,
                AccionAuditoria.CATEGORIA_RENOMBRADA, CATEGORIA, categoria.idCategoria(),
                "Nuevo nombre: " + categoria.nombre())));
        return actualizada;
    }

    public Optional<Categoria> actualizarEstado(Long id, boolean activa, Long administradorId) {
        Optional<Categoria> actualizada = categoriaDAO.actualizarEstado(id, activa);
        actualizada.ifPresent(categoria -> auditoriaService.registrarAparte(EventoAuditoria.de(administradorId,
                activa ? AccionAuditoria.CATEGORIA_ACTIVADA : AccionAuditoria.CATEGORIA_DESACTIVADA,
                CATEGORIA, categoria.idCategoria(), categoria.nombre())));
        return actualizada;
    }

    private String normalizar(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio");
        }
        String normalizado = nombre.trim();
        if (normalizado.length() > 80) {
            throw new IllegalArgumentException("El nombre no puede superar 80 caracteres");
        }
        return normalizado;
    }
}
