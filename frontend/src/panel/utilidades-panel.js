/**
 * @file utilidades-panel.js
 * Panel del personal: utilidades compartidas por las pantallas del panel (Inicio del
 * Administrador, Auditoría). Replican procedimientos de la tienda sin tocarla.
 */

/**
 * Cantidad con su sustantivo en singular o plural (F8): «1 reclamo escalado», «0 reclamos
 * escalados», «2 reclamos escalados». Única función de plural de los Inicios del panel.
 * @param {number} cantidad
 * @param {string} singular
 * @param {string} pluralTexto
 */
export function plural(cantidad, singular, pluralTexto) {
  return `${cantidad} ${Number(cantidad) === 1 ? singular : pluralTexto}`;
}

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

/** Texto que se muestra cuando no hay nombre del que sacar iniciales. */
const SIN_INICIALES = "?";

/**
 * Iniciales de un nombre: la primera letra de las dos primeras palabras, en mayúsculas («Andrea
 * Flores Mendoza» → AF); con una sola palabra, su primera letra. Única función de iniciales del
 * panel: la usan el chip de la barra, las conversaciones, la actividad y Cuentas y roles.
 * @param {unknown} nombre
 */
export function iniciales(nombre) {
  if (typeof nombre !== "string") return SIN_INICIALES;
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return SIN_INICIALES;
  return partes.slice(0, 2).map((p) => Array.from(p)[0].toLocaleUpperCase("es")).join("");
}
