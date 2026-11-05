package com.grupo.retail.service;

import com.grupo.retail.dao.NotificacionDAO;
import com.grupo.retail.model.Notificacion;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class NotificacionService {
    private final NotificacionDAO notificacionDAO;
    public NotificacionService(NotificacionDAO notificacionDAO) { this.notificacionDAO = notificacionDAO; }
    public List<Notificacion> listar(Long usuarioId, Long antesDeId, int limite) {
        if (antesDeId != null && antesDeId <= 0) throw new IllegalArgumentException("El cursor debe ser positivo");
        if (limite < 1 || limite > 100) throw new IllegalArgumentException("El límite debe estar entre 1 y 100");
        return notificacionDAO.listarDelUsuario(usuarioId, antesDeId, limite);
    }
}
