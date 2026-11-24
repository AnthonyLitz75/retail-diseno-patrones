/**
 * @file auditoria.js
 * Panel del personal (T10, spec 18): #/auditoria, solo ADMIN. crearPanelAdministracion no
 * incluye la auditoría (en la tienda se le añade desde fuera con agregarSeccion), así que esta
 * pantalla monta **una sola vez** crearPanelAuditoria (auditoria-vista.js, sin reescribir).
 * - El <h1> «Auditoría» y la frase de apoyo los pone el panel; el título propio del módulo se
 *   oculta desde panel.css.
 * - Envoltura: el botón «Descargar CSV» del módulo (con sus filtros activos) se lleva al
 *   encabezado, a la derecha. Tarjeta de filtros, botones de 44 px e insignias por data-accion
 *   van en panel.css.
 * - alMostrar llama a cargar() del módulo, que conserva los filtros (vuelve a la página 1).
 */

import { html } from "../../utilidades/seguridad.js";
import { renderizarCargando } from "../inicio/piezas-inicio.js";

const SELECTOR_BOTON_CSV = "form button[type=\"button\"]";

/** Encabezado de la pantalla con el hueco para «Descargar CSV». */
export function renderizarEncabezadoAuditoria() {
  return html`<header class="panel-encabezado panel-encabezado-acciones">
  <div>
    <h1 class="panel-titulo">Auditoría</h1>
    <p class="panel-apoyo">Registro de quién hizo qué en el sistema. Solo lectura.</p>
  </div>
  <div class="panel-acciones-encabezado" data-acciones-auditoria></div>
</header>`;
}

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function } }} contexto
 */
export function montar(contenedor, { servicios }) {
  contenedor.innerHTML = `${renderizarEncabezadoAuditoria()}<div data-cargando>${renderizarCargando()}</div>`;
  // auditoria-vista.js importa inventario-vista.js: se carga con import() solo al abrir la ruta.
  const promesaPanel = import("../../administracion/auditoria-vista.js").then(({ crearPanelAuditoria }) => {
    const panel = crearPanelAuditoria(servicios.apiRequest);
    contenedor.querySelector("[data-cargando]")?.remove();
    contenedor.append(panel.element);
    const botonCsv = panel.element.querySelector(SELECTOR_BOTON_CSV);
    if (botonCsv) contenedor.querySelector("[data-acciones-auditoria]")?.append(botonCsv);
    return panel;
  });

  return {
    async alMostrar() {
      const panel = await promesaPanel;
      await panel.cargar();
    },
  };
}
