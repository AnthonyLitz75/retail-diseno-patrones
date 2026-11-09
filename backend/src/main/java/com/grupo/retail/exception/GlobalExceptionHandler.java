package com.grupo.retail.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Manejador global centralizado de excepciones para todos los controladores REST.
 * Traduce excepciones de negocio y de validación a respuestas HTTP consistentes
 * con estructura JSON {"error": "..."}.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final System.Logger LOGGER = System.getLogger(GlobalExceptionHandler.class.getName());

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, String>> manejarNoEncontrado(NoSuchElementException error) {
        String mensaje = error.getMessage() != null && !error.getMessage().isBlank()
                ? error.getMessage()
                : "Recurso no encontrado";
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", mensaje));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> manejarSolicitudInvalida(IllegalArgumentException error) {
        String mensaje = error.getMessage() != null && !error.getMessage().isBlank()
                ? error.getMessage()
                : "Solicitud inválida";
        return ResponseEntity.badRequest().body(Map.of("error", mensaje));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> manejarValidacion(MethodArgumentNotValidException error) {
        String mensaje = error.getBindingResult().getFieldErrors().stream()
                .map(campo -> campo.getField() + ": " + campo.getDefaultMessage())
                .findFirst()
                .orElse("Datos de solicitud inválidos");
        return ResponseEntity.badRequest().body(Map.of("error", mensaje));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> manejarMensajeNoLegible(HttpMessageNotReadableException error) {
        return ResponseEntity.badRequest()
                .body(Map.of("error", "El cuerpo de la solicitud no es un JSON válido o contiene tipos incompatibles"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> manejarTipoParametroInvalido(MethodArgumentTypeMismatchException error) {
        String parametro = error.getName() != null ? error.getName() : "solicitado";
        return ResponseEntity.badRequest()
                .body(Map.of("error", "El parámetro '" + parametro + "' contiene un formato o tipo de dato inválido"));
    }

    @ExceptionHandler(CorreoYaRegistradoException.class)
    public ResponseEntity<Map<String, String>> manejarCorreoDuplicado(CorreoYaRegistradoException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(CategoriaDuplicadaException.class)
    public ResponseEntity<Map<String, String>> manejarCategoriaDuplicada(CategoriaDuplicadaException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(OperacionAdminNoPermitidaException.class)
    public ResponseEntity<Map<String, String>> manejarOperacionAdminNoPermitida(
            OperacionAdminNoPermitidaException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(CodigoSeguimientoDuplicadoException.class)
    public ResponseEntity<Map<String, String>> manejarCodigoSeguimientoDuplicado(
            CodigoSeguimientoDuplicadoException error) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(PagoRechazadoException.class)
    public ResponseEntity<Map<String, String>> manejarPagoRechazado(PagoRechazadoException error) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(Map.of("error", error.getMessage()));
    }

    @ExceptionHandler(ErrorAccesoDatosException.class)
    public ResponseEntity<Map<String, String>> manejarErrorAccesoDatos(ErrorAccesoDatosException error) {
        LOGGER.log(System.Logger.Level.ERROR, "Fallo de acceso a datos: " + error.getMessage(), error);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Ocurrió un error inesperado en el servidor"));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> manejarEstadoIlegal(IllegalStateException error) {
        String mensaje = error.getMessage() != null && !error.getMessage().isBlank()
                ? error.getMessage()
                : "Operación no permitida en el estado actual";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", mensaje));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> manejarResponseStatus(ResponseStatusException error) {
        String mensaje = error.getReason() != null && !error.getReason().isBlank()
                ? error.getReason()
                : error.getMessage();
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("error", mensaje));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> manejarErrorInesperado(Exception error) {
        LOGGER.log(System.Logger.Level.ERROR, "Error no controlado capturado por GlobalExceptionHandler", error);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Ocurrió un error inesperado en el servidor"));
    }
}
