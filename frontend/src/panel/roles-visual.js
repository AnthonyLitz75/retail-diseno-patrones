/**
 * @file roles-visual.js
 * Panel del personal: nombre legible y color de cada rol, compartidos por «Actividad reciente»
 * del Inicio del administrador y «Cuentas y roles». Los valores del rol (ADMIN, VENDEDOR…) no
 * cambian: solo cómo se muestran.
 */

import { html } from "../utilidades/seguridad.js";
import { iniciales } from "./panel-layout.js";

/** Orden en que se listan los roles (filtros, selector de alta, lista de permisos). */
export const ORDEN_ROLES = Object.freeze(["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE", "CLIENTE"]);

export const ROL_LEGIBLE = Object.freeze({
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  ALMACEN: "Almacén",
  SOPORTE: "Soporte",
  CLIENTE: "Cliente",
});

/** Nombre legible del rol; un valor desconocido se muestra tal cual y lo no textual, vacío. */
export function etiquetaRolLegible(rol) {
  if (Object.hasOwn(ROL_LEGIBLE, rol)) return ROL_LEGIBLE[rol];
  return typeof rol === "string" ? rol : "";
}

/** Clase de color del círculo de iniciales (ADMIN azul, VENDEDOR verde, ALMACEN cielo, SOPORTE ámbar, CLIENTE gris). */
export function claseRol(rol) {
  return `panel-rol-${Object.hasOwn(ROL_LEGIBLE, rol) ? rol.toLowerCase() : "cliente"}`;
}

/** Círculo con las iniciales del nombre, coloreado por rol (decorativo: el texto va al lado). */
export function htmlAvatarRol(nombre, rol) {
  return html`<span class="panel-avatar-rol ${claseRol(rol)}" aria-hidden="true">${iniciales(nombre)}</span>`;
}
