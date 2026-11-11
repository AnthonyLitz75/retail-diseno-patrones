/**
 * @file mi-atencion.js
 * Spec 007 (T012, US2): pestaña "Mi atención" del cliente. Reúne en un acordeón sus
 * preguntas de productos, reclamos y devoluciones, con estado y respuesta. Los formularios
 * para crear reclamos y devoluciones siguen en cada pedido entregado ("Mis compras").
 */

import {
  etiquetaEstadoDevolucion,
  etiquetaEstadoReclamo,
  listarMisDevoluciones,
  listarMisReclamos,
} from "./atencion.js";
import { formatoPrecio } from "../utilidades/formato.js";

/** Estado visible de una pregunta de producto. */
export function etiquetaEstadoPregunta(pregunta) {
  return pregunta?.respuesta
    ? { texto: "Respondida", clase: "text-bg-success" }
    : { texto: "Pendiente", clase: "text-bg-warning" };
}

/** Resumen para el encabezado de cada sección: total y cuántos siguen abiertos. */
export function resumirAtenciones({ preguntas = [], reclamos = [], devoluciones = [] }) {
  return {
    preguntas: { total: preguntas.length, abiertos: preguntas.filter((p) => !p.respuesta).length },
    reclamos: { total: reclamos.length, abiertos: reclamos.filter((r) => r.estado !== "RESUELTO").length },
    devoluciones: {
      total: devoluciones.length,
      abiertos: devoluciones.filter((d) => d.estado === "SOLICITADA" || d.estado === "APROBADA").length,
    },
  };
}

function el(etiqueta, clase = "", texto = "") {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== "") nodo.textContent = texto;
  return nodo;
}

function fecha(valor) {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("es-PE") : "";
}

function item(titulo, etiqueta, lineas) {
  const li = el("li", "list-group-item px-0");
  const cabecera = el("div", "d-flex flex-wrap align-items-center gap-2");
  cabecera.append(el("span", "fw-semibold small", titulo), el("span", `badge rounded-pill ${etiqueta.clase}`, etiqueta.texto));
  li.append(cabecera);
  lineas.filter(Boolean).forEach((texto) => li.append(el("p", "small text-secondary mb-0 mt-1", texto)));
  return li;
}

function seccionAcordeon(id, titulo, resumen, elementos, vacio, abierta) {
  const contenedor = el("div", "accordion-item");
  const cabecera = el("h3", "accordion-header");
  const boton = el("button", `accordion-button${abierta ? "" : " collapsed"}`);
  boton.type = "button";
  boton.setAttribute("data-bs-toggle", "collapse");
  boton.setAttribute("data-bs-target", `#${id}`);
  boton.setAttribute("aria-expanded", String(abierta));
  boton.setAttribute("aria-controls", id);
  boton.textContent = `${titulo} (${resumen.total}${resumen.abiertos ? ` · ${resumen.abiertos} en curso` : ""})`;
  cabecera.append(boton);
  const panel = el("div", `accordion-collapse collapse${abierta ? " show" : ""}`);
  panel.id = id;
  const cuerpo = el("div", "accordion-body py-2");
  const lista = el("ul", "list-group list-group-flush");
  lista.replaceChildren(...(elementos.length ? elementos : [el("li", "list-group-item px-0 small text-secondary", vacio)]));
  cuerpo.append(lista);
  panel.append(cuerpo);
  contenedor.append(cabecera, panel);
  return contenedor;
}

export function configurarMiAtencion({ apiRequest, contenedor }) {
  if (!contenedor) return { cargar: async () => {} };

  const seccion = el("section", "card shadow-sm mb-4");
  seccion.setAttribute("aria-labelledby", "titulo-mi-atencion");
  const cuerpo = el("div", "card-body");
  const titulo = el("h2", "h4", "Mi atención");
  titulo.id = "titulo-mi-atencion";
  const ayuda = el("p", "small text-secondary", "Para registrar un reclamo o pedir una devolución, abre el pedido entregado en \"Mis compras\".");
  const estado = el("p", "small text-secondary mb-2");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");
  const acordeon = el("div", "accordion");
  acordeon.id = "acordeon-mi-atencion";
  cuerpo.append(titulo, ayuda, estado, acordeon);
  seccion.append(cuerpo);
  contenedor.replaceChildren(seccion);

  async function cargar() {
    estado.className = "small text-secondary mb-2";
    estado.textContent = "Cargando tu atención...";
    try {
      const [preguntas, reclamos, devoluciones] = await Promise.all([
        apiRequest("/api/preguntas/mis-preguntas").then((r) => r.json()),
        listarMisReclamos(apiRequest),
        listarMisDevoluciones(apiRequest),
      ]);
      const resumen = resumirAtenciones({ preguntas, reclamos, devoluciones });
      acordeon.replaceChildren(
        seccionAcordeon("atencion-reclamos", "Reclamos", resumen.reclamos,
          reclamos.map((r) => item(`#${r.id} · pedido #${r.pedidoId} · ${r.motivo}`, etiquetaEstadoReclamo(r.estado),
            [fecha(r.creadoEn), r.resolucionAdmin || r.respuesta ? `Respuesta: ${r.resolucionAdmin || r.respuesta}` : ""])),
          "Aún no registraste reclamos.", resumen.reclamos.abiertos > 0),
        seccionAcordeon("atencion-devoluciones", "Devoluciones", resumen.devoluciones,
          devoluciones.map((d) => item(`#${d.id} · pedido #${d.pedidoId} · ${formatoPrecio(d.importeReembolso)}`,
            etiquetaEstadoDevolucion(d.estado),
            [(d.lineas || []).map((l) => `${l.cantidad} × ${l.nombreProducto}`).join(", "),
              d.observacion ? `Soporte: ${d.observacion}` : ""])),
          "Aún no solicitaste devoluciones.", resumen.devoluciones.abiertos > 0),
        seccionAcordeon("atencion-preguntas", "Preguntas sobre productos", resumen.preguntas,
          preguntas.map((p) => item(p.nombreProducto, etiquetaEstadoPregunta(p),
            [p.pregunta, p.respuesta ? `Respuesta: ${p.respuesta}` : ""])),
          "Aún no hiciste preguntas.", false),
      );
      estado.textContent = "";
    } catch (error) {
      estado.className = "small text-danger mb-2";
      estado.textContent = `No se pudo cargar tu atención. ${error.message}`;
    }
  }

  return { cargar };
}
