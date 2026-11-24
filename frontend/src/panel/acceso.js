/**
 * @file acceso.js
 * Panel del personal (spec 13): quién entra a panel.html y adónde va cada rol tras el login.
 * Funciones puras, sin DOM. Solo deciden qué mostrar; quien autoriza es el backend.
 */

import { ROL } from "../utilidades/constantes.js";
import { destinoTrasLogin } from "../utilidades/errores-globales.js";

/** Roles del personal que trabajan en el panel. */
export const ROLES_PANEL = Object.freeze([ROL.ADMIN, ROL.VENDEDOR, ROL.ALMACEN, ROL.SOPORTE]);

export const MENSAJE_SIN_ACCESO = "Tu rol no tiene acceso a esa sección.";

export const DESTINO_INICIO_PANEL = "/panel.html#/inicio";

/**
 * ¿El rol pertenece al personal que trabaja en el panel? La tienda lo usa para mostrar el
 * botón «Panel del personal» en la cabecera.
 * @param {unknown} rol
 */
export function esPersonal(rol) {
  return ROLES_PANEL.includes(rol);
}

const esRolDelPanel = esPersonal;

/**
 * Decide si el rol en sesión puede abrir el panel.
 * Sin sesión (null o undefined) se va al login; cualquier otro valor que no sea un rol del
 * personal (CLIENTE, desconocido, vacío o de otro tipo) vuelve a la tienda con el mensaje.
 * @param {string|null|undefined} rol
 * @returns {{ permitido: boolean, destino?: "login"|"tienda", mensaje?: string }}
 */
export function evaluarAccesoPanel(rol) {
  if (rol == null) return { permitido: false, destino: "login" };
  if (esRolDelPanel(rol)) return { permitido: true };
  return { permitido: false, destino: "tienda", mensaje: MENSAJE_SIN_ACCESO };
}

/** Ruta del login cuando el panel se abre sin sesión (sin «volver»: el personal entra al panel tras el login). */
export const DESTINO_LOGIN = "/login.html";

export const DESTINO_TIENDA = "/";

/** Tiempo para leer el aviso antes de volver a la tienda (el mismo de configurarErroresGlobales). */
export const RETRASO_REDIRECCION_MS = 1500;

/**
 * Qué hace panel.html al arrancar con el usuario de GET /api/auth/sesion (o null si no hay
 * sesión). El marco solo se pinta cuando evaluarAccesoPanel lo permite.
 * @param {{ rol?: string }|null|undefined} usuario
 * @returns {{ pintar: true } | { pintar: false, redirigir: string, retrasoMs: number, mensaje?: string }}
 */
export function planificarArranquePanel(usuario) {
  const acceso = evaluarAccesoPanel(usuario?.rol);
  if (acceso.permitido) return { pintar: true };
  if (acceso.destino === "login") return { pintar: false, redirigir: DESTINO_LOGIN, retrasoMs: 0 };
  return { pintar: false, redirigir: DESTINO_TIENDA, retrasoMs: RETRASO_REDIRECCION_MS, mensaje: acceso.mensaje };
}

/**
 * Destino tras iniciar sesión. El personal va al inicio del panel; cualquier otro rol se
 * trata como CLIENTE y reutiliza destinoTrasLogin, que bloquea la redirección abierta.
 * @param {string|null|undefined} rol
 * @param {string} [busqueda] window.location.search del login
 * @returns {string}
 */
export function destinoTrasLoginPorRol(rol, busqueda = "") {
  return esRolDelPanel(rol) ? DESTINO_INICIO_PANEL : destinoTrasLogin(busqueda);
}
