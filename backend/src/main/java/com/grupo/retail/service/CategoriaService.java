package com.grupo.retail.service;

import com.grupo.retail.dao.CategoriaDAO;
import com.grupo.retail.dto.SolicitudCategoria;
import com.grupo.retail.model.Categoria;
import com.grupo.retail.patterns.composite.CategoriaComponente;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CategoriaService {
    private final CategoriaDAO categoriaDAO;

    public CategoriaService(CategoriaDAO categoriaDAO) {
        this.categoriaDAO = categoriaDAO;
    }

    public List<Categoria> listarTodas() {
        return categoriaDAO.listarTodas();
    }

    public List<CategoriaComponente> listarArbol() {
        return categoriaDAO.listarArbol();
    }

    public Categoria crear(SolicitudCategoria solicitud) {
        return categoriaDAO.crear(normalizar(solicitud.nombre()));
    }

    public Optional<Categoria> actualizarNombre(Long id, SolicitudCategoria solicitud) {
        return categoriaDAO.actualizarNombre(id, normalizar(solicitud.nombre()));
    }

    public Optional<Categoria> actualizarEstado(Long id, boolean activa) {
        return categoriaDAO.actualizarEstado(id, activa);
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
