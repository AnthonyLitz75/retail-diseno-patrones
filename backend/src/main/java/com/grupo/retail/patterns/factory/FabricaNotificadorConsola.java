package com.grupo.retail.patterns.factory;

import org.springframework.stereotype.Component;

@Component
public class FabricaNotificadorConsola extends FabricaNotificador {
    @Override
    public Notificador crearNotificador() {
        return new NotificadorConsola();
    }
}
