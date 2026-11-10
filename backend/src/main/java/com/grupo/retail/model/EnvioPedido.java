package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record EnvioPedido(
        String transportista,
        String codigoSeguimiento,
        OffsetDateTime despachadoEn,
        OffsetDateTime entregadoEn) {

    public EnvioPedido(String transportista, String codigoSeguimiento, OffsetDateTime despachadoEn) {
        this(transportista, codigoSeguimiento, despachadoEn, null);
    }
}
