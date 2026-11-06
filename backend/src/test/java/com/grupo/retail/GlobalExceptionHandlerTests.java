package com.grupo.retail;

import com.grupo.retail.exception.CategoriaDuplicadaException;
import com.grupo.retail.exception.CodigoSeguimientoDuplicadoException;
import com.grupo.retail.exception.CorreoYaRegistradoException;
import com.grupo.retail.exception.ErrorAccesoDatosException;
import com.grupo.retail.exception.GlobalExceptionHandler;
import com.grupo.retail.exception.OperacionAdminNoPermitidaException;
import com.grupo.retail.exception.PagoRechazadoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Method;
import java.util.Map;
import java.util.NoSuchElementException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class GlobalExceptionHandlerTests {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    void manejarNoEncontradoRetorna404() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarNoEncontrado(new NoSuchElementException("Producto no existe"));

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Producto no existe", respuesta.getBody().get("error"));
    }

    @Test
    void manejarSolicitudInvalidaRetorna400() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarSolicitudInvalida(new IllegalArgumentException("El precio debe ser positivo"));

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("El precio debe ser positivo", respuesta.getBody().get("error"));
    }

    @Test
    void manejarValidacionRetorna400ConDetalleDeCampo() throws Exception {
        Method metodo = getClass().getDeclaredMethod("metodoPrueba", String.class);
        MethodParameter parametro = new MethodParameter(metodo, 0);
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "objeto");
        bindingResult.addError(new FieldError("objeto", "correo", "El formato del correo es inválido"));

        MethodArgumentNotValidException excepcion = new MethodArgumentNotValidException(parametro, bindingResult);
        ResponseEntity<Map<String, String>> respuesta = handler.manejarValidacion(excepcion);

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("correo: El formato del correo es inválido", respuesta.getBody().get("error"));
    }

    @Test
    void manejarCorreoDuplicadoRetorna409() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarCorreoDuplicado(new CorreoYaRegistradoException());

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Ya existe una cuenta registrada con ese correo", respuesta.getBody().get("error"));
    }

    @Test
    void manejarCategoriaDuplicadaRetorna409() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarCategoriaDuplicada(new CategoriaDuplicadaException());

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Ya existe una categoría con ese nombre", respuesta.getBody().get("error"));
    }

    @Test
    void manejarOperacionAdminNoPermitidaRetorna409() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarOperacionAdminNoPermitida(
                        new OperacionAdminNoPermitidaException("No se puede desactivar el último admin"));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("No se puede desactivar el último admin", respuesta.getBody().get("error"));
    }

    @Test
    void manejarCodigoSeguimientoDuplicadoRetorna409() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarCodigoSeguimientoDuplicado(
                        new CodigoSeguimientoDuplicadoException(new RuntimeException("Duplicado")));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("El código de seguimiento ya está asociado a otro pedido", respuesta.getBody().get("error"));
    }

    @Test
    void manejarPagoRechazadoRetorna402() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarPagoRechazado(new PagoRechazadoException("Fondos insuficientes"));

        assertEquals(HttpStatus.PAYMENT_REQUIRED, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Fondos insuficientes", respuesta.getBody().get("error"));
    }

    @Test
    void manejarEstadoIlegalRetorna409() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarEstadoIlegal(new IllegalStateException("Solo se puede cancelar un pedido pendiente"));

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Solo se puede cancelar un pedido pendiente", respuesta.getBody().get("error"));
    }

    @Test
    void manejarErrorAccesoDatosRetorna500GenericoSinExponerDetalle() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarErrorAccesoDatos(new ErrorAccesoDatosException(
                        "No se pudo consultar el pedido", new java.sql.SQLException("connection refused")));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Ocurrió un error inesperado en el servidor", respuesta.getBody().get("error"));
    }

    @Test
    void manejarResponseStatusRetornaStatusYMotivo() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarResponseStatus(
                        new ResponseStatusException(HttpStatus.FORBIDDEN, "Tu rol no puede realizar esta operación"));

        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Tu rol no puede realizar esta operación", respuesta.getBody().get("error"));
    }

    @Test
    void manejarErrorInesperadoRetorna500Generico() {
        ResponseEntity<Map<String, String>> respuesta =
                handler.manejarErrorInesperado(new RuntimeException("Fallo imprevisto de base de datos"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals("Ocurrió un error inesperado en el servidor", respuesta.getBody().get("error"));
    }

    @SuppressWarnings("unused")
    private void metodoPrueba(String parametro) {
    }
}
