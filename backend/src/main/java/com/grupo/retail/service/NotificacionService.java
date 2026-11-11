package com.grupo.retail.service;

import com.grupo.retail.dao.NotificacionDAO;
import com.grupo.retail.model.Notificacion;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class NotificacionService {
    private final NotificacionDAO notificacionDAO;
    public NotificacionService(NotificacionDAO notificacionDAO) { this.notificacionDAO = notificacionDAO; }
    public List<Notificacion> listar(Long usuarioId, Long antesDeId, int limite) {
        if (antesDeId != null && antesDeId <= 0) throw new IllegalArgumentException("El cursor debe ser positivo");
        if (limite < 1 || limite > 100) throw new IllegalArgumentException("El límite debe estar entre 1 y 100");
        return notificacionDAO.listarDelUsuario(usuarioId, antesDeId, limite);
    }

    /** RF02: solo el dueño marca su notificación; una ajena o inexistente responde 404. */
    public Notificacion marcarLeida(Long usuarioId, Long idNotificacion) {
        return notificacionDAO.marcarLeida(usuarioId, idNotificacion)
                .orElseThrow(() -> new NoSuchElementException("No existe la notificación solicitada"));
    }
}
