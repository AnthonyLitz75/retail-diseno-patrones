/**
 * @file bandeja-vista.js
 * Panel del personal (rediseño v6, tanda 2): marcado de las bandejas de Reclamos y Devoluciones
 * de dos paneles. Funciones puras que devuelven texto escapado; el montaje y los eventos están en
 * bandeja-montaje.js.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { formatoPrecio } from "../../utilidades/formato.js";
import { icono } from "../iconos.js";
import { formatearFechaHora, iniciales } from "../utilidades-panel.js";
import { htmlAvatarRol } from "../roles-visual.js";
import { cuadroIcono } from "../inicio/piezas-inicio.js";
import { etiquetaEspera } from "../inicio/soporte-inicio.js";
import { esperaDe, insigniaDevolucion, insigniaReclamo, productoDevolucion } from "../inicio/soporte-logica.js";
import { insigniaPedido } from "./consulta-logica.js";
import { pasosDevolucion, responsableReclamo } from "./bandeja-logica.js";

const insignia = ({ texto, variante }) => html`<span class="panel-insignia panel-insignia-${variante}">${texto}</span>`;
const ETIQUETA_TIPO = Object.freeze({ reclamos: "Reclamos", devoluciones: "Devoluciones" });
const VACIO = Object.freeze({
  reclamos: "No hay reclamos en este estado.",
  devoluciones: "No hay devoluciones en este estado.",
});

/** Esqueleto de la bandeja: lista (pestañas, buscador y filas) a la izquierda y detalle a la derecha. */
export function renderizarBandeja(tipo) {
  const detalle = tipo === "devoluciones" ? "Detalle de la devolución" : "Detalle del reclamo";
  return html`<div class="panel-bandeja" id="bandeja-raiz" data-tipo="${tipo}">
  <div class="panel-bandeja-lista-panel panel-tarjeta">
    <div id="bandeja-pestanas"></div>
    <div class="panel-bandeja-buscar">
      <label class="visually-hidden" for="bandeja-buscar">Buscar por pedido, cliente o motivo</label>
      <input id="bandeja-buscar" class="form-control" type="search" placeholder="Buscar por pedido, cliente o motivo" autocomplete="off">
    </div>
    <div id="bandeja-lista" class="panel-bandeja-lista" aria-live="polite"></div>
  </div>
  <section class="panel-bandeja-detalle" aria-label="${detalle}">
    <button type="button" class="panel-boton panel-boton-secundario panel-bandeja-volver" data-volver-lista>Volver a la lista</button>
    <div id="bandeja-detalle"></div>
  </section>
</div>`;
}

/** Pestañas por estado, con su contador («—» si esa carga falló). */
export function renderizarPestanas(tipo, pestanas) {
  const botones = pestanas.map((p) => html`<button type="button" role="tab" aria-selected="${p.activa ? "true" : "false"}" data-pestana="${p.id}" aria-controls="bandeja-lista" tabindex="${p.activa ? "0" : "-1"}" class="panel-pestana">${p.etiqueta} <span class="panel-pestana-total">${p.total == null ? "—" : p.total}</span></button>`);
  return html`<div class="panel-pestanas" role="tablist" aria-label="${ETIQUETA_TIPO[tipo]} por estado">${seguro(botones.join(""))}</div>`;
}

/**
 * Filas de la lista: «Pedido #n · cliente» con la espera, el motivo (o el producto) y, en
 * reclamos, quién lo lleva. La elegida lleva aria-current.
 */
export function renderizarLista(tipo, elementos, { nombres, usuarioId, ahora, elegidoId = null }) {
  if (!elementos.length) return html`<p class="panel-vacio">${VACIO[tipo]}</p>`;
  const filas = elementos.map((e) => {
    const nombre = nombres.get(e.pedidoId);
    const titulo = nombre ? `Pedido #${e.pedidoId} · ${nombre}` : `Pedido #${e.pedidoId}`;
    const texto = tipo === "devoluciones" ? productoDevolucion(e) : e.motivo;
    const quien = tipo === "reclamos" ? html`<span class="panel-bandeja-fila-quien">${responsableReclamo(e, usuarioId).fila}</span>` : "";
    const actual = Number(e.id) === Number(elegidoId) ? ' aria-current="true"' : "";
    return html`<button type="button" class="panel-bandeja-fila" data-id="${e.id}"${seguro(actual)}>
  <span class="panel-bandeja-fila-cabecera"><span class="panel-bandeja-fila-titulo">${titulo}</span>${seguro(etiquetaEspera(e.creadoEn, ahora))}</span>
  <span class="panel-bandeja-fila-texto">${texto}</span>
  ${seguro(quien)}
</button>`;
  });
  return filas.join("");
}

/** Casilla de datos; `valor` es texto (se escapa) o, con `conHtml`, un fragmento ya escapado. */
function casilla(titulo, valor, conHtml = false) {
  return html`<div class="panel-casilla"><dt>${titulo}</dt>
  <dd>${conHtml ? seguro(valor) : valor}</dd></div>`;
}

function casillaCliente(contexto) {
  const p = contexto?.pedido;
  if (!p?.clienteNombre) return casilla("Cliente", "—");
  // El correo solo se parte después de la @ (<wbr>), no a mitad de palabra.
  const correo = html`${p.clienteCorreo ?? ""}`.replace("@", "@<wbr>");
  return casilla("Cliente", html`${p.clienteNombre}<small>${seguro(correo)}</small>`, true);
}

function enlacePedido(pedidoId) {
  return html`<p class="panel-detalle-enlace"><a class="panel-enlace" href="${seguro(`#/consulta-pedido?pedido=${pedidoId}`)}">Ver el pedido #${pedidoId} en Consulta de pedido</a></p>`;
}

function cabecera(kicker, titulo, insigniaHtml) {
  return html`<header class="panel-detalle-cabecera">
  <div>
    <p class="panel-detalle-kicker">${kicker}</p>
    <h2 id="bandeja-titulo" class="panel-detalle-titulo" tabindex="-1">${titulo}</h2>
  </div>
  ${seguro(insigniaHtml)}
</header>`;
}

function mensaje(clase, avatar, autor, texto, fecha = null) {
  const hora = fecha ? html` <time datetime="${fecha}">${formatearFechaHora(fecha)}</time>` : "";
  return html`<li class="panel-mensaje ${clase}">
    ${seguro(avatar)}
    <div class="panel-burbuja">
      <p class="panel-mensaje-autor">${autor}${seguro(hora)}</p>
      <p class="panel-mensaje-texto">${texto}</p>
    </div>
  </li>`;
}

/** «Andrea Flores Mendoza» → «Andrea Flores»: las dos primeras palabras. */
const nombreCorto = (nombre) => String(nombre).trim().split(/\s+/).slice(0, 2).join(" ");

/**
 * Autor y círculo de Soporte. El DTO solo trae el id del agente: si es el de la sesión se conoce su
 * nombre («Andrea Flores (tú)», con sus iniciales); de cualquier otro, no, y queda «Soporte» con el
 * icono de chat. Los dos círculos son azules.
 */
function agenteDe(reclamo, usuarioId, nombreUsuario) {
  const mio = reclamo.soporteId != null && Number(reclamo.soporteId) === Number(usuarioId);
  if (mio && nombreUsuario) {
    return { autor: `${nombreCorto(nombreUsuario)} (tú)`, avatar: html`<span class="panel-avatar-agente" aria-hidden="true">${iniciales(nombreUsuario)}</span>` };
  }
  return { autor: "Soporte", avatar: html`<span class="panel-avatar-agente" aria-hidden="true">${seguro(icono("consultas"))}</span>` };
}

function conversacion(reclamo, contexto, usuarioId, nombreUsuario) {
  const cliente = contexto?.pedido?.clienteNombre ?? "Cliente";
  const { autor, avatar: soporte } = agenteDe(reclamo, usuarioId, nombreUsuario);
  const mensajes = [mensaje("panel-mensaje-cliente", htmlAvatarRol(cliente, "CLIENTE"), cliente, reclamo.descripcion, reclamo.creadoEn)];
  // La API no manda la fecha de la respuesta: solo se muestra el autor.
  if (reclamo.respuesta) mensajes.push(mensaje("panel-mensaje-soporte", soporte, autor, reclamo.respuesta));
  if (reclamo.motivoEscalamiento) mensajes.push(mensaje("panel-mensaje-escalado", soporte, "Nota de escalado", reclamo.motivoEscalamiento));
  if (reclamo.resolucionAdmin) mensajes.push(mensaje("panel-mensaje-escalado", htmlAvatarRol("Administración", "ADMIN"), "Resolución de la administración", reclamo.resolucionAdmin));
  return html`<ol class="panel-conversacion" aria-label="Conversación del reclamo">${seguro(mensajes.join(""))}</ol>`;
}

function accionesReclamo(reclamo, usuarioId) {
  const mio = reclamo.soporteId != null && Number(reclamo.soporteId) === Number(usuarioId);
  if (reclamo.estado === "ABIERTO") {
    return html`<div class="panel-aviso-naranja">
  <p>Nadie lo está atendiendo todavía.</p>
  <button type="button" class="panel-boton panel-boton-principal" data-tomar-reclamo="${reclamo.id}">Atender este reclamo</button>
</div>`;
  }
  if (reclamo.estado === "EN_ATENCION" && mio) {
    return html`<form id="bandeja-form-responder" class="panel-formulario-detalle" novalidate data-reclamo="${reclamo.id}">
  <label class="form-label" for="bandeja-respuesta">Responder al cliente</label>
  <textarea id="bandeja-respuesta" class="form-control" rows="4" maxlength="2000" required></textarea>
  <div id="bandeja-escalar" class="panel-escalar" hidden>
    <label class="form-label" for="bandeja-motivo-escalar">Motivo del escalamiento</label>
    <textarea id="bandeja-motivo-escalar" class="form-control" rows="3" maxlength="2000" required></textarea>
    <button type="button" class="panel-boton panel-boton-secundario" data-escalar-confirmar>Confirmar escalamiento</button>
  </div>
  <p id="bandeja-error-reclamo" class="panel-errores-formulario" role="alert"></p>
  <div class="panel-acciones-fila">
    <div class="form-check">
      <input id="bandeja-resuelto" class="form-check-input" type="checkbox">
      <label class="form-check-label" for="bandeja-resuelto">Marcar como resuelto al enviar</label>
    </div>
    <div class="panel-acciones-detalle">
      <button type="button" data-escalar-abrir class="panel-boton panel-boton-secundario" aria-expanded="false" aria-controls="bandeja-escalar">Escalar a la administración</button>
      <button type="submit" class="panel-boton panel-boton-principal">Enviar respuesta</button>
    </div>
  </div>
</form>`;
  }
  const nota = { EN_ATENCION: "Lo atiende otro agente de soporte.", ESCALADO: "La administración decide este reclamo.", RESUELTO: "Reclamo resuelto." }[reclamo.estado] ?? "";
  return nota ? html`<p class="panel-nota-gris">${nota}</p>` : "";
}

/** Detalle de un reclamo: encabezado, casillas, conversación, acciones según el caso y enlace al pedido. */
export function renderizarDetalleReclamo(reclamo, { contexto = null, usuarioId, nombreUsuario = "" }) {
  const pedido = contexto?.pedido;
  const casillaPedido = pedido
    ? casilla("Pedido", html`${seguro(insignia(insigniaPedido(pedido.estado)))}<small>${formatoPrecio(pedido.total)}</small>`, true)
    : casilla("Pedido", "—");
  return html`<article class="panel-detalle" aria-labelledby="bandeja-titulo">
  ${seguro(cabecera(`Reclamo #${reclamo.id} · Pedido #${reclamo.pedidoId}`, reclamo.motivo, insignia(insigniaReclamo(reclamo.estado))))}
  <dl class="panel-casillas">
    ${seguro(casillaCliente(contexto))}
    ${seguro(casillaPedido)}
    ${seguro(casilla("Responsable", responsableReclamo(reclamo, usuarioId).casilla))}
  </dl>
  ${seguro(conversacion(reclamo, contexto, usuarioId, nombreUsuario))}
  ${seguro(accionesReclamo(reclamo, usuarioId))}
  ${seguro(enlacePedido(reclamo.pedidoId))}
</article>`;
}

function progreso(estado) {
  const pasos = pasosDevolucion(estado).map((p) => html`<li class="panel-progreso-paso panel-progreso-paso-${p.estado}"><span class="panel-progreso-marca" aria-hidden="true">${seguro(icono(p.estado === "pendiente" ? "reloj" : p.estado === "rechazado" ? "cancelar" : "entrega"))}</span><span>${p.etiqueta}</span></li>`);
  return html`<ol class="panel-progreso" aria-label="Progreso de la devolución">${seguro(pasos.join(""))}</ol>`;
}

function lineasDevolucion(devolucion) {
  const filas = (devolucion.lineas ?? []).map((l) => {
    const cerrada = devolucion.estado === "CERRADA"
      ? html` <span class="panel-linea-resultado">· ${l.reintegrarStock ? "vuelve al stock" : "no apta para la venta"}</span>` : "";
    return html`<li class="panel-linea">
    ${seguro(cuadroIcono("pedidos", "azul"))}
    <span class="panel-linea-nombre">${l.nombreProducto}${seguro(cerrada)}</span>
    <span class="panel-linea-importe">${l.cantidad} × ${formatoPrecio(l.subtotalReembolso)}</span>
  </li>`;
  });
  return html`<ul class="panel-lineas">${seguro(filas.join(""))}</ul>`;
}

function formularioDecision(devolucion) {
  return html`<form id="bandeja-form-decision" class="panel-formulario-detalle" novalidate data-devolucion="${devolucion.id}">
  <label class="form-label" for="bandeja-decision">Motivo de la decisión</label>
  <textarea id="bandeja-decision" class="form-control" rows="3" maxlength="2000"></textarea>
  <p id="bandeja-error-devolucion" class="panel-errores-formulario" role="alert"></p>
  <div class="panel-acciones-detalle">
    <button type="button" data-decidir="rechazar" class="panel-boton panel-boton-rechazar">Rechazar</button>
    <button type="button" data-decidir="aprobar" class="panel-boton panel-boton-principal">Aprobar devolución</button>
  </div>
</form>`;
}

function formularioRecepcion(devolucion) {
  const lineas = (devolucion.lineas ?? []).map((l) => html`<div class="panel-linea-recepcion">
    <div class="panel-linea-cabecera">
      ${seguro(cuadroIcono("pedidos", "azul"))}
      <span class="panel-linea-nombre">${l.nombreProducto}</span>
      <span class="panel-linea-importe">${l.cantidad} × ${formatoPrecio(l.subtotalReembolso)}</span>
    </div>
    <fieldset class="panel-apta">
      <legend>¿Apta para la venta?</legend>
      <label class="panel-opcion"><input type="radio" name="apta-${l.id}" value="si"><span>Sí, vuelve al stock</span></label>
      <label class="panel-opcion"><input type="radio" name="apta-${l.id}" value="no"><span>No</span></label>
    </fieldset>
  </div>`);
  return html`<form id="bandeja-form-recepcion" class="panel-formulario-detalle" novalidate data-devolucion="${devolucion.id}">
  ${seguro(lineas.join(""))}
  <p class="panel-reembolso-aviso">Al registrar la recepción se reembolsan ${formatoPrecio(devolucion.importeReembolso)} al cliente.</p>
  <p id="bandeja-error-devolucion" class="panel-errores-formulario" role="alert"></p>
  <div class="panel-acciones-detalle">
    <button type="submit" class="panel-boton panel-boton-principal" aria-describedby="bandeja-ayuda-recepcion" disabled>Registrar recepción y reembolsar</button>
  </div>
  <p id="bandeja-ayuda-recepcion" class="panel-ayuda-recepcion">Indica si cada producto es apto para la venta para continuar.</p>
</form>`;
}

function accionesDevolucion(devolucion) {
  switch (devolucion.estado) {
    case "SOLICITADA": return formularioDecision(devolucion);
    case "APROBADA": return formularioRecepcion(devolucion);
    case "CERRADA":
      return html`<p class="panel-nota-gris">Reembolsamos ${formatoPrecio(devolucion.importeReembolso)} al cliente.</p>`;
    case "RECHAZADA":
      return html`<p class="panel-nota-gris"><strong>Motivo del rechazo:</strong> ${devolucion.observacion || "Sin motivo registrado"}</p>`;
    default: return "";
  }
}

/** Detalle de una devolución: progreso, casillas, motivo, líneas y la acción que corresponda. */
export function renderizarDetalleDevolucion(devolucion, { contexto = null, ahora }) {
  const solicitada = html`<time class="panel-casilla-fecha" datetime="${devolucion.creadoEn}">${formatearFechaHora(devolucion.creadoEn)}</time><small class="panel-casilla-espera">${esperaDe(devolucion.creadoEn, ahora).texto}</small>`;
  return html`<article class="panel-detalle" aria-labelledby="bandeja-titulo">
  ${seguro(cabecera(`Devolución #${devolucion.id} · Pedido #${devolucion.pedidoId}`, productoDevolucion(devolucion), insignia(insigniaDevolucion(devolucion.estado))))}
  ${seguro(progreso(devolucion.estado))}
  <dl class="panel-casillas">
    ${seguro(casillaCliente(contexto))}
    ${seguro(casilla("Solicitada", solicitada, true))}
    ${seguro(casilla("Importe", formatoPrecio(devolucion.importeReembolso)))}
  </dl>
  <section class="panel-detalle-seccion">
    <h3 class="panel-detalle-subtitulo">Motivo del cliente</h3>
    <p class="panel-detalle-motivo">${devolucion.motivo}</p>
  </section>
  ${seguro(devolucion.estado === "APROBADA" ? "" : lineasDevolucion(devolucion))}
  ${seguro(accionesDevolucion(devolucion))}
  ${seguro(enlacePedido(devolucion.pedidoId))}
</article>`;
}
