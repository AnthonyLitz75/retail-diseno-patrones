/**
 * @file titulo-pantalla.js
 * Panel del personal (tanda 1, F2): el <h1> de las pantallas que montan un módulo existente
 * (pedidos, productos, consultas, inventario). Lleva el nombre del ítem del menú, igual que
 * ya hacen Soporte y Administración; el título propio del módulo (h2) se oculta con panel.css.
 */

import { html } from "../../utilidades/seguridad.js";

/**
 * @param {{ etiqueta: string }} entrada ítem del menú de la ruta (llega en el contexto de montar)
 * @returns {string}
 */
export function encabezadoPantalla(entrada) {
  return html`<h1 class="panel-titulo">${entrada.etiqueta}</h1>`;
}
