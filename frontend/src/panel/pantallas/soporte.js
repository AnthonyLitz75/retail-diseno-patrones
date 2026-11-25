/**
 * @file soporte.js
 * Panel del personal (T08, decisiones P1 y P8; rediseño v6): #/reclamos y #/devoluciones son
 * bandejas de dos paneles (bandeja-montaje.js: pestañas por estado, buscador, lista y detalle; el
 * elemento elegido va en ?id=) y #/consulta-pedido es la consulta de un pedido (consulta-vista.js).
 * El router monta un contenedor por ruta con su <h1>. El portal antiguo de soporte-vista.js ya no
 * se usa en el panel; de él se conservan las reglas (accionesReclamo, accionDevolucion) y las
 * llamadas a la API de atencion.js.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { montarBandeja } from "./bandeja-montaje.js";
import { consultarContextoPedido } from "../../atencion/atencion.js";
import { validarNumeroPedido } from "../inicio/soporte-logica.js";
import { renderizarCargandoConsulta, renderizarConsultaPedido, renderizarErrorConsulta, renderizarEstadoVacioConsulta } from "./consulta-vista.js";
import { conectarBusquedaPedido, renderizarBusquedaPedido } from "../inicio/busqueda-pedido.js";

export const TITULO_POR_RUTA = Object.freeze({
  "#/reclamos": "Reclamos",
  "#/devoluciones": "Devoluciones",
  "#/consulta-pedido": "Consulta de pedido",
});

const BANDEJA_POR_RUTA = Object.freeze({
  "#/reclamos": "reclamos",
  "#/devoluciones": "devoluciones",
});

/** Bandeja que muestra la ruta; null en la consulta de pedido (ninguna). */
export function bandejaDeRuta(ruta) {
  return BANDEJA_POR_RUTA[ruta] ?? null;
}

/** Número de pedido válido de ?pedido=…, o null si falta o no es válido (no se consulta). */
export function pedidoDeConsulta(parametros) {
  const resultado = validarNumeroPedido(parametros?.pedido);
  return resultado.valido ? resultado.numero : null;
}

const RUTA_CONSULTA = "#/consulta-pedido";

/**
 * «Ver pedido #n» de las bandejas: en el panel la tarjeta de contexto está oculta, así que se abre
 * la consulta de pedido (con entrada de historial, para que «Atrás» vuelva a la bandeja).
 */
export const alVerPedidoDelPanel = (navegar) => (pedidoId) => navegar(`${RUTA_CONSULTA}?pedido=${pedidoId}`);
const PREFIJO_CONSULTA = "consulta";

/** Valor del campo al mostrar la consulta: el pedido válido de la URL o vacío. */
export function valorCampoConsulta(parametros) {
  const pedido = pedidoDeConsulta(parametros);
  return pedido ? String(pedido) : "";
}

/**
 * Cabecera de #/consulta-pedido: <h1> a la izquierda y el formulario propio del panel («Número de
 * pedido» y «Buscar») a la derecha.
 */
export function renderizarCabeceraConsulta() {
  return html`<header class="panel-encabezado panel-encabezado-acciones">
  <h1 class="panel-titulo">${TITULO_POR_RUTA[RUTA_CONSULTA]}</h1>
  ${seguro(renderizarBusquedaPedido(PREFIJO_CONSULTA, { etiqueta: "Número de pedido" }))}
</header>`;
}

/**
 * @param {HTMLElement} contenedor
 * @param {{ entrada: { ruta: string }, servicios: object }} contexto
 */
export function montar(contenedor, { entrada, servicios }) {
  const { ruta } = entrada;
  const esConsulta = ruta === RUTA_CONSULTA;
  contenedor.innerHTML = esConsulta
    ? `${renderizarCabeceraConsulta()}<div id="consulta-resultado" aria-live="polite">${renderizarEstadoVacioConsulta()}</div>`
    : html`<h1 class="panel-titulo">${TITULO_POR_RUTA[ruta]}</h1>`;
  // El formulario solo navega a #/consulta-pedido?pedido={n}; quien consulta es el router
  // (a través de alMostrar), nunca el formulario.
  const busqueda = esConsulta ? conectarBusquedaPedido(contenedor, PREFIJO_CONSULTA, servicios.navegar) : null;
  const bandejaMontada = bandejaDeRuta(ruta) ? montarBandeja(contenedor, { tipo: bandejaDeRuta(ruta), servicios }) : null;

  const resultado = esConsulta ? contenedor.querySelector("#consulta-resultado") : null;
  /** Evita que una respuesta tardía pise a una consulta más reciente. */
  let consultaActual = 0;

  /** Pide el contexto del pedido y pinta la ficha, el seguimiento, los productos y las atenciones. */
  async function consultar(pedido) {
    const consulta = ++consultaActual;
    resultado.innerHTML = renderizarCargandoConsulta(pedido);
    try {
      const contexto = await consultarContextoPedido(servicios.apiRequest, pedido);
      if (consulta === consultaActual) resultado.innerHTML = renderizarConsultaPedido(contexto);
    } catch (error) {
      if (consulta === consultaActual) resultado.innerHTML = renderizarErrorConsulta(pedido, error.message);
    }
  }

  return {
    alMostrar(parametros) {
      if (esConsulta) {
        // Sin error visible hasta que se envíe; el campo refleja el pedido de la URL.
        busqueda.limpiarError();
        busqueda.campo.value = valorCampoConsulta(parametros);
        const pedido = pedidoDeConsulta(parametros);
        if (pedido) return consultar(pedido);
        consultaActual += 1;
        resultado.innerHTML = renderizarEstadoVacioConsulta();
        return undefined;
      }
      return bandejaMontada.alMostrar(parametros);
    },
  };
}
