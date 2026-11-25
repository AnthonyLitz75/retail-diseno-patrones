/**
 * @file consulta-vista.js
 * Panel del personal (rediseño v6): marcado de «Consulta de pedido». Funciones puras con el
 * texto escapado; el montaje y la petición están en pantallas/soporte.js.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { formatoPrecio } from "../../utilidades/formato.js";
import { icono } from "../iconos.js";
import { formatearFechaHora } from "../utilidades-panel.js";
import { cuadroIcono } from "../inicio/piezas-inicio.js";
import { esperaDe } from "../inicio/soporte-logica.js";
import { atencionesDelPedido, insigniasDelPedido, pasosSeguimiento, resumenPago } from "./consulta-logica.js";

const insignia = ({ texto, variante }) => html`<span class="panel-insignia panel-insignia-${variante}">${texto}</span>`;

/** Estado inicial, sin pedido en la URL. */
export function renderizarEstadoVacioConsulta() {
  return html`<div class="panel-tarjeta panel-vacio-ok">${seguro(cuadroIcono("consulta-pedido", "gris"))}<p>Escribe un número de pedido para ver su detalle.</p></div>`;
}

export function renderizarCargandoConsulta(numero) {
  return html`<p class="panel-cargando">Cargando el pedido #${numero}…</p>`;
}

export function renderizarErrorConsulta(numero, mensaje) {
  return html`<div class="panel-tarjeta panel-error"><p class="mb-0">No se pudo cargar el pedido #${numero}. ${mensaje}</p></div>`;
}

/** Línea de tiempo: lista ordenada de pasos con círculo, fecha y detalle. */
export function renderizarSeguimiento(pasos) {
  const items = pasos.map((p) => {
    const fecha = p.fecha
      ? html`<time class="panel-paso-fecha" datetime="${p.fecha}">${formatearFechaHora(p.fecha)}</time>`
      : html`<span class="panel-paso-fecha">Pendiente</span>`;
    const detalle = p.detalle ? html`<span class="panel-paso-detalle">${p.detalle}</span>` : "";
    return html`<li class="panel-paso panel-paso-${p.estado}">
    <span class="panel-paso-circulo" aria-hidden="true">${seguro(icono(p.icono))}</span>
    <span class="panel-paso-etiqueta">${p.etiqueta}</span>
    ${seguro(fecha)}
    ${seguro(detalle)}
  </li>`;
  });
  return html`<ol class="panel-seguimiento" aria-label="Seguimiento del pedido">${seguro(items.join(""))}</ol>`;
}

function tablaProductos(pedido) {
  const filas = (pedido.productos ?? []).map((p) => html`<tr>
    <th scope="row">${p.nombreProducto}</th>
    <td class="panel-num">${p.cantidad}</td>
    <td class="panel-num">${formatoPrecio(p.precioUnitario)}</td>
    <td class="panel-num">${formatoPrecio(p.subtotal)}</td>
  </tr>`);
  return html`<div class="panel-tabla-contenedor">
  <table class="panel-tabla panel-tabla-productos">
    <thead><tr><th scope="col">Producto</th><th scope="col" class="panel-num">Cantidad</th><th scope="col" class="panel-num">Precio</th><th scope="col" class="panel-num">Subtotal</th></tr></thead>
    <tbody>${seguro(filas.join(""))}</tbody>
    <tfoot><tr><th scope="row" colspan="3">Total</th><td class="panel-num">${formatoPrecio(pedido.total)}</td></tr></tfoot>
  </table>
</div>`;
}

function bloquePago(pago) {
  const r = resumenPago(pago);
  const resumen = r.monto == null ? r.titulo : `${r.titulo} · ${formatoPrecio(r.monto)}`;
  const reembolso = r.reembolsado > 0 ? html`<p class="panel-pago-detalle">Reembolsado ${formatoPrecio(r.reembolsado)}</p>` : "";
  const nota = r.nota ? html`<p class="panel-pago-nota">No hay cobros duplicados registrados en el sistema.</p>` : "";
  return html`<p class="panel-pago-resumen">${resumen}</p>${seguro(reembolso)}${seguro(nota)}`;
}

function bloqueAtenciones(contexto) {
  const lista = atencionesDelPedido(contexto);
  if (!lista.length) return '<p class="panel-vacio">Este pedido no tiene reclamos ni devoluciones.</p>';
  const filas = lista.map((a) => html`<li class="panel-atencion-pedido">
    <p><strong>${a.tipo} #${a.id}</strong> · ${a.motivo}</p>
    ${seguro(insignia(a.insignia))}
    <a class="panel-enlace" href="${seguro(a.ruta)}">Ver detalle</a>
  </li>`);
  return html`<ul class="panel-atenciones">${seguro(filas.join(""))}</ul>`;
}

/**
 * Pantalla completa de un pedido a partir de su contexto de Soporte.
 * @param {{ pedido: object, pago: object|null, reclamos: Array, devoluciones: Array }} contexto
 * @param {Date} [ahora]
 */
export function renderizarConsultaPedido(contexto, ahora = new Date()) {
  const { pedido, pago } = contexto;
  const insignias = insigniasDelPedido(contexto).map(insignia).join("");
  return html`<div class="panel-consulta-pedido">
  <section class="panel-tarjeta panel-ficha" aria-label="Ficha del pedido">
    <div>
      <p class="panel-ficha-pedido">Pedido #${pedido.idPedido} · ${esperaDe(pedido.creadoEn, ahora).texto}</p>
      <h2 class="panel-ficha-cliente">${pedido.clienteNombre}</h2>
      <p class="panel-ficha-correo">${pedido.clienteCorreo}</p>
    </div>
    <div class="panel-ficha-insignias">${seguro(insignias)}</div>
  </section>
  <section class="panel-tarjeta" aria-labelledby="consulta-titulo-seguimiento">
    <h2 id="consulta-titulo-seguimiento" class="panel-subtitulo">Seguimiento</h2>
    ${seguro(renderizarSeguimiento(pasosSeguimiento(pedido, pago)))}
  </section>
  <div class="panel-consulta-columnas">
    <section class="panel-tarjeta" aria-labelledby="consulta-titulo-productos">
      <h2 id="consulta-titulo-productos" class="panel-subtitulo">Productos</h2>
      ${seguro(tablaProductos(pedido))}
    </section>
    <div class="panel-consulta-lateral">
      <section class="panel-tarjeta" aria-labelledby="consulta-titulo-pago">
        <h2 id="consulta-titulo-pago" class="panel-subtitulo">Pago</h2>
        ${seguro(bloquePago(pago))}
      </section>
      <section class="panel-tarjeta" aria-labelledby="consulta-titulo-atenciones">
        <h2 id="consulta-titulo-atenciones" class="panel-subtitulo">Atenciones del pedido</h2>
        ${seguro(bloqueAtenciones(contexto))}
      </section>
    </div>
  </div>
</div>`;
}
