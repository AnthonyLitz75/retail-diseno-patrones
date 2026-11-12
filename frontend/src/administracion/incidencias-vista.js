/**
 * @file incidencias-vista.js
 * Spec 006 (T014, T013): el administrador resuelve los reclamos escalados (o los devuelve
 * a Soporte con instrucciones) y reasigna los reclamos de agentes desactivados.
 */

import {
  etiquetaEstadoReclamo,
  listarIncidencias,
  listarReclamosSinAgente,
  reasignarReclamo,
  resolverIncidencia,
} from "../atencion/atencion.js";
import { listarCuentas } from "./administracion.js";
import { crearElemento as el } from "../utilidades/dom.js";
import { ROL } from "../utilidades/constantes.js";

/** Agentes a los que se puede reasignar: SOPORTE activos, ordenados por nombre. */
export function agentesDisponibles(cuentas) {
  return (Array.isArray(cuentas) ? cuentas : [])
    .filter((c) => c.rol === ROL.SOPORTE && c.activo)
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
}

function estadoAccesible() {
  const p = el("p", "small mb-0 mt-1");
  p.setAttribute("role", "status");
  p.setAttribute("aria-live", "polite");
  return p;
}

export function crearPanelIncidencias(apiRequest, mostrarToast) {
  const seccion = el("section", "card shadow-sm mb-4");
  seccion.id = "seccion-incidencias-admin";
  seccion.setAttribute("aria-labelledby", "titulo-incidencias-admin");
  seccion.hidden = true;
  const cuerpo = el("div", "card-body");
  const cabecera = el("div", "d-flex flex-wrap align-items-center justify-content-between gap-2");
  const titulo = el("h2", "h5 mb-0", "Incidencias de atención");
  titulo.id = "titulo-incidencias-admin";
  const actualizar = el("button", "btn btn-outline-primary btn-sm", "Actualizar");
  actualizar.type = "button";
  cabecera.append(titulo, actualizar);
  const estadoGeneral = estadoAccesible();
  const listaEscalados = el("div", "list-group mb-3");
  const listaSinAgente = el("div", "list-group");
  cuerpo.append(
    cabecera,
    estadoGeneral,
    el("h3", "h6 mt-3", "Reclamos escalados"),
    listaEscalados,
    el("h3", "h6 mt-3", "Reclamos de agentes desactivados"),
    listaSinAgente,
  );
  seccion.append(cuerpo);

  async function ejecutar(accion, mensaje, control, estado) {
    control.disabled = true;
    try {
      await accion();
      mostrarToast?.(mensaje, "exito");
      await cargar();
    } catch (error) {
      estado.className = "small mb-0 mt-1 text-danger";
      estado.textContent = error.message;
      control.disabled = false;
    }
  }

  function encabezado(reclamo) {
    const item = el("article", "list-group-item");
    const fila = el("div", "d-flex flex-wrap align-items-center gap-2");
    const { texto, clase } = etiquetaEstadoReclamo(reclamo.estado);
    fila.append(
      el("span", "fw-semibold", `Reclamo #${reclamo.id} · pedido #${reclamo.pedidoId}`),
      el("span", `badge rounded-pill ${clase}`, texto),
    );
    item.append(fila, el("p", "small mb-1 mt-2", `${reclamo.motivo}: ${reclamo.descripcion}`));
    if (reclamo.respuesta) item.append(el("p", "small text-secondary mb-1", `Soporte respondió: ${reclamo.respuesta}`));
    return item;
  }

  function tarjetaEscalado(reclamo) {
    const item = encabezado(reclamo);
    if (reclamo.motivoEscalamiento) {
      item.append(el("p", "small text-danger mb-1", `Motivo del escalamiento: ${reclamo.motivoEscalamiento}`));
    }
    const form = el("form", "mt-2");
    const texto = el("textarea", "form-control form-control-sm");
    texto.id = `resolucion-${reclamo.id}`;
    texto.rows = 2;
    texto.maxLength = 2000;
    texto.required = true;
    texto.placeholder = "Resolución para el cliente o instrucciones para Soporte";
    const label = el("label", "form-label small fw-semibold mb-1", "Resolución");
    label.htmlFor = texto.id;
    const envoltura = el("div", "form-check mt-2");
    const devolver = el("input", "form-check-input");
    devolver.type = "checkbox";
    devolver.id = `devolver-${reclamo.id}`;
    const labelDevolver = el("label", "form-check-label small", "Devolver a Soporte con estas instrucciones");
    labelDevolver.htmlFor = devolver.id;
    envoltura.append(devolver, labelDevolver);
    const enviar = el("button", "btn btn-primary btn-sm mt-2", "Registrar resolución");
    enviar.type = "submit";
    const estado = estadoAccesible();
    form.append(label, texto, envoltura, enviar, estado);
    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      void ejecutar(
        () => resolverIncidencia(apiRequest, reclamo.id, texto.value, devolver.checked),
        devolver.checked ? `Reclamo #${reclamo.id} devuelto a Soporte.` : `Reclamo #${reclamo.id} resuelto.`,
        enviar, estado);
    });
    item.append(form);
    return item;
  }

  function tarjetaSinAgente(reclamo, agentes) {
    const item = encabezado(reclamo);
    const form = el("form", "mt-2 d-flex flex-wrap align-items-center gap-2");
    const select = el("select", "form-select form-select-sm w-auto");
    select.required = true;
    select.setAttribute("aria-label", `Nuevo agente para el reclamo ${reclamo.id}`);
    select.append(new Option("Elige un agente de soporte", ""));
    agentes.forEach((a) => select.append(new Option(`${a.nombre} (${a.correo})`, String(a.idUsuario))));
    const enviar = el("button", "btn btn-primary btn-sm", "Reasignar");
    enviar.type = "submit";
    enviar.disabled = agentes.length === 0;
    const estado = estadoAccesible();
    if (agentes.length === 0) estado.textContent = "No hay agentes de soporte activos; registra uno en Cuentas.";
    form.append(select, enviar, estado);
    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      void ejecutar(() => reasignarReclamo(apiRequest, reclamo.id, select.value),
        `Reclamo #${reclamo.id} reasignado.`, enviar, estado);
    });
    item.append(form);
    return item;
  }

  function vacio(texto) {
    return el("p", "list-group-item small text-secondary mb-0", texto);
  }

  async function cargar() {
    estadoGeneral.className = "small mb-0 mt-1 text-secondary";
    estadoGeneral.textContent = "Cargando incidencias...";
    try {
      const [escalados, sinAgente, cuentas] = await Promise.all([
        listarIncidencias(apiRequest),
        listarReclamosSinAgente(apiRequest),
        listarCuentas(apiRequest),
      ]);
      const agentes = agentesDisponibles(cuentas);
      listaEscalados.replaceChildren(...(escalados.length ? escalados.map(tarjetaEscalado) : [vacio("No hay reclamos escalados.")]));
      listaSinAgente.replaceChildren(...(sinAgente.length
        ? sinAgente.map((r) => tarjetaSinAgente(r, agentes))
        : [vacio("Ningún reclamo quedó sin agente activo.")]));
      estadoGeneral.textContent = `Escalados: ${escalados.length} · sin agente: ${sinAgente.length}`;
    } catch (error) {
      estadoGeneral.className = "small mb-0 mt-1 text-danger";
      estadoGeneral.textContent = `No se pudieron cargar las incidencias. ${error.message}`;
    }
  }

  actualizar.addEventListener("click", () => void cargar());
  return { element: seccion, cargar };
}
