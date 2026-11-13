/**
 * @file guardas.js
 * Spec 007 (T003, US1): guardas de las rutas de la SPA. Solo mejoran la experiencia
 * (llevar al login o a la tienda con un mensaje claro); el servidor sigue autorizando cada
 * petición por rol, así que una guarda burlada no expone datos.
 */

import { esVistaPermitida } from "../utilidades/navegacion.js";

/** Tipo de ruta (parser-rutas.js) -> vista que exige. Las rutas que no figuran son públicas. */
export const RUTAS_PROTEGIDAS = Object.freeze({
  pedidos: "pedidos",
});

/**
 * @param {string} tipoRuta  tipo devuelto por parsearRuta
 * @param {string|null} rol  rol en sesión, o null si es invitado
 * @returns {{permitido: true} | {permitido: false, destino: 'login'|'tienda', mensaje: string}}
 */
export function evaluarAcceso(tipoRuta, rol) {
  if (!esRutaProtegida(tipoRuta)) return { permitido: true };
  const vista = RUTAS_PROTEGIDAS[tipoRuta];
  if (!rol) {
    return { permitido: false, destino: "login", mensaje: "Inicia sesión para ver tus pedidos." };
  }
  if (!esVistaPermitida(vista, rol)) {
    return { permitido: false, destino: "tienda", mensaje: "Tu rol no tiene acceso a esa sección." };
  }
  return { permitido: true };
}

export function esRutaProtegida(tipoRuta) {
  return Object.hasOwn(RUTAS_PROTEGIDAS, tipoRuta);
}
