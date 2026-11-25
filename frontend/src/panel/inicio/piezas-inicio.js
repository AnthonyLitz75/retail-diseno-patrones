/**
 * @file piezas-inicio.js
 * Panel del personal: piezas de marcado compartidas por las pantallas de Inicio de cada rol
 * (indicador, «Cargando…», error con «Reintentar»). Puras: devuelven texto escapado.
 */

import { html } from "../../utilidades/seguridad.js";
import { icono } from "../iconos.js";

export const SIN_VALOR = "—";

export function renderizarCargando() {
  return '<p class="panel-cargando">Cargando…</p>';
}

/** Error de un bloque con «Reintentar»; `fuente` dice qué recargar (data-reintentar). */
export function renderizarErrorBloque(fuente) {
  return html`<div class="panel-error">
  <p class="mb-0">No se pudo cargar.</p>
  <button type="button" class="panel-boton panel-boton-secundario" data-reintentar="${fuente}">Reintentar</button>
</div>`;
}

/** Tarjeta de indicador: etiqueta, valor y detalle. */
export function renderizarKpi(etiqueta, valor, detalle) {
  return html`<article class="panel-kpi">
  <p class="panel-kpi-etiqueta">${etiqueta}</p>
  <p class="panel-kpi-valor">${valor}</p>
  <p class="panel-kpi-detalle">${detalle}</p>
</article>`;
}

/** Cuadro de icono (decorativo) de un tono: azul, verde, cielo, gris, rojo, ámbar, alerta o urgente. */
export const cuadroIcono = (nombre, tono, extra = "") =>
  `<span class="panel-icono-cuadro${extra} panel-icono-${tono}" aria-hidden="true">${icono(nombre)}</span>`;
