/**
 * Módulo Orquestador del Layout Principal de Píxel Andino Tech Store.
 * Ensambla de forma modular y desacoplada la estructura visual completa:
 * - Cabecera (Header de 2 niveles y navegación)
 * - Hero comercial y Bento grid
 * - Contenedor principal (Vitrina, Catálogo, Vistas operativas y Carrito Drawer)
 * - Pie de página (Footer corporativo)
 * - Modales de la aplicación (plantilla HTML pura importada con ?raw)
 * - Docks flotantes de utilidades y redes sociales (plantilla HTML pura importada con ?raw)
 */

import { renderizarHeader } from './header.js';
import { renderizarHero } from './hero.js';
import { renderizarCatalogoLayout } from './catalogo-layout.js';
import { renderizarFooter } from './footer.js';
import modalesHtml from './plantillas/modales.html?raw';
import docksHtml from './plantillas/docks.html?raw';

/**
 * Compone el markup HTML completo de la aplicación.
 *
 * @returns {string} Markup HTML ensamblado
 */
export function renderizarLayoutPrincipal() {
  const heroHtml = renderizarHero();
  const cuerpoHtml = renderizarCatalogoLayout({ heroHtml });
  const headerHtml = renderizarHeader();
  const footerHtml = renderizarFooter();

  // RNF06: primer elemento del tabulador; evita recorrer toda la cabecera en cada página.
  return `
    <a class="saltar-contenido" href="#contenido-principal" data-saltar-a="contenido-principal">Saltar al contenido</a>
    ${headerHtml}
    ${cuerpoHtml}
    ${footerHtml}
    ${modalesHtml}
    ${docksHtml}
  `.trim();
}

/**
 * Monta el layout en el elemento raíz del DOM especificado.
 *
 * @param {HTMLElement|string} elementoOSelector - Contenedor raíz o selector CSS
 */
export function montarLayoutPrincipal(elementoOSelector) {
  const contenedor = typeof elementoOSelector === 'string'
    ? document.querySelector(elementoOSelector)
    : elementoOSelector;

  if (!contenedor) {
    throw new Error(`No se encontró el contenedor para montar el layout principal.`);
  }

  contenedor.innerHTML = renderizarLayoutPrincipal();
}
