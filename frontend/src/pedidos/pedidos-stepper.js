/**
 * Constantes de los 4 pasos del ciclo de vida del pedido en el patrón State.
 */
import { ESTADO_PEDIDO } from "../utilidades/constantes.js"
export const ETAPAS_PEDIDO = [
  {
    clave: ESTADO_PEDIDO.PENDIENTE,
    etiqueta: "Confirmado",
    subtitulo: "Orden recibida",
    icono: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/><path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/><path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/></svg>`
  },
  {
    clave: ESTADO_PEDIDO.EN_PREPARACION,
    etiqueta: "En preparación",
    subtitulo: "Empacando productos",
    icono: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/></svg>`
  },
  {
    clave: ESTADO_PEDIDO.DESPACHADO,
    etiqueta: "En camino",
    subtitulo: "En ruta de entrega",
    icono: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-4 0 1 1 0 0 1-1-1V3.5zM1.5 3a.5.5 0 0 0-.5.5v7c0 .179.094.336.236.425a2 2 0 0 1 2.528 0 .5.5 0 0 0 .236-.425V3.5a.5.5 0 0 0-.5-.5h-2zm9.5 0H2v8.075a2 2 0 0 1 1 .925h6a2 2 0 0 1 1-.925V3zm1 3v2h2.55l-1.6-2H12zm2.55 3H12v2h2.5a.5.5 0 0 0 .5-.5V9.5a.5.5 0 0 0-.45-.5zM3 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/></svg>`
  },
  {
    clave: ESTADO_PEDIDO.ENTREGADO,
    etiqueta: "Entregado",
    subtitulo: "Recibido con éxito",
    icono: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/></svg>`
  }
];

const ORDEN_ESTADOS = {
  PENDIENTE: 0,
  EN_PREPARACION: 1,
  DESPACHADO: 2,
  ENTREGADO: 3
};

/**
 * Calcula el progreso numérico y el estado de cada etapa para un pedido.
 * @param {string} estado - Estado actual del pedido
 * @returns {object} Metadata del progreso del pedido
 */
export function calcularProgresoPedido(estado) {
  if (estado === ESTADO_PEDIDO.CANCELADO) {
    return {
      esCancelado: true,
      porcentaje: 0,
      pasoActivo: -1,
      pasos: ETAPAS_PEDIDO.map((e) => ({
        ...e,
        estado: "cancelled"
      }))
    };
  }

  const indiceActual = ORDEN_ESTADOS[estado] ?? 0;
  const porcentaje = (indiceActual / (ETAPAS_PEDIDO.length - 1)) * 100;

  const pasos = ETAPAS_PEDIDO.map((etapa, idx) => {
    let estadoPaso = "pending";
    if (idx < indiceActual || (estado === ESTADO_PEDIDO.ENTREGADO && idx === indiceActual)) {
      estadoPaso = "completed";
    } else if (idx === indiceActual) {
      estadoPaso = "current";
    }
    return {
      ...etapa,
      estado: estadoPaso
    };
  });

  return {
    esCancelado: false,
    porcentaje,
    pasoActivo: indiceActual,
    pasos
  };
}

/**
 * Genera el marcado HTML para la barra visual del stepper de un pedido.
 * @param {string} estado - Estado del pedido
 * @returns {string} Marcado HTML con clases Bootstrap y componentes visuales
 */
export function renderizarStepperPedido(estado) {
  const progreso = calcularProgresoPedido(estado);

  if (progreso.esCancelado) {
    return `
      <div class="order-cancelled-banner" role="alert">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-x-circle-fill flex-shrink-0" viewBox="0 0 16 16">
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
        </svg>
        <div>
          <strong class="d-block mb-1">Pedido Cancelado</strong>
          <small class="text-danger-emphasis">Esta orden fue cancelada. El stock reservado ha sido restituido al inventario.</small>
        </div>
      </div>
    `;
  }

  const pasosHtml = progreso.pasos
    .map((paso, idx) => {
      const clasePaso =
        paso.estado === "completed"
          ? "is-completed"
          : paso.estado === "current"
            ? "is-current"
            : "";

      const iconoRender =
        paso.estado === "completed"
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>`
          : paso.icono;

      return `
      <div class="order-step ${clasePaso}" data-step="${idx + 1}" data-clave="${paso.clave}">
        <div class="order-step-node" aria-hidden="true">
          ${iconoRender}
        </div>
        <span class="order-step-label">${paso.etiqueta}</span>
      </div>
    `;
    })
    .join("");

  return `
    <div class="order-stepper-container my-3">
      <div class="order-stepper" aria-label="Progreso del pedido">
        <div class="order-stepper-track">
          <div class="order-stepper-progress" style="width: ${progreso.porcentaje}%;"></div>
        </div>
        ${pasosHtml}
      </div>
    </div>
  `;
}
