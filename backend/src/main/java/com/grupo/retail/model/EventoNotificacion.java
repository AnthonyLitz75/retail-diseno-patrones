package com.grupo.retail.model;

public record EventoNotificacion(Long usuarioId, Long pedidoId, String estado, String mensaje) {}
