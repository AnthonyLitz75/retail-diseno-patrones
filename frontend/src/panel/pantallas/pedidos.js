/**
 * @file pedidos.js
 * Panel del personal (T06c): #/pedidos monta el módulo de pedidos existente
 * (configurarControladorPedidos) sobre el mismo HTML que la tienda (vistas-personal.js).
 * La lógica del módulo no cambia; solo dónde se monta.
 */

import { renderizarVistaPedidos } from "../../layout/vistas-personal.js";
import { configurarControladorPedidos } from "../../pedidos/pedidos-controlador.js";

/** Ids que el módulo necesita (los mismos que main.js le pasa en la tienda). */
export const IDS_PEDIDOS = Object.freeze(["seccion-pedidos", "titulo-pedidos", "estado-pedidos", "lista-pedidos"]);

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function, estado: object, Modal?: object, cambiarVista: Function } }} contexto
 */
export function montar(contenedor, { servicios }) {
  const { apiRequest, estado, Modal, cambiarVista } = servicios;
  contenedor.innerHTML = renderizarVistaPedidos();
  // Mismo mecanismo que la tienda: la vista se muestra quitando el atributo hidden.
  contenedor.querySelector("#vista-pedidos").hidden = false;
  const [seccionPedidos, tituloPedidos, estadoPedidos, listaPedidos] =
    IDS_PEDIDOS.map((id) => contenedor.querySelector(`#${id}`));

  const controlador = configurarControladorPedidos({
    apiRequest,
    Modal,
    obtenerEstado: () => estado,
    elementos: { seccionPedidos, tituloPedidos, estadoPedidos, listaPedidos },
    acciones: { cambiarVista },
  });

  return { alMostrar: () => controlador.cargarPedidos() };
}
