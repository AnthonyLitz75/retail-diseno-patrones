package com.grupo.retail.controller;

import com.grupo.retail.dto.SolicitudPreguntaProducto;
import com.grupo.retail.dto.SolicitudRespuestaPregunta;
import com.grupo.retail.model.ConsultaProducto;
import com.grupo.retail.service.ConsultaProductoService;
import com.grupo.retail.service.SesionCliente;
import com.grupo.retail.service.SesionEmpleado;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ConsultaProductoController {
    private final ConsultaProductoService consultaProductoService;
    private final SesionCliente sesionCliente;
    private final SesionEmpleado sesionEmpleado;

    public ConsultaProductoController(
            ConsultaProductoService consultaProductoService,
            SesionCliente sesionCliente,
            SesionEmpleado sesionEmpleado) {
        this.consultaProductoService = consultaProductoService;
        this.sesionCliente = sesionCliente;
        this.sesionEmpleado = sesionEmpleado;
    }

    @PostMapping("/productos/{id}/preguntas")
    public ResponseEntity<ConsultaProducto> crearPregunta(
            @PathVariable Long id,
            @Valid @RequestBody SolicitudPreguntaProducto solicitud,
            HttpServletRequest peticion) {
        Long clienteId = sesionCliente.obtenerId(peticion);
        ConsultaProducto consulta = consultaProductoService.crearPregunta(
                id, clienteId, solicitud.pregunta());
        return ResponseEntity.status(HttpStatus.CREATED).body(consulta);
    }

    @GetMapping("/preguntas/mis-preguntas")
    public List<ConsultaProducto> listarMisPreguntas(HttpServletRequest peticion) {
        return consultaProductoService.listarPorCliente(sesionCliente.obtenerId(peticion));
    }

    @GetMapping("/vendedor/preguntas")
    public List<ConsultaProducto> listarPendientes() {
        return consultaProductoService.listarPendientes();
    }

    public List<ConsultaProducto> listarPendientes(HttpServletRequest peticion) {
        return listarPendientes();
    }

    @PostMapping("/vendedor/preguntas/{id}/responder")
    public ResponseEntity<Void> responderPregunta(
            @PathVariable Long id,
            @Valid @RequestBody SolicitudRespuestaPregunta solicitud,
            HttpServletRequest peticion) {
        Long vendedorId = sesionEmpleado.obtenerId(peticion);
        consultaProductoService.responder(id, vendedorId, solicitud.respuesta());
        return ResponseEntity.noContent().build();
    }
}
