package com.grupo.retail.controller;

import com.grupo.retail.model.ContextoPedidoSoporte;
import com.grupo.retail.service.ContextoSoporteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** RF27: contexto de un pedido para Soporte (/api/soporte/** es solo SOPORTE). */
@RestController
@RequestMapping("/api/soporte/pedidos")
public class SoportePedidoController {

    private final ContextoSoporteService contextoSoporteService;

    public SoportePedidoController(ContextoSoporteService contextoSoporteService) {
        this.contextoSoporteService = contextoSoporteService;
    }

    @GetMapping("/{id}")
    public ContextoPedidoSoporte consultar(@PathVariable Long id) {
        return contextoSoporteService.consultar(id);
    }
}
