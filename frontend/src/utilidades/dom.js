/**
 * @file dom.js
 * Ayudas de construcción del DOM compartidas por las vistas. El texto siempre va por
 * textContent, nunca por innerHTML, así que no hay riesgo de inyectar HTML.
 */

/**
 * Crea un elemento con clase y texto opcionales.
 * @param {string} etiqueta - Nombre de la etiqueta HTML ("div", "p", "button"...)
 * @param {string} [clase=""] - Clases CSS separadas por espacio
 * @param {string|number} [texto=""] - Texto visible; 0 se muestra, null/undefined/"" no
 * @returns {HTMLElement}
 */
export function crearElemento(etiqueta, clase = "", texto = "") {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto != null && texto !== "") nodo.textContent = String(texto);
  return nodo;
}
