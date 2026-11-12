/**
 * @file atencion-cliente.js
 * Spec 006 (T009, T017): en un pedido ENTREGADO el cliente ve sus reclamos y devoluciones
 * y puede registrar un reclamo o solicitar la devolución de unidades con saldo.
 * Todo el texto dinámico se asigna con textContent.
 */

import {
  calcularSaldoDevolvible,
  etiquetaEstadoDevolucion,
  etiquetaEstadoReclamo,
} from "./atencion.js";
import { formatoPrecio } from "../utilidades/formato.js";
import { crearElemento as el } from "../utilidades/dom.js";
import { ESTADO_PEDIDO } from "../utilidades/constantes.js";

function badge({ texto, clase }) {
  return el("span", `badge rounded-pill ${clase}`, texto);
}

function campo(id, etiqueta, control) {
  const grupo = el("div", "mb-2");
  const label = el("label", "form-label small fw-semibold mb-1", etiqueta);
  label.htmlFor = id;
  control.id = id;
  grupo.append(label, control);
  return grupo;
}

function estadoFormulario() {
  const estado = el("p", "small mb-0");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");
  return estado;
}

function crearItemReclamo(reclamo) {
  const item = el("li", "list-group-item px-0");
  const cabecera = el("div", "d-flex flex-wrap align-items-center gap-2");
  cabecera.append(el("span", "fw-semibold small", `Reclamo #${reclamo.id}: ${reclamo.motivo}`), badge(etiquetaEstadoReclamo(reclamo.estado)));
  item.append(cabecera);
  const respuesta = reclamo.resolucionAdmin || reclamo.respuesta;
  if (respuesta) item.append(el("p", "small text-secondary mb-0 mt-1", `Respuesta: ${respuesta}`));
  return item;
}

function crearItemDevolucion(devolucion) {
  const item = el("li", "list-group-item px-0");
  const cabecera = el("div", "d-flex flex-wrap align-items-center gap-2");
  const unidades = (devolucion.lineas || []).reduce((total, l) => total + l.cantidad, 0);
  cabecera.append(
    el("span", "fw-semibold small", `Devolución #${devolucion.id}: ${unidades} unidad(es) · ${formatoPrecio(devolucion.importeReembolso)}`),
    badge(etiquetaEstadoDevolucion(devolucion.estado)),
  );
  item.append(cabecera);
  if (devolucion.observacion) item.append(el("p", "small text-secondary mb-0 mt-1", `Soporte: ${devolucion.observacion}`));
  return item;
}

function crearFormularioReclamo(pedido, onRegistrar) {
  const detalles = el("details", "mt-2");
  detalles.append(el("summary", "small fw-semibold text-primary", "Registrar un reclamo"));
  const form = el("form", "mt-2");
  const motivo = el("input", "form-control form-control-sm");
  motivo.maxLength = 100;
  motivo.required = true;
  motivo.placeholder = "Ej.: Producto con falla";
  const descripcion = el("textarea", "form-control form-control-sm");
  descripcion.rows = 3;
  descripcion.maxLength = 2000;
  descripcion.required = true;
  const boton = el("button", "btn btn-outline-primary btn-sm", "Enviar reclamo");
  boton.type = "submit";
  const estado = estadoFormulario();
  form.append(
    campo(`reclamo-motivo-${pedido.idPedido}`, "Motivo", motivo),
    campo(`reclamo-descripcion-${pedido.idPedido}`, "Describe lo ocurrido", descripcion),
    boton,
    estado,
  );
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    onRegistrar?.({ motivo: motivo.value, descripcion: descripcion.value }, { boton, estado });
  });
  detalles.append(form);
  return detalles;
}

function crearFormularioDevolucion(pedido, saldos, onSolicitar) {
  const detalles = el("details", "mt-2");
  detalles.append(el("summary", "small fw-semibold text-primary", "Solicitar una devolución"));
  const form = el("form", "mt-2");
  const entradas = [];
  for (const producto of pedido.productos || []) {
    const saldo = saldos.get(producto.idDetalle) || 0;
    if (saldo <= 0) continue;
    const cantidad = el("input", "form-control form-control-sm");
    cantidad.type = "number";
    cantidad.min = "0";
    cantidad.max = String(saldo);
    cantidad.step = "1";
    cantidad.value = "0";
    entradas.push({ idDetalle: producto.idDetalle, cantidad });
    form.append(campo(
      `devolucion-${pedido.idPedido}-${producto.idDetalle}`,
      `${producto.nombreProducto} (puedes devolver hasta ${saldo})`,
      cantidad,
    ));
  }
  const motivo = el("input", "form-control form-control-sm");
  motivo.maxLength = 120;
  motivo.required = true;
  motivo.placeholder = "Ej.: No cumple lo esperado";
  const boton = el("button", "btn btn-outline-primary btn-sm", "Solicitar devolución");
  boton.type = "submit";
  const estado = estadoFormulario();
  form.append(campo(`devolucion-motivo-${pedido.idPedido}`, "Motivo", motivo), boton, estado);
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const lineas = entradas.map((e) => ({ pedidoDetalleId: e.idDetalle, cantidad: Number(e.cantidad.value) }));
    onSolicitar?.(motivo.value, lineas, { boton, estado });
  });
  detalles.append(form);
  return detalles;
}

/**
 * Sección de atención para un pedido del cliente; null si no aplica.
 * @param {object} pedido
 * @param {{reclamos?:Array, devoluciones?:Array, onRegistrarReclamo?:Function, onSolicitarDevolucion?:Function}} opciones
 */
export function crearSeccionAtencionPedido(pedido, {
  reclamos = [],
  devoluciones = [],
  onRegistrarReclamo = null,
  onSolicitarDevolucion = null,
} = {}) {
  const propiosReclamos = reclamos.filter((r) => r.pedidoId === pedido.idPedido);
  const propiasDevoluciones = devoluciones.filter((d) => d.pedidoId === pedido.idPedido);
  const entregado = pedido.estado === ESTADO_PEDIDO.ENTREGADO;
  if (!entregado && propiosReclamos.length === 0 && propiasDevoluciones.length === 0) return null;

  const seccion = el("section", "order-support mt-3 pt-3 border-top");
  seccion.append(el("h6", "small fw-bold text-secondary text-uppercase mb-2", "Atención postventa"));

  if (propiosReclamos.length || propiasDevoluciones.length) {
    const lista = el("ul", "list-group list-group-flush mb-2");
    propiosReclamos.forEach((r) => lista.append(crearItemReclamo(r)));
    propiasDevoluciones.forEach((d) => lista.append(crearItemDevolucion(d)));
    seccion.append(lista);
  }

  if (entregado) {
    seccion.append(crearFormularioReclamo(pedido, (datos, ui) => onRegistrarReclamo?.(pedido, datos, ui)));
    const saldos = calcularSaldoDevolvible(pedido, propiasDevoluciones);
    if ([...saldos.values()].some((s) => s > 0)) {
      seccion.append(crearFormularioDevolucion(pedido, saldos, (motivo, lineas, ui) =>
        onSolicitarDevolucion?.(pedido, motivo, lineas, ui)));
    } else {
      seccion.append(el("p", "small text-secondary mt-2 mb-0", "Ya no quedan unidades por devolver en este pedido."));
    }
  }
  return seccion;
}
