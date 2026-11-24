/**
 * @file soporte-logica.js
 * Panel del personal (spec 16 y decisiones P2, P7, P8, P9 y de T08): cálculos del Inicio de
 * Soporte. Funciones puras, sin DOM ni red. Los rótulos de acción salen de accionesReclamo y
 * accionDevolucion del portal de Soporte (soporte-vista.js), como pide P2.
 */

import { accionDevolucion, accionesReclamo } from "../../soporte/soporte-vista.js";
import { resumirTexto } from "./vendedor-logica.js";

export const MAX_FILAS_SOPORTE = 5;
export const MAX_MOTIVO_RECLAMO = 60;
export const MENSAJE_BUSQUEDA = "Escribe el número del pedido.";

const RUTA_RECLAMOS = "#/reclamos";
const RUTA_DEVOLUCIONES = "#/devoluciones";
const ENTERO = /^\d+$/;

/** Insignias de la spec 16 (texto siempre visible, el color solo acompaña). */
const INSIGNIAS_RECLAMO = Object.freeze({
  ABIERTO: { texto: "Abierto", variante: "ambar" },
  EN_ATENCION: { texto: "En atención", variante: "azul" },
  ESCALADO: { texto: "Escalado", variante: "rojo" },
  RESUELTO: { texto: "Resuelto", variante: "neutro" },
});
const INSIGNIAS_DEVOLUCION = Object.freeze({
  SOLICITADA: { texto: "Solicitada", variante: "ambar" },
  APROBADA: { texto: "Aprobada", variante: "verde" },
  RECHAZADA: { texto: "Rechazada", variante: "rojo" },
  CERRADA: { texto: "Cerrada", variante: "neutro" },
});
const ESTADOS_DEVOLUCION_INICIO = Object.freeze(["SOLICITADA", "APROBADA"]);

const comoLista = (valor) => (Array.isArray(valor) ? valor : []);
const contarEstado = (lista, estado) => comoLista(lista).filter((x) => x?.estado === estado).length;

/** Del más antiguo al más reciente por creadoEn; sin fecha, por id ascendente. */
function compararAntiguedad(a, b) {
  const fechaA = Date.parse(a?.creadoEn);
  const fechaB = Date.parse(b?.creadoEn);
  if (!Number.isNaN(fechaA) && !Number.isNaN(fechaB) && fechaA !== fechaB) return fechaA - fechaB;
  return Number(a?.id) - Number(b?.id);
}

/** Reclamos no resueltos, del más antiguo al más reciente. */
export function reclamosParaInicio(reclamos) {
  return comoLista(reclamos).filter((r) => r?.estado !== "RESUELTO").sort(compararAntiguedad);
}

/** Devoluciones SOLICITADA y APROBADA, de la más antigua a la más reciente. */
export function devolucionesParaInicio(devoluciones) {
  return comoLista(devoluciones).filter((d) => ESTADOS_DEVOLUCION_INICIO.includes(d?.estado)).sort(compararAntiguedad);
}

export function indicadoresReclamos(reclamos) {
  return {
    abiertos: contarEstado(reclamos, "ABIERTO"),
    enAtencion: contarEstado(reclamos, "EN_ATENCION"),
    escalados: contarEstado(reclamos, "ESCALADO"),
  };
}

/** «Devoluciones por atender» solo cuenta SOLICITADA. */
export function indicadoresDevoluciones(devoluciones) {
  return { porAtender: contarEstado(devoluciones, "SOLICITADA") };
}

const insigniaNeutra = (estado) => ({ texto: String(estado ?? "").replaceAll("_", " "), variante: "neutro" });

export function insigniaReclamo(estado) {
  return INSIGNIAS_RECLAMO[estado] ?? insigniaNeutra(estado);
}

export function insigniaDevolucion(estado) {
  return INSIGNIAS_DEVOLUCION[estado] ?? insigniaNeutra(estado);
}

/**
 * Acción del Inicio para un reclamo (P2/P7): ABIERTO → «Atender» (PUT …/tomar); EN_ATENCION
 * propio → «Responder»; de otro agente, ESCALADO o RESUELTO → «Ver detalle». Los dos últimos
 * casos solo navegan a #/reclamos.
 * @param {object} reclamo
 * @param {number} usuarioId agente en sesión
 */
export function accionReclamoInicio(reclamo, usuarioId) {
  const acciones = accionesReclamo(reclamo, usuarioId);
  if (acciones.includes("tomar")) return { tipo: "tomar", texto: "Atender" };
  if (acciones.includes("responder")) return { tipo: "enlace", texto: "Responder", ruta: RUTA_RECLAMOS };
  return { tipo: "enlace", texto: "Ver detalle", ruta: RUTA_RECLAMOS };
}

/** Acción del Inicio para una devolución (P2): nunca hace PUT, solo lleva a #/devoluciones. */
export function accionDevolucionInicio(devolucion) {
  const accion = accionDevolucion(devolucion);
  const texto = accion === "decidir" ? "Evaluar" : accion === "recibir" ? "Registrar recepción" : "Ver detalle";
  return { texto, ruta: RUTA_DEVOLUCIONES };
}

/** P9: el nombre del producto con una sola línea; si no, «{n} productos». */
export function productoDevolucion(devolucion) {
  const lineas = comoLista(devolucion?.lineas);
  return lineas.length === 1 ? String(lineas[0].nombreProducto ?? "") : `${lineas.length} productos`;
}

export function resumirMotivo(motivo) {
  return resumirTexto(motivo, MAX_MOTIVO_RECLAMO);
}

/** «Buscar pedido»: entero positivo tras recortar («03» cuenta como 3). */
export function validarNumeroPedido(valor) {
  const texto = String(valor ?? "").trim();
  const numero = ENTERO.test(texto) ? Number(texto) : 0;
  return numero > 0 ? { valido: true, numero } : { valido: false, mensaje: MENSAJE_BUSQUEDA };
}

export function rutaConsultaPedido(numero) {
  return `#/consulta-pedido?pedido=${numero}`;
}
