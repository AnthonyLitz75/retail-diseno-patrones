/**
 * @file errores-globales.js
 * Spec 007 (T002, US1): reacción común a los errores de sesión y permisos de cualquier
 * petición. 401 -> aviso y redirección al login; 403 -> aviso de permisos. El servidor sigue
 * siendo la autoridad: esto solo explica al usuario lo que el backend ya decidió.
 *
 * Las rutas /api/auth/* quedan fuera: consultar la sesión siendo invitado o equivocarse de
 * clave responden 401 y eso no es una sesión vencida.
 */

const RUTAS_DE_AUTENTICACION = "/api/auth/";

/** Ventana en la que se ignora el mismo aviso repetido (varias peticiones fallan a la vez). */
export const VENTANA_AVISO_MS = 4000;

export function esRutaDeAutenticacion(url) {
  return typeof url === "string" && url.startsWith(RUTAS_DE_AUTENTICACION);
}

/** Ruta del login que, tras iniciar sesión, devuelve al usuario a donde estaba. */
export function rutaLoginConRetorno(hashActual = "") {
  const hash = typeof hashActual === "string" && hashActual.startsWith("#/") && hashActual !== "#/" ? hashActual : "";
  return hash ? `/login.html?volver=${encodeURIComponent(hash)}` : "/login.html";
}

/**
 * Destino tras iniciar sesión a partir de {@code ?volver=}. Solo se aceptan rutas internas
 * de la SPA ({@code #/...}) sin caracteres de control ni barras dobles: el parámetro nunca
 * puede convertirse en una redirección a otro sitio (open redirect).
 */
export function destinoTrasLogin(busqueda = "") {
  let volver;
  try {
    volver = new URLSearchParams(busqueda).get("volver");
  } catch {
    volver = null;
  }
  return volver && /^#\/[\w\-./?=&%]*$/.test(volver) && !volver.includes("//") ? `/${volver}` : "/";
}

/**
 * @param {object} dependencias
 * @param {(oyente: Function) => Function} dependencias.suscribir  suscribirEventosApi
 * @param {() => object|null} dependencias.obtenerUsuario          usuario en sesión o null
 * @param {Function} dependencias.mostrarToast
 * @param {() => void} [dependencias.alSesionExpirada]             limpia el estado local
 * @param {(ruta: string) => void} dependencias.redirigir
 * @param {() => string} [dependencias.obtenerHash]
 * @param {() => number} [dependencias.ahora]
 * @param {number} [dependencias.retrasoRedireccionMs]
 * @param {(fn: Function, ms: number) => unknown} [dependencias.programar]
 */
export function configurarErroresGlobales({
  suscribir,
  obtenerUsuario,
  mostrarToast,
  alSesionExpirada = null,
  redirigir,
  obtenerHash = () => (typeof window !== "undefined" ? window.location.hash : ""),
  ahora = () => Date.now(),
  retrasoRedireccionMs = 1500,
  programar = (fn, ms) => setTimeout(fn, ms),
}) {
  const ultimoAviso = new Map();
  let redireccionEnCurso = false;

  function avisarUnaVez(clave, mensaje, tipo) {
    const momento = ahora();
    if (momento - (ultimoAviso.get(clave) ?? -Infinity) < VENTANA_AVISO_MS) return false;
    ultimoAviso.set(clave, momento);
    mostrarToast?.(mensaje, tipo);
    return true;
  }

  function manejarNoAutenticado() {
    if (redireccionEnCurso) return;
    const habiaSesion = Boolean(obtenerUsuario?.());
    avisarUnaVez(
      "401",
      habiaSesion
        ? "Tu sesión expiró. Inicia sesión de nuevo para continuar."
        : "Inicia sesión para continuar.",
      "advertencia",
    );
    if (habiaSesion && typeof alSesionExpirada === "function") alSesionExpirada();
    redireccionEnCurso = true;
    const destino = rutaLoginConRetorno(obtenerHash());
    programar(() => redirigir(destino), retrasoRedireccionMs);
  }

  return suscribir((evento) => {
    if (evento?.tipo !== "error" || esRutaDeAutenticacion(evento.url)) return;
    if (evento.status === 401) {
      manejarNoAutenticado();
    } else if (evento.status === 403) {
      avisarUnaVez("403", "No tienes permiso para realizar esta acción con tu rol actual.", "advertencia");
    }
  });
}
