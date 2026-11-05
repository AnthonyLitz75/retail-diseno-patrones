package com.grupo.retail.patterns.factory;

public class FabricaNotificadorConsola extends FabricaNotificador {
    @Override
    public Notificador crearNotificador() {
        return new NotificadorConsola();
    }
}
