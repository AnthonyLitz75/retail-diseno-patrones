/**
 * @file bandeja-montaje.js
 * Panel del personal (rediseño v6, tanda 2): pinta y cablea una bandeja de dos paneles
 * (Reclamos o Devoluciones) sobre el estado de bandeja-controlador.js. Las llamadas a la API son
 * las de atencion.js (tomar, responder, escalar, decidir y recibir); el backend decide.
 */

import {
  decidirDevolucion, escalarReclamo, recibirDevolucion, responderReclamo, tomarReclamo,
} from "../../atencion/atencion.js";
import { crearBandeja } from "./bandeja-controlador.js";
import { lineasRecepcion, recepcionCompleta } from "./bandeja-logica.js";
import {
  renderizarBandeja, renderizarDetalleDevolucion, renderizarDetalleReclamo, renderizarLista, renderizarPestanas,
} from "./bandeja-vista.js";
import { renderizarErrorBloque } from "../inicio/piezas-inicio.js";

/**
 * Las dos bandejas (Reclamos y Devoluciones) usan los mismos ids. El router deja cada pantalla
 * montada aunque esté oculta, así que solo la bandeja visible está en el documento: al mostrarse,
 * una se lleva la otra fuera (sin perder su estado) y se pone ella.
 */
let raizVisible = null;

/** Una carga reciente se reutiliza al elegir elementos (cambiar de ?id= no vuelve a pedir las listas). */
const VIGENCIA_MS = 10_000;

/**
 * @param {HTMLElement} contenedor ya con el <h1> de la ruta
 * @param {{ tipo: "reclamos"|"devoluciones", servicios: object }} contexto
 * @returns {{ alMostrar: (parametros: object) => Promise<void> }}
 */
export function montarBandeja(contenedor, { tipo, servicios }) {
  const { apiRequest, mostrarToast, estado, navegar } = servicios;
  const plantilla = document.createElement("div");
  plantilla.innerHTML = renderizarBandeja(tipo);
  const raiz = plantilla.firstElementChild; // fuera del documento hasta que la ruta se muestre
  const zonaPestanas = raiz.querySelector("#bandeja-pestanas");
  const zonaLista = raiz.querySelector("#bandeja-lista");
  const zonaDetalle = raiz.querySelector("#bandeja-detalle");
  const buscador = raiz.querySelector("#bandeja-buscar");
  const usuarioId = () => estado.usuarioSesion?.idUsuario;

  let bandeja = null;
  let ultimaCarga = 0;
  let parametros = {};
  let enfocarTitulo = false;
  let pintura = 0;

  const ahora = () => new Date();

  function pintarPestanasYLista() {
    const v = bandeja.vista();
    zonaPestanas.innerHTML = renderizarPestanas(tipo, v.pestanas);
    zonaLista.innerHTML = v.errores.includes(v.activa)
      ? renderizarErrorBloque(tipo)
      : renderizarLista(tipo, v.elementos, { nombres: bandeja.nombres, usuarioId: usuarioId(), ahora: ahora(), elegidoId: v.elegidoId });
    raiz.classList.toggle("panel-bandeja-con-detalle", v.conDetalle);
  }

  async function pintarDetalle() {
    const v = bandeja.vista();
    const actual = ++pintura;
    if (!v.elegido) {
      zonaDetalle.innerHTML = `<p class="panel-vacio panel-detalle-vacio">${tipo === "reclamos" ? "Elige un reclamo de la lista." : "Elige una devolución de la lista."}</p>`;
      return;
    }
    if (!bandeja.contextos.has(v.elegido.pedidoId)) {
      zonaDetalle.innerHTML = '<p class="panel-cargando">Cargando el detalle…</p>';
      await bandeja.cargarContexto(v.elegido.pedidoId);
      if (actual !== pintura) return;
    }
    const contexto = bandeja.contextos.get(v.elegido.pedidoId) ?? null;
    zonaDetalle.innerHTML = tipo === "reclamos"
      ? renderizarDetalleReclamo(v.elegido, { contexto, usuarioId: usuarioId(), nombreUsuario: estado.usuarioSesion?.nombre ?? "" })
      : renderizarDetalleDevolucion(v.elegido, { contexto, ahora: ahora() });
    if (enfocarTitulo) {
      enfocarTitulo = false;
      zonaDetalle.querySelector("#bandeja-titulo")?.focus();
    }
  }

  async function cargar() {
    zonaLista.innerHTML = '<p class="panel-cargando">Cargando…</p>';
    await bandeja.cargar();
    ultimaCarga = Date.now();
    if (!bandeja.vista().errores.length) servicios.actualizarContadores?.({ [tipo]: bandeja.todos() });
  }

  /** Muestra la bandeja para los parámetros de la ruta; las listas se piden solo si la carga es antigua. */
  async function mostrar(nuevos, { forzar = false } = {}) {
    parametros = nuevos ?? {};
    if (raizVisible && raizVisible !== raiz) raizVisible.remove();
    raizVisible = raiz;
    if (!raiz.isConnected) contenedor.append(raiz);
    if (!bandeja) bandeja = crearBandeja({ tipo, apiRequest, usuarioId: usuarioId(), navegar });
    if (forzar || Date.now() - ultimaCarga > VIGENCIA_MS) await cargar();
    bandeja.mostrar(parametros);
    pintarPestanasYLista();
    await pintarDetalle();
    // Los nombres de los clientes llegan después y solo repintan la lista.
    await bandeja.cargarContextos();
    pintarPestanasYLista();
  }

  async function recargar() {
    await mostrar(parametros, { forzar: true });
  }

  /** Ejecuta una acción de la API: avisa, recarga y, si falla, deja el mensaje en su región role=alert. */
  async function ejecutar(accion, mensaje, boton, errorEl) {
    if (errorEl) errorEl.textContent = "";
    if (boton) boton.disabled = true;
    try {
      await accion();
      mostrarToast(mensaje, "exito");
      await recargar();
    } catch (error) {
      if (boton) boton.disabled = false;
      if (errorEl) errorEl.textContent = error.message;
      else mostrarToast(error.message, "error");
    }
  }

  const avisar = (errorEl, campo, texto) => {
    errorEl.textContent = texto;
    campo?.setAttribute("aria-invalid", "true");
    campo?.focus();
  };

  function respuestasApta(form) {
    const respuestas = {};
    for (const radio of form.querySelectorAll('input[type="radio"]:checked')) {
      respuestas[Number(radio.name.replace("apta-", ""))] = radio.value;
    }
    return respuestas;
  }

  raiz.addEventListener("click", (evento) => {
    const el = evento.target.closest("button, a");
    if (!el || !raiz.contains(el)) return;
    if (el.matches("[data-pestana]")) {
      bandeja.cambiarPestana(el.dataset.pestana);
      pintarPestanasYLista();
      return;
    }
    if (el.matches(".panel-bandeja-fila")) {
      enfocarTitulo = true;
      bandeja.elegir(Number(el.dataset.id));
      return;
    }
    if (el.matches("[data-volver-lista]")) {
      bandeja.volverALaLista();
      return;
    }
    if (el.matches("[data-reintentar]")) {
      void mostrar(parametros, { forzar: true });
      return;
    }
    if (el.matches("[data-tomar-reclamo]")) {
      void ejecutar(() => tomarReclamo(apiRequest, Number(el.dataset.tomarReclamo)), "Reclamo en atención.", el, null);
      return;
    }
    if (el.matches("[data-escalar-abrir]")) {
      const bloque = raiz.querySelector("#bandeja-escalar");
      bloque.hidden = !bloque.hidden;
      el.setAttribute("aria-expanded", String(!bloque.hidden));
      if (!bloque.hidden) bloque.querySelector("textarea").focus();
      return;
    }
    if (el.matches("[data-escalar-confirmar]")) {
      const form = el.closest("form");
      const motivo = form.querySelector("#bandeja-motivo-escalar");
      const error = form.querySelector("#bandeja-error-reclamo");
      if (!motivo.value.trim()) return avisar(error, motivo, "Indica el motivo del escalamiento.");
      void ejecutar(() => escalarReclamo(apiRequest, Number(form.dataset.reclamo), motivo.value),
        `Reclamo #${form.dataset.reclamo} escalado.`, el, error);
      return;
    }
    if (el.matches("[data-decidir]")) {
      const form = el.closest("form");
      const motivo = form.querySelector("#bandeja-decision");
      const error = form.querySelector("#bandeja-error-devolucion");
      const aprobar = el.dataset.decidir === "aprobar";
      // El backend acepta un motivo en ambas decisiones; para rechazar es obligatorio.
      if (!aprobar && !motivo.value.trim()) return avisar(error, motivo, "Escribe el motivo del rechazo.");
      void ejecutar(() => decidirDevolucion(apiRequest, Number(form.dataset.devolucion), aprobar, motivo.value),
        `Devolución #${form.dataset.devolucion} ${aprobar ? "aprobada" : "rechazada"}.`, el, error);
    }
    return undefined;
  });

  raiz.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const form = evento.target;
    const boton = form.querySelector('button[type="submit"]');
    if (form.id === "bandeja-form-responder") {
      const texto = form.querySelector("#bandeja-respuesta");
      const error = form.querySelector("#bandeja-error-reclamo");
      if (!texto.value.trim()) return avisar(error, texto, "Escribe la respuesta para el cliente.");
      const resuelto = form.querySelector("#bandeja-resuelto").checked;
      void ejecutar(() => responderReclamo(apiRequest, Number(form.dataset.reclamo), texto.value, resuelto),
        resuelto ? `Reclamo #${form.dataset.reclamo} resuelto.` : "Respuesta enviada al cliente.", boton, error);
    } else if (form.id === "bandeja-form-recepcion") {
      const error = form.querySelector("#bandeja-error-devolucion");
      const lineas = bandeja.vista().elegido?.lineas ?? [];
      const respuestas = respuestasApta(form);
      if (!recepcionCompleta(lineas, respuestas)) return avisar(error, null, "Indica si están aptas para la venta todas las líneas.");
      void ejecutar(() => recibirDevolucion(apiRequest, Number(form.dataset.devolucion), lineasRecepcion(lineas, respuestas)),
        `Devolución #${form.dataset.devolucion} cerrada y reembolsada.`, boton, error);
    }
    return undefined;
  });

  raiz.addEventListener("change", (evento) => {
    const form = evento.target.closest("#bandeja-form-recepcion");
    if (!form) return;
    const lineas = bandeja.vista().elegido?.lineas ?? [];
    const completa = recepcionCompleta(lineas, respuestasApta(form));
    const boton = form.querySelector('button[type="submit"]');
    const ayuda = form.querySelector("#bandeja-ayuda-recepcion");
    boton.disabled = !completa;
    // La ayuda solo se ve (y describe al botón) mientras falten respuestas.
    ayuda.hidden = completa;
    if (completa) boton.removeAttribute("aria-describedby");
    else boton.setAttribute("aria-describedby", "bandeja-ayuda-recepcion");
  });

  buscador.addEventListener("input", () => {
    if (!bandeja) return;
    bandeja.buscar(buscador.value);
    pintarPestanasYLista();
  });

  return { alMostrar: (nuevos) => mostrar(nuevos) };
}
