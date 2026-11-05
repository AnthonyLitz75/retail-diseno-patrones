package com.grupo.retail.patterns.factory;

import com.grupo.retail.model.EventoNotificacion;
import java.sql.Connection;
import java.sql.SQLException;

public interface Notificador {
    void notificar(Connection conexion, EventoNotificacion evento) throws SQLException;
}
