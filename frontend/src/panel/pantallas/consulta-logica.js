/**
 * @file consulta-logica.js
 * Panel del personal (rediseño v6): cálculos puros de «Consulta de pedido» a partir del contexto
 * que ya devuelve GET /api/soporte/pedidos/{id} (pedido con historial y envío, resumen del pago,
 * reclamos y devoluciones). Sin DOM ni red.
 */

import { formatoPrecio } from "../../utilidades/formato.js";
import { plural } from "../utilidades-panel.js";
import { insigniaDevolucion, insigniaReclamo } from "../inicio/soporte-logica.js";

const comoLista = (valor) => (Array.isArray(valor) ? valor : []);

const INSIGNIA_PEDIDO = Object.freeze({
  PENDIENTE: { texto: "Pendiente", variante: "ambar" },
  EN_PREPARACION: { texto: "En preparación", variante: "azul" },
  DESPACHADO: { texto: "Despachado", variante: "verde" },
  ENTREGADO: { texto: "Entregado", variante: "verde" },
  CANCELADO: { texto: "Cancelado", variante: "neutro" },
});
const DEVOLUCIONES_ABIERTAS = Object.freeze(["SOLICITADA", "APROBADA"]);

/** Insignia del estado del pedido; un estado desconocido sale neutro con su código. */
export function insigniaPedido(estado) {
  return INSIGNIA_PEDIDO[estado] ?? { texto: String(estado ?? "").replaceAll("_", " "), variante: "neutro" };
}

/** Estado del pedido más los reclamos y devoluciones abiertos («Reclamo #4 escalado»). */
export function insigniasDelPedido(contexto) {
  const reclamos = comoLista(contexto?.reclamos)
    .filter((r) => r?.estado !== "RESUELTO")
    .map((r) => {
      const { texto, variante } = insigniaReclamo(r.estado);
      return { texto: `Reclamo #${r.id} ${texto.toLowerCase()}`, variante };
    });
  const devoluciones = comoLista(contexto?.devoluciones)
    .filter((d) => DEVOLUCIONES_ABIERTAS.includes(d?.estado))
    .map((d) => {
      const { texto, variante } = insigniaDevolucion(d.estado);
      return { texto: `Devolución #${d.id} ${texto.toLowerCase()}`, variante };
    });
  return [insigniaPedido(contexto?.pedido?.estado), ...reclamos, ...devoluciones];
}

function detalleCobro(pago) {
  if (!pago) return "";
  if (pago.estado === "APROBADO") return `Cobro aprobado · ${formatoPrecio(pago.monto)}`;
  if (pago.estado === "REVERSADO") return "Cobro reversado";
  return "";
}

/**
 * Los pasos de la línea de tiempo. Pedido normal: Pagado, En preparación, Despachado y Entregado
 * (cada uno `hecho` con su fecha del historial, o `pendiente`). Pedido cancelado: Pagado y
 * Cancelado (este en estado `cancelado`, con el motivo del historial si existe).
 * @returns {Array<{ clave: string, etiqueta: string, icono: string, estado: "hecho"|"pendiente"|"cancelado",
 *   fecha: string|null, detalle: string }>}
 */
export function pasosSeguimiento(pedido, pago) {
  const historial = comoLista(pedido?.historial);
  const evento = (estado) => historial.find((h) => h?.estado === estado) ?? null;
  const envio = pedido?.envio ?? null;
  const pagado = {
    clave: "pagado",
    etiqueta: "Pagado",
    icono: "pagado",
    estado: "hecho",
    fecha: evento("PENDIENTE")?.fecha ?? pago?.creadoEn ?? pedido?.creadoEn ?? null,
    detalle: detalleCobro(pago),
  };
  if (pedido?.estado === "CANCELADO") {
    const cancelacion = evento("CANCELADO");
    return [pagado, {
      clave: "cancelado",
      etiqueta: "Cancelado",
      icono: "cancelar",
      estado: "cancelado",
      fecha: cancelacion?.fecha ?? null,
      detalle: cancelacion?.comentario ?? "",
    }];
  }
  const paso = (clave, etiqueta, icono, estadoPedido, fechaAlterna, detalleDe) => {
    const hecho = evento(estadoPedido);
    const cumplido = Boolean(hecho || fechaAlterna);
    return {
      clave,
      etiqueta,
      icono,
      estado: cumplido ? "hecho" : "pendiente",
      fecha: hecho?.fecha ?? fechaAlterna ?? null,
      detalle: cumplido ? detalleDe(hecho) : "",
    };
  };
  return [
    pagado,
    paso("preparacion", "En preparación", "preparacion", "EN_PREPARACION", null, (h) => h?.responsable ?? ""),
    paso("despacho", "Despachado", "despacho", "DESPACHADO", envio?.despachadoEn,
      (h) => (envio ? `${envio.transportista} · ${envio.codigoSeguimiento}` : h?.responsable ?? "")),
    paso("entrega", "Entregado", "entrega", "ENTREGADO", envio?.entregadoEn, (h) => h?.responsable ?? ""),
  ];
}

/** Resumen del cobro. El backend manda un solo resumen: aprobado (1), reversado u otro estado. */
export function resumenPago(pago) {
  if (!pago) return { aprobados: 0, titulo: "Sin cobro registrado", monto: null, reembolsado: 0, nota: false };
  const aprobados = pago.estado === "APROBADO" ? 1 : 0;
  const titulo = aprobados
    ? plural(aprobados, "cobro aprobado", "cobros aprobados")
    : { REVERSADO: "Cobro reversado", RECHAZADO: "Cobro rechazado" }[pago.estado] ?? "Cobro pendiente";
  return { aprobados, titulo, monto: pago.monto, reembolsado: Number(pago.montoReembolsado) || 0, nota: aprobados === 1 };
}

/** Reclamos y devoluciones del pedido con su insignia y el enlace a su bandeja. */
export function atencionesDelPedido(contexto) {
  return [
    ...comoLista(contexto?.reclamos).map((r) => ({
      tipo: "Reclamo", id: r.id, motivo: r.motivo, insignia: insigniaReclamo(r.estado), ruta: `#/reclamos?id=${r.id}`,
    })),
    ...comoLista(contexto?.devoluciones).map((d) => ({
      tipo: "Devolución", id: d.id, motivo: d.motivo, insignia: insigniaDevolucion(d.estado), ruta: `#/devoluciones?id=${d.id}`,
    })),
  ];
}
