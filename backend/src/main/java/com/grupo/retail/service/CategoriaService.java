package com.grupo.retail.service;

import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dto.CategoriaAdminDTO;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.exception.RecursoNoEncontradoException;
import com.grupo.retail.exception.ReglaNegocioException;
import com.grupo.retail.model.AccionAuditoria;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.model.EventoAuditoria;
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

    public List<CategoriaAdminDTO> listarConConteos() {
        List<Categoria> categorias = categoriaDAO.listarTodas();
        Map<Long, Integer> conteos = categoriaDAO.consultarConteosPorCategoria();
        return categorias.stream()
                .map(categoria -> CategoriaAdminDTO.desde(
                        categoria,
                        conteos.getOrDefault(categoria.idCategoria(), 0)))
                .toList();
    }

    public List<CategoriaComponente> listarArbol() {
        List<Categoria> categorias = categoriaDAO.listarActivas();
        Map<Long, Integer> conteos = categoriaDAO.consultarConteosPorCategoria();
        int productosSinCategoria = categoriaDAO.consultarTotalSinCategoria();
        return ArbolCategoriaBuilder.construirArbol(categorias, conteos, productosSinCategoria);
    }

    public Categoria crear(SolicitudCategoria solicitud, Long administradorId) {
        String nombre = normalizar(solicitud.nombre());
        Categoria padre = validarPadre(null, solicitud.categoriaPadreId());
        Categoria creada = categoriaDAO.crear(nombre, solicitud.categoriaPadreId());
        String detalle = padre != null
                ? creada.nombre() + " (subcategoría de " + padre.nombre() + ")"
                : creada.nombre();
        auditoriaService.registrarAparte(EventoAuditoria.de(administradorId, AccionAuditoria.CATEGORIA_CREADA,
                CATEGORIA, creada.idCategoria(), detalle));
        return creada;
    }

    public Optional<Categoria> actualizar(Long id, SolicitudCategoria solicitud, Long administradorId) {
        String nombre = normalizar(solicitud.nombre());
        Optional<Categoria> actual = categoriaDAO.buscarPorId(id);
        if (actual.isEmpty()) {
            return Optional.empty();
        }
        Categoria padre = validarPadre(id, solicitud.categoriaPadreId());
        if (solicitud.categoriaPadreId() != null && categoriaDAO.tieneSubcategorias(id)) {
            throw new ReglaNegocioException(
                    "No se puede convertir en subcategoría porque ya tiene subcategorías asociadas");
        }
        Optional<Categoria> actualizada = categoriaDAO.actualizar(id, nombre, solicitud.categoriaPadreId());
        actualizada.ifPresent(categoria -> {
            String sufijo = padre != null ? " (subcategoría de " + padre.nombre() + ")" : "";
            auditoriaService.registrarAparte(EventoAuditoria.de(administradorId,
                    AccionAuditoria.CATEGORIA_RENOMBRADA, CATEGORIA, categoria.idCategoria(),
                    "Nombre: " + categoria.nombre() + sufijo));
        });
        return actualizada;
    }

    public Optional<Categoria> actualizarEstado(Long id, boolean activa, Long administradorId) {
        Optional<Categoria> actualizada = categoriaDAO.actualizarEstado(id, activa);
        actualizada.ifPresent(categoria -> auditoriaService.registrarAparte(EventoAuditoria.de(administradorId,
                activa ? AccionAuditoria.CATEGORIA_ACTIVADA : AccionAuditoria.CATEGORIA_DESACTIVADA,
                CATEGORIA, categoria.idCategoria(), categoria.nombre())));
        return actualizada;
    }

    private Categoria validarPadre(Long categoriaId, Long categoriaPadreId) {
        if (categoriaPadreId == null) {
            return null;
        }
        if (categoriaId != null && categoriaId.equals(categoriaPadreId)) {
            throw new ReglaNegocioException("Una categoría no puede ser padre de sí misma");
        }
        Categoria padre = categoriaDAO.buscarPorId(categoriaPadreId)
                .orElseThrow(() -> new RecursoNoEncontradoException("La categoría padre indicada no existe"));
        if (padre.categoriaPadreId() != null) {
            throw new ReglaNegocioException("Solo se permiten subcategorías bajo una categoría principal");
        }
        return padre;
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
