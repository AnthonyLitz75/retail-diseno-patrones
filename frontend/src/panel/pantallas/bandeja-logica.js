/**
 * @file bandeja-logica.js
 * Panel del personal (rediseño v6, tanda 2): lógica pura de las bandejas de Reclamos y
 * Devoluciones de dos paneles. Sin DOM ni red.
 */

import { normalizarTexto } from "../../administracion/cuentas-logica.js";

export const PESTANAS_RECLAMOS = Object.freeze([
  { id: "ABIERTO", etiqueta: "Abiertos" },
  { id: "EN_ATENCION", etiqueta: "En atención" },
  { id: "ESCALADO", etiqueta: "Escalados" },
  { id: "RESUELTO", etiqueta: "Resueltos" },
]);

export const PESTANAS_DEVOLUCIONES = Object.freeze([
  { id: "SOLICITADA", etiqueta: "Por evaluar" },
  { id: "APROBADA", etiqueta: "Por recibir" },
  { id: "CERRADA", etiqueta: "Cerradas" },
  { id: "RECHAZADA", etiqueta: "Rechazadas" },
]);

const RUTA = Object.freeze({ reclamos: "#/reclamos", devoluciones: "#/devoluciones" });
/** Estados con trabajo pendiente: del más antiguo al más reciente; el resto, al revés. */
const PENDIENTES = Object.freeze(["ABIERTO", "EN_ATENCION", "ESCALADO", "SOLICITADA", "APROBADA"]);

export const pestanasDe = (tipo) => (tipo === "devoluciones" ? PESTANAS_DEVOLUCIONES : PESTANAS_RECLAMOS);

/** Entero positivo de ?id=…, o null si falta o no es válido. */
export function idDeParametros(parametros) {
  const texto = String(parametros?.id ?? "").trim();
  const numero = /^\d+$/.test(texto) ? Number(texto) : 0;
  return numero > 0 ? numero : null;
}

/** Ruta del elemento elegido; sin id, la de la bandeja. */
export function rutaDeElemento(tipo, id) {
  return id == null ? RUTA[tipo] : `${RUTA[tipo]}?id=${id}`;
}

const fechaDe = (e) => {
  const t = Date.parse(e?.creadoEn);
  return Number.isNaN(t) ? 0 : t;
};

/** Orden de una pestaña: lo pendiente, del más antiguo; lo cerrado, del más reciente. */
export function ordenarPestana(estado, elementos) {
  const lista = [...(Array.isArray(elementos) ? elementos : [])];
  const factor = PENDIENTES.includes(estado) ? 1 : -1;
  return lista.sort((a, b) => factor * (fechaDe(a) - fechaDe(b)) || factor * (Number(a.id) - Number(b.id)));
}

/**
 * Pestaña y elemento elegidos. Con id: la pestaña que lo contiene. Sin id (o si no existe): la
 * pestaña activa si la hay, y si no la primera con elementos; el elemento es el primero de esa pestaña.
 * @returns {{ pestana: string, elemento: object|null, encontrado: boolean }}
 */
export function elegirSeleccion(porEstado, pestanas, id, activa = null) {
  const lista = (estado) => porEstado?.[estado] ?? [];
  if (id != null) {
    for (const p of pestanas) {
      const elemento = lista(p.id).find((e) => Number(e.id) === id);
      if (elemento) return { pestana: p.id, elemento, encontrado: true };
    }
  }
  const pestana = (activa && pestanas.some((p) => p.id === activa) && activa)
    || pestanas.find((p) => lista(p.id).length)?.id
    || pestanas[0].id;
  return { pestana, elemento: lista(pestana)[0] ?? null, encontrado: false };
}

/**
 * Filtra por número de pedido, cliente y motivo (y producto en devoluciones), sin distinguir
 * mayúsculas ni tildes.
 * @param {Map<number, string>} nombres pedidoId → nombre del cliente (sale del contexto del pedido)
 */
export function filtrarElementos(elementos, texto, nombres = new Map()) {
  const buscado = normalizarTexto(String(texto ?? "").replace(/^#/, ""));
  if (!buscado) return elementos;
  return elementos.filter((e) => {
    const campos = [String(e.pedidoId), nombres.get(e.pedidoId), e.motivo, ...(e.lineas ?? []).map((l) => l.nombreProducto)];
    return campos.some((c) => c && normalizarTexto(c).includes(buscado));
  });
}

/** Quién lleva el reclamo: texto de la fila de la lista y de la casilla «Responsable». */
export function responsableReclamo(reclamo, usuarioId) {
  const mio = Number(reclamo.soporteId) === Number(usuarioId) && reclamo.soporteId != null;
  switch (reclamo.estado) {
    case "ABIERTO":
      return { fila: "Sin asignar", casilla: "Sin asignar" };
    case "EN_ATENCION":
      return mio ? { fila: "Tú lo atiendes", casilla: "Tú" } : { fila: "Lo atiende otro agente", casilla: "Otro agente" };
    case "ESCALADO":
      return { fila: "Decide la administración", casilla: "Administración" };
    case "RESUELTO":
      if (reclamo.adminId != null) return { fila: "Resuelto por la administración", casilla: "Administración" };
      return mio ? { fila: "Resuelto por ti", casilla: "Tú" } : { fila: "Resuelto por otro agente", casilla: "Otro agente" };
    default:
      return { fila: "", casilla: "—" };
  }
}

/** ¿Tiene respuesta («si» o «no») cada línea? Sin líneas no hay recepción. */
export function recepcionCompleta(lineas, respuestas) {
  return lineas.length > 0 && lineas.every((l) => respuestas?.[l.id] === "si" || respuestas?.[l.id] === "no");
}

/** Cuerpo de la recepción: una entrada por línea; lanza si falta alguna respuesta. */
export function lineasRecepcion(lineas, respuestas) {
  if (!recepcionCompleta(lineas, respuestas)) throw new Error("Indica si están aptas para la venta todas las líneas.");
  return lineas.map((l) => ({ detalleDevolucionId: l.id, reintegrarStock: respuestas[l.id] === "si" }));
}

/** Progreso de la devolución: Solicitada → Aprobada → Recibida y reembolsada. */
export function pasosDevolucion(estado) {
  const hechos = { SOLICITADA: 1, APROBADA: 2, CERRADA: 3 }[estado] ?? 0;
  const etiquetas = ["Solicitada", "Aprobada", "Recibida y reembolsada"];
  return etiquetas.map((etiqueta, i) => ({
    etiqueta,
    estado: estado === "RECHAZADA" && i === 0 ? "rechazado" : i < hechos ? "hecho" : "pendiente",
  }));
}
