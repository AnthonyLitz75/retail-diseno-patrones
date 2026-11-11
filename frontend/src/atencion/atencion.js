/**
 * @file atencion.js
 * Spec 006: llamadas a la API de reclamos, devoluciones, soporte e incidencias, y reglas
 * puras de presentación (saldo devolvible, etiquetas de estado). El backend valida todo;
 * aquí solo se evita enviar formularios que seguro serán rechazados.
 */

const MAX_MOTIVO_RECLAMO = 100;
const MAX_MOTIVO_DEVOLUCION = 120;
const MAX_TEXTO = 2000;

function idValido(valor, nombre = "identificador") {
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new TypeError(`El ${nombre} no es válido.`);
  }
  return numero;
}

function textoRequerido(valor, campo, maximo) {
  const texto = String(valor ?? "").trim();
  if (!texto) throw new TypeError(`${campo} es obligatorio.`);
  if (texto.length > maximo) {
    throw new TypeError(`${campo} no puede superar ${maximo} caracteres.`);
  }
  return texto;
}

function textoOpcional(valor, campo, maximo) {
  const texto = String(valor ?? "").trim();
  if (texto.length > maximo) {
    throw new TypeError(`${campo} no puede superar ${maximo} caracteres.`);
  }
  return texto || null;
}

function conFiltro(ruta, estado) {
  return estado ? `${ruta}?estado=${encodeURIComponent(estado)}` : ruta;
}

async function json(apiRequest, ruta, opciones) {
  return (await apiRequest(ruta, opciones)).json();
}

// ---------- Cliente ----------

export function registrarReclamo(apiRequest, pedidoId, { motivo, descripcion }) {
  const datos = {
    motivo: textoRequerido(motivo, "El motivo", MAX_MOTIVO_RECLAMO),
    descripcion: textoRequerido(descripcion, "La descripción", MAX_TEXTO),
  };
  return json(apiRequest, `/api/pedidos/${idValido(pedidoId, "pedido")}/reclamos`, {
    method: "POST",
    json: datos,
  });
}

export function listarMisReclamos(apiRequest) {
  return json(apiRequest, "/api/reclamos/mis-reclamos");
}

/**
 * @param {Array<{pedidoDetalleId:number, cantidad:number}>} lineas solo las que tienen cantidad > 0
 */
export function solicitarDevolucion(apiRequest, pedidoId, motivo, lineas) {
  const elegidas = (Array.isArray(lineas) ? lineas : [])
    .map((l) => ({ pedidoDetalleId: idValido(l.pedidoDetalleId, "producto"), cantidad: Number(l.cantidad) }))
    .filter((l) => l.cantidad > 0);
  if (elegidas.length === 0) {
    throw new TypeError("Elige al menos una unidad para devolver.");
  }
  if (elegidas.some((l) => !Number.isInteger(l.cantidad))) {
    throw new TypeError("Las cantidades deben ser números enteros.");
  }
  return json(apiRequest, `/api/pedidos/${idValido(pedidoId, "pedido")}/devoluciones`, {
    method: "POST",
    json: { motivo: textoRequerido(motivo, "El motivo", MAX_MOTIVO_DEVOLUCION), lineas: elegidas },
  });
}

export function listarMisDevoluciones(apiRequest) {
  return json(apiRequest, "/api/devoluciones/mis-devoluciones");
}

// ---------- Soporte ----------

export function listarBandejaReclamos(apiRequest, estado = "") {
  return json(apiRequest, conFiltro("/api/soporte/reclamos", estado));
}

export function tomarReclamo(apiRequest, id) {
  return json(apiRequest, `/api/soporte/reclamos/${idValido(id, "reclamo")}/tomar`, { method: "PUT" });
}

export function responderReclamo(apiRequest, id, respuesta, resuelto) {
  return json(apiRequest, `/api/soporte/reclamos/${idValido(id, "reclamo")}/responder`, {
    method: "PUT",
    json: {
      respuesta: textoRequerido(respuesta, "La respuesta", MAX_TEXTO),
      estado: resuelto ? "RESUELTO" : "EN_ATENCION",
    },
  });
}

export function escalarReclamo(apiRequest, id, motivo) {
  return json(apiRequest, `/api/soporte/reclamos/${idValido(id, "reclamo")}/escalar`, {
    method: "PUT",
    json: { motivoEscalamiento: textoRequerido(motivo, "El motivo del escalamiento", MAX_TEXTO) },
  });
}

export function listarBandejaDevoluciones(apiRequest, estado = "") {
  return json(apiRequest, conFiltro("/api/soporte/devoluciones", estado));
}

export function decidirDevolucion(apiRequest, id, aprobada, observacion) {
  return json(apiRequest, `/api/soporte/devoluciones/${idValido(id, "devolución")}/decision`, {
    method: "PUT",
    json: { aprobada: Boolean(aprobada), observacion: textoOpcional(observacion, "La observación", MAX_TEXTO) },
  });
}

/**
 * @param {Array<{detalleDevolucionId:number, reintegrarStock:boolean}>} lineas todas las líneas
 * @param {string} [escenarioReembolso] solo para el proveedor simulado (PRUEBA_RECHAZADA)
 */
export function recibirDevolucion(apiRequest, id, lineas, escenarioReembolso = "") {
  if (!Array.isArray(lineas) || lineas.length === 0) {
    throw new TypeError("Indica el resultado de cada línea recibida.");
  }
  const cuerpo = {
    lineas: lineas.map((l) => ({
      detalleDevolucionId: idValido(l.detalleDevolucionId, "línea"),
      reintegrarStock: Boolean(l.reintegrarStock),
    })),
  };
  if (escenarioReembolso) cuerpo.escenarioReembolso = escenarioReembolso;
  return json(apiRequest, `/api/soporte/devoluciones/${idValido(id, "devolución")}/recepcion`, {
    method: "PUT",
    json: cuerpo,
  });
}

export function consultarContextoPedido(apiRequest, pedidoId) {
  return json(apiRequest, `/api/soporte/pedidos/${idValido(pedidoId, "pedido")}`);
}

// ---------- Administración ----------

export function listarIncidencias(apiRequest) {
  return json(apiRequest, "/api/admin/incidencias");
}

export function listarReclamosSinAgente(apiRequest) {
  return json(apiRequest, "/api/admin/incidencias/sin-agente");
}

export function resolverIncidencia(apiRequest, id, resolucion, devolverASoporte) {
  return json(apiRequest, `/api/admin/incidencias/${idValido(id, "reclamo")}/resolver`, {
    method: "PUT",
    json: { resolucion: textoRequerido(resolucion, "La resolución", MAX_TEXTO), devolver: Boolean(devolverASoporte) },
  });
}

export function reasignarReclamo(apiRequest, id, soporteId) {
  return json(apiRequest, `/api/admin/incidencias/${idValido(id, "reclamo")}/reasignar`, {
    method: "PUT",
    json: { soporteId: idValido(soporteId, "agente de soporte") },
  });
}

// ---------- Reglas de presentación ----------

/**
 * Saldo devolvible por línea del pedido: comprado menos lo comprometido en devoluciones
 * que no fueron rechazadas (misma regla que el backend, FR-003).
 * @returns {Map<number, number>} idDetalle -> unidades que aún se pueden devolver
 */
export function calcularSaldoDevolvible(pedido, devoluciones = []) {
  const comprometido = new Map();
  for (const devolucion of devoluciones) {
    if (devolucion.pedidoId !== pedido.idPedido || devolucion.estado === "RECHAZADA") continue;
    for (const linea of devolucion.lineas || []) {
      comprometido.set(linea.pedidoDetalleId, (comprometido.get(linea.pedidoDetalleId) || 0) + linea.cantidad);
    }
  }
  const saldos = new Map();
  for (const producto of pedido.productos || []) {
    if (producto.idDetalle == null) continue;
    saldos.set(producto.idDetalle, Math.max(0, producto.cantidad - (comprometido.get(producto.idDetalle) || 0)));
  }
  return saldos;
}

const ESTADOS_RECLAMO = {
  ABIERTO: { texto: "Abierto", clase: "text-bg-warning" },
  EN_ATENCION: { texto: "En atención", clase: "text-bg-primary" },
  ESCALADO: { texto: "Escalado", clase: "text-bg-danger" },
  RESUELTO: { texto: "Resuelto", clase: "text-bg-success" },
};

const ESTADOS_DEVOLUCION = {
  SOLICITADA: { texto: "Solicitada", clase: "text-bg-warning" },
  APROBADA: { texto: "Aprobada", clase: "text-bg-primary" },
  RECHAZADA: { texto: "Rechazada", clase: "text-bg-secondary" },
  CERRADA: { texto: "Cerrada y reembolsada", clase: "text-bg-success" },
};

export function etiquetaEstadoReclamo(estado) {
  return ESTADOS_RECLAMO[estado] || { texto: String(estado || "Desconocido"), clase: "text-bg-secondary" };
}

export function etiquetaEstadoDevolucion(estado) {
  return ESTADOS_DEVOLUCION[estado] || { texto: String(estado || "Desconocido"), clase: "text-bg-secondary" };
}

export const ESTADOS_FILTRO_RECLAMO = Object.keys(ESTADOS_RECLAMO);
export const ESTADOS_FILTRO_DEVOLUCION = Object.keys(ESTADOS_DEVOLUCION);
