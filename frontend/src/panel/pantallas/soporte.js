/**
 * @file soporte.js
 * Panel del personal (T08, decisiones P1 y P8): #/reclamos, #/devoluciones y
 * #/consulta-pedido comparten **un solo** portal de Soporte (configurarPortalSoporte) sobre el
 * HTML compartido (vistas-personal.js). El router monta un contenedor por ruta con su <h1>;
 * al mostrarse, la ruta se lleva el portal a su contenedor y oculta desde fuera (con
 * data-bandeja, ver panel.css) las tarjetas que no le tocan. soporte-vista.js no cambia.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { renderizarVistaSoporte } from "../../layout/vistas-personal.js";
import { configurarPortalSoporte } from "../../soporte/soporte-vista.js";
import { validarNumeroPedido } from "../inicio/soporte-logica.js";
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

/** Valor de data-ruta-soporte cuando no se muestra ninguna bandeja. */
const SIN_BANDEJA = "consulta";

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

/** Cabecera de #/consulta-pedido: <h1> y el formulario propio del panel (decisión 8 revisada). */
export function renderizarCabeceraConsulta() {
  return html`<h1 class="panel-titulo">${TITULO_POR_RUTA[RUTA_CONSULTA]}</h1>
${seguro(renderizarBusquedaPedido(PREFIJO_CONSULTA))}`;
}

/** Portal único, creado la primera vez que una de las tres rutas se muestra. */
let compartido = null;

function obtenerPortal(servicios) {
  const { apiRequest, estado, mostrarToast } = servicios;
  if (!compartido) {
    const plantilla = document.createElement("div");
    plantilla.innerHTML = renderizarVistaSoporte();
    const vista = plantilla.firstElementChild;
    // Mismo mecanismo que la tienda: la vista se muestra quitando el atributo hidden.
    vista.hidden = false;
    const portal = configurarPortalSoporte({
      apiRequest, obtenerEstado: () => estado, contenedor: vista, mostrarToast, alVerPedido: alVerPedidoDelPanel(servicios.navegar),
    });
    compartido = { vista, portal };
  }
  return compartido;
}

/**
 * @param {HTMLElement} contenedor
 * @param {{ entrada: { ruta: string }, servicios: object }} contexto
 */
export function montar(contenedor, { entrada, servicios }) {
  const { ruta } = entrada;
  const esConsulta = ruta === RUTA_CONSULTA;
  contenedor.innerHTML = esConsulta
    ? renderizarCabeceraConsulta()
    : html`<h1 class="panel-titulo">${TITULO_POR_RUTA[ruta]}</h1>`;
  // El formulario solo navega a #/consulta-pedido?pedido={n}; quien consulta es el router
  // (a través de alMostrar), nunca el formulario.
  const busqueda = esConsulta ? conectarBusquedaPedido(contenedor, PREFIJO_CONSULTA, servicios.navegar) : null;

  return {
    alMostrar(parametros) {
      const { vista, portal } = obtenerPortal(servicios);
      contenedor.append(vista); // mueve el único portal a la ruta visible (ids sin duplicar)
      const bandeja = bandejaDeRuta(ruta);
      vista.dataset.rutaSoporte = bandeja ?? SIN_BANDEJA;
      if (bandeja) {
        // Recarga solo la bandeja visible con su propio botón «Actualizar».
        vista.querySelector(`[data-bandeja="${bandeja}"] button`)?.click();
        return;
      }
      // Sin error visible hasta que se envíe; el campo refleja el pedido de la URL.
      busqueda.limpiarError();
      busqueda.campo.value = valorCampoConsulta(parametros);
      const pedido = pedidoDeConsulta(parametros);
      if (pedido) portal.mostrarContexto(pedido);
    },
  };
}
