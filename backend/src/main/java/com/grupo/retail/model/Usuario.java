package com.grupo.retail.model;

import java.time.OffsetDateTime;

public record Usuario(
                Long idUsuario,
                String nombre,
                String correo,
                String rol,
                boolean activo,
                OffsetDateTime fechaAlta) {
}