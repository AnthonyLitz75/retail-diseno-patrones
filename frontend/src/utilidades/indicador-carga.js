/**
 * @file indicador-carga.js
 * Spec 007 (T004, US1): indicador global y accesible de operaciones lentas. Escucha los
 * eventos de api.js: si alguna petición en primer plano tarda más de {@code retrasoMs}, muestra
 * una barra con role="status" (los lectores de pantalla anuncian "Cargando…") y marca la
 * aplicación con aria-busy. Las peticiones en segundo plano (sondeo) no cuentan, y las
 * rápidas no llegan a mostrarlo, así no parpadea.
 */

export const RETRASO_INDICADOR_MS = 400;

function crearElementoIndicador() {
  const elemento = document.createElement("div");
  elemento.className = "indicador-carga-global";
  elemento.setAttribute("role", "status");
  elemento.setAttribute("aria-live", "polite");
  elemento.hidden = true;
  const barra = document.createElement("div");
  barra.className = "indicador-carga-barra";
  barra.setAttribute("aria-hidden", "true");
  const texto = document.createElement("span");
  texto.className = "visually-hidden";
  texto.textContent = "Cargando…";
  elemento.append(barra, texto);
  document.body.append(elemento);
  return elemento;
}

/**
 * @param {object} opciones
 * @param {(oyente: Function) => Function} opciones.suscribir  suscribirEventosApi
 * @param {{hidden: boolean}} [opciones.elemento]               se crea si no se pasa
 * @param {{setAttribute: Function, removeAttribute: Function}} [opciones.raizOcupada] recibe aria-busy
 */
export function crearIndicadorCarga({
  suscribir,
  elemento = null,
  raizOcupada = null,
  retrasoMs = RETRASO_INDICADOR_MS,
  programar = (fn, ms) => setTimeout(fn, ms),
  cancelarProgramado = (id) => clearTimeout(id),
}) {
  const indicador = elemento ?? crearElementoIndicador();
  let pendientes = 0;
  let temporizador = null;

  function mostrar() {
    temporizador = null;
    if (pendientes > 0) {
      indicador.hidden = false;
      raizOcupada?.setAttribute("aria-busy", "true");
    }
  }

  function ocultar() {
    if (temporizador !== null) {
      cancelarProgramado(temporizador);
      temporizador = null;
    }
    indicador.hidden = true;
    raizOcupada?.removeAttribute("aria-busy");
  }

  const cancelarSuscripcion = suscribir((evento) => {
    if (!evento || evento.segundoPlano) return;
    if (evento.tipo === "inicio") {
      pendientes += 1;
      if (pendientes === 1 && temporizador === null) temporizador = programar(mostrar, retrasoMs);
    } else if (evento.tipo === "fin") {
      pendientes = Math.max(0, pendientes - 1);
      if (pendientes === 0) ocultar();
    }
  });

  return {
    pendientes: () => pendientes,
    visible: () => !indicador.hidden,
    detener: () => {
      cancelarSuscripcion?.();
      ocultar();
    },
  };
}
