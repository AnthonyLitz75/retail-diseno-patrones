package com.grupo.retail.patterns.factory;

import org.springframework.stereotype.Component;

@Component
public class FabricaNotificadorInApp extends FabricaNotificador {
    @Override
    public Notificador crearNotificador() {
        return new NotificadorInApp();
    }
}
