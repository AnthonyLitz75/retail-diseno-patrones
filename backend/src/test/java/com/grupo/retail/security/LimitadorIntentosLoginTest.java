package com.grupo.retail.security;

import com.grupo.retail.exception.DemasiadosIntentosException;
import com.grupo.retail.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Revisión de buenas prácticas (punto 6): freno a la adivinación de contraseñas. */
class LimitadorIntentosLoginTest {

    /** Reloj que el test puede adelantar. */
    private static final class RelojManual extends Clock {
        private Instant ahora = Instant.parse("2026-11-12T10:00:00Z");

        void avanzar(Duration duracion) {
            ahora = ahora.plus(duracion);
        }

        @Override public Instant instant() { return ahora; }
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zona) { return this; }
    }

    private final RelojManual reloj = new RelojManual();
    private final LimitadorIntentosLogin limitador = new LimitadorIntentosLogin(reloj);

    private void fallar(String correo, int veces) {
        for (int i = 0; i < veces; i++) {
            limitador.registrarFallo(correo);
        }
    }

    @Test
    void cuatroFallosTodaviaPermitenIntentar() {
        fallar("ana@example.com", LimitadorIntentosLogin.MAX_FALLOS - 1);
        assertDoesNotThrow(() -> limitador.verificar("ana@example.com"));
    }

    @Test
    void elQuintoFalloBloqueaElCorreoQuinceMinutos() {
        fallar("ana@example.com", LimitadorIntentosLogin.MAX_FALLOS);

        DemasiadosIntentosException error = assertThrows(DemasiadosIntentosException.class,
                () -> limitador.verificar("ana@example.com"));
        assertEquals(15 * 60, error.segundosEspera());
        assertTrue(error.getMessage().contains("15 minuto"));

        reloj.avanzar(Duration.ofMinutes(15));
        assertDoesNotThrow(() -> limitador.verificar("ana@example.com"));
    }

    @Test
    void elBloqueoNoDistingueMayusculasNiEspacios() {
        fallar(" ANA@Example.com ", LimitadorIntentosLogin.MAX_FALLOS);
        assertThrows(DemasiadosIntentosException.class, () -> limitador.verificar("ana@example.com"));
    }

    @Test
    void unCorreoBloqueadoNoAfectaAOtros() {
        fallar("ana@example.com", LimitadorIntentosLogin.MAX_FALLOS);
        assertDoesNotThrow(() -> limitador.verificar("beto@example.com"));
    }

    @Test
    void unInicioCorrectoReiniciaElContador() {
        fallar("ana@example.com", LimitadorIntentosLogin.MAX_FALLOS - 1);
        limitador.reiniciar("ana@example.com");
        fallar("ana@example.com", LimitadorIntentosLogin.MAX_FALLOS - 1);
        assertDoesNotThrow(() -> limitador.verificar("ana@example.com"));
    }

    @Test
    void losFallosAntiguosVencenConLaVentana() {
        fallar("ana@example.com", LimitadorIntentosLogin.MAX_FALLOS - 1);
        reloj.avanzar(LimitadorIntentosLogin.VENTANA.plusSeconds(1));
        fallar("ana@example.com", 1);
        assertDoesNotThrow(() -> limitador.verificar("ana@example.com"));
    }

    @Test
    void elManejadorRespondeTooManyRequestsConRetryAfter() {
        ResponseEntity<Map<String, String>> respuesta = new GlobalExceptionHandler()
                .manejarDemasiadosIntentos(new DemasiadosIntentosException(125));

        assertEquals(429, respuesta.getStatusCode().value());
        assertEquals("125", respuesta.getHeaders().getFirst(HttpHeaders.RETRY_AFTER));
        assertTrue(respuesta.getBody().get("error").contains("3 minuto"));
    }
}
