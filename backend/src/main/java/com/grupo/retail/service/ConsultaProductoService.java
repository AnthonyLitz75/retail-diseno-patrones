package com.grupo.retail.service;

import com.grupo.retail.dao.ConsultaProductoDAO;
import com.grupo.retail.model.ConsultaProducto;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ConsultaProductoService {
    private final ConsultaProductoDAO consultaProductoDAO;

    public ConsultaProductoService(ConsultaProductoDAO consultaProductoDAO) {
        this.consultaProductoDAO = consultaProductoDAO;
    }

    public ConsultaProducto crearPregunta(Long productoId, Long clienteId, String pregunta) {
        return consultaProductoDAO.crearPregunta(productoId, clienteId, pregunta);
    }

    public List<ConsultaProducto> listarPorCliente(Long clienteId) {
        return consultaProductoDAO.listarPorCliente(clienteId);
    }

    public List<ConsultaProducto> listarPendientes() {
        return consultaProductoDAO.listarPendientes();
    }

    public void responder(Long consultaId, Long vendedorId, String respuesta) {
        if (consultaProductoDAO.responder(consultaId, vendedorId, respuesta)) {
            return;
        }
        if (consultaProductoDAO.existe(consultaId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "La pregunta ya fue respondida");
        }
        throw new NoSuchElementException("No existe la pregunta solicitada");
    }
}
