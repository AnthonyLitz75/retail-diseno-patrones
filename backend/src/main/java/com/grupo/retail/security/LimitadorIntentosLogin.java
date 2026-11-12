package com.grupo.retail.security;

import com.grupo.retail.exception.DemasiadosIntentosException;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Freno contra la adivinación de contraseñas: tras {@value #MAX_FALLOS} intentos fallidos
 * para un mismo correo dentro de la ventana, ese correo queda bloqueado durante
 * {@link #BLOQUEO}. Un inicio de sesión correcto borra el contador.
 *
 * <p>Se guarda en memoria del proceso: alcanza para una sola instancia del backend. Con
 * varias instancias habría que llevar el contador a la base o a un caché compartido.</p>
 */
@Component
public class LimitadorIntentosLogin {

    public static final int MAX_FALLOS = 5;
    public static final Duration VENTANA = Duration.ofMinutes(15);
    public static final Duration BLOQUEO = Duration.ofMinutes(15);
    /** Por encima de este tamaño se descartan los registros vencidos antes de agregar otro. */
    private static final int LIMPIAR_DESDE = 10_000;

    private record Registro(int fallos, Instant primerFallo, Instant bloqueadoHasta) {
    }

    private final Map<String, Registro> registros = new ConcurrentHashMap<>();
    private final Clock reloj;

    public LimitadorIntentosLogin() {
        this(Clock.systemUTC());
    }

    LimitadorIntentosLogin(Clock reloj) {
        this.reloj = reloj;
    }

    /** Lanza {@link DemasiadosIntentosException} (429) si el correo está bloqueado. */
    public void verificar(String correo) {
        Registro registro = registros.get(clave(correo));
        Instant ahora = reloj.instant();
        if (registro != null && registro.bloqueadoHasta() != null && ahora.isBefore(registro.bloqueadoHasta())) {
            long segundos = Math.max(1, Duration.between(ahora, registro.bloqueadoHasta()).toSeconds());
            throw new DemasiadosIntentosException(segundos);
        }
    }

    public void registrarFallo(String correo) {
        Instant ahora = reloj.instant();
        if (registros.size() >= LIMPIAR_DESDE) {
            registros.values().removeIf(r -> vencido(r, ahora));
        }
        registros.compute(clave(correo), (k, previo) -> {
            if (previo == null || vencido(previo, ahora)) {
                return new Registro(1, ahora, null);
            }
            int fallos = previo.fallos() + 1;
            Instant bloqueo = fallos >= MAX_FALLOS ? ahora.plus(BLOQUEO) : null;
            return new Registro(fallos, previo.primerFallo(), bloqueo);
        });
    }

    public void reiniciar(String correo) {
        registros.remove(clave(correo));
    }

    private static boolean vencido(Registro registro, Instant ahora) {
        boolean ventanaPasada = ahora.isAfter(registro.primerFallo().plus(VENTANA));
        boolean sinBloqueoVigente = registro.bloqueadoHasta() == null || !ahora.isBefore(registro.bloqueadoHasta());
        return ventanaPasada && sinBloqueoVigente;
    }

    private static String clave(String correo) {
        return correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT);
    }
}
