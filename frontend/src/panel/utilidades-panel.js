/**
 * @file utilidades-panel.js
 * Panel del personal: utilidades compartidas por las pantallas del panel (Inicio del
 * Administrador, Auditoría). Replican procedimientos de la tienda sin tocarla.
 */

/** Mismo formato que la tabla de auditoría de la tienda (auditoria-vista.js). */
const FORMATO_FECHA_HORA = Object.freeze({ dateStyle: "short", timeStyle: "short" });

/**
 * Fecha y hora cortas en es-PE (por ejemplo «24/11/26, 10:05 a. m.»), sin «hace X».
 * Una fecha inválida se muestra tal cual.
 * @param {string|number|Date|null|undefined} valor
 */
export function formatearFechaHora(valor) {
  const fecha = new Date(valor);
  return valor == null || Number.isNaN(fecha.getTime())
    ? String(valor ?? "")
    : fecha.toLocaleString("es-PE", FORMATO_FECHA_HORA);
}

/**
 * Guarda una respuesta de la API como archivo (mismo procedimiento que admin-reportes.js y
 * auditoria-vista.js): URL temporal del blob, enlace con download, clic y liberar la URL.
 * @param {{ blob: () => Promise<Blob> }} respuesta
 * @param {string} nombre nombre del archivo
 * @param {{ documento?: Document, URL?: typeof URL }} [dependencias]
 */
export async function guardarArchivo(respuesta, nombre, { documento = document, URL: urls = globalThis.URL } = {}) {
  const url = urls.createObjectURL(await respuesta.blob());
  const enlace = documento.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  urls.revokeObjectURL(url);
}
