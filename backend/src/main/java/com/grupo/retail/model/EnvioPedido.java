package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record EnvioPedido(
        String transportista,
        String codigoSeguimiento,
        OffsetDateTime despachadoEn) {
}
