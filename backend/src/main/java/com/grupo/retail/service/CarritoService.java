package com.grupo.retail.service;

import com.grupo.retail.dao.CarritoDAO;
import com.grupo.retail.model.Carrito;
import org.springframework.stereotype.Service;

@Service
public class CarritoService {

    private final CarritoDAO carritoDAO;

    public CarritoService(CarritoDAO carritoDAO) {
        this.carritoDAO = carritoDAO;
    }

    public Carrito obtener(Long usuarioId) {
        return carritoDAO.obtener(usuarioId);
    }

    public Carrito agregar(Long usuarioId, Long productoId, int cantidad) {
        return carritoDAO.agregar(usuarioId, productoId, cantidad);
    }

    public Carrito actualizarCantidad(Long usuarioId, Long productoId, int cantidad) {
        return carritoDAO.actualizarCantidad(usuarioId, productoId, cantidad);
    }

    public void quitar(Long usuarioId, Long productoId) {
        carritoDAO.quitar(usuarioId, productoId);
    }
}