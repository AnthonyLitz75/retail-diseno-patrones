package com.grupo.retail.integracion;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Base de las pruebas del spec 004: aplicación completa en un puerto aleatorio sobre
 * PostgreSQL real (Testcontainers). Las peticiones atraviesan la cadena real:
 * Spring Security (sesión y CSRF) -> controlador -> fachada -> DAO -> base de datos.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class BaseCompraIntegracion extends BaseIntegracionPostgres {

    /** Límite para que una prueba de concurrencia nunca quede colgada. */
    private static final long ESPERA_MAXIMA_SEGUNDOS = 60;

    @LocalServerPort
    protected int puerto;

    @Autowired
    private DataSource dataSource;

    @Autowired
    private PasswordEncoder passwordEncoder;

    protected DatosIntegracion datos;

    @BeforeEach
    void prepararDatos() {
        datos = new DatosIntegracion(dataSource, passwordEncoder);
    }

    protected ClienteHttp sesionDe(DatosIntegracion.Cliente cliente) {
        return new ClienteHttp(puerto).iniciarSesion(cliente.correo(), DatosIntegracion.CLAVE_PRUEBA);
    }

    /**
     * Lanza todas las tareas a la vez: cada hilo espera en una barrera común y sale al
     * mismo tiempo, para que las transacciones compitan de verdad por los mismos bloqueos.
     */
    protected <T> List<T> enParalelo(List<Callable<T>> tareas) throws Exception {
        ExecutorService hilos = Executors.newFixedThreadPool(tareas.size());
        CountDownLatch salida = new CountDownLatch(1);
        try {
            List<Future<T>> futuros = new ArrayList<>();
            for (Callable<T> tarea : tareas) {
                futuros.add(hilos.submit(() -> {
                    salida.await();
                    return tarea.call();
                }));
            }
            salida.countDown();
            List<T> resultados = new ArrayList<>();
            for (Future<T> futuro : futuros) {
                resultados.add(futuro.get(ESPERA_MAXIMA_SEGUNDOS, TimeUnit.SECONDS));
            }
            return resultados;
        } finally {
            hilos.shutdownNow();
        }
    }
}
