/**
 * Módulo de utilidades de formateo para Píxel Andino Tech Store.
 */

/**
 * Formatea un valor numérico como moneda en Soles (PEN).
 *
 * @param {number|string} valor - Cantidad a formatear
 * @returns {string} Valor monetario formateado (ej. "S/ 120.00")
 */
export function formatoPrecio(valor) {
  const numero = Number(valor);
  if (Number.isNaN(numero)) {
    return "S/\u00A00.00";
  }
  return numero.toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
  });
}
