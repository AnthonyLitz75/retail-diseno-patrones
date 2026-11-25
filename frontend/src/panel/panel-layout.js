/**
 * @file panel-layout.js
 * Panel del personal (spec 13): marcado de la barra superior y del menú lateral. Funciones
 * puras que devuelven HTML con los textos del usuario escapados; panel-main.js las pinta.
 */

import { ROL } from "../utilidades/constantes.js";
import { html, seguro } from "../utilidades/seguridad.js";
import { icono } from "./iconos.js";
import { MENU_POR_ROL } from "./menu-por-rol.js";

/** Nombre visible de cada rol del personal (único lugar donde se define). */
export const ETIQUETA_ROL = Object.freeze({
  [ROL.ADMIN]: "Administrador",
  [ROL.VENDEDOR]: "Vendedor",
  [ROL.ALMACEN]: "Almacén",
  [ROL.SOPORTE]: "Soporte",
});

/** Texto que se muestra cuando no hay nombre del que sacar iniciales. */
const SIN_INICIALES = "?";

export const ID_BOTON_CERRAR_SESION = "panel-cerrar-sesion";

/** Botón del cajón del menú (visible solo por debajo de 992 px, ver panel.css y cajon-menu.js). */
export const ID_BOTON_MENU = "panel-boton-menu";

/** @param {unknown} rol */
export function etiquetaRol(rol) {
  return typeof rol === "string" && Object.hasOwn(ETIQUETA_ROL, rol) ? ETIQUETA_ROL[rol] : "";
}

/**
 * Iniciales del chip: primera letra del primer y del último nombre, en mayúsculas.
 * @param {unknown} nombre
 */
export function iniciales(nombre) {
  if (typeof nombre !== "string") return SIN_INICIALES;
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return SIN_INICIALES;
  const primera = (texto) => Array.from(texto)[0].toLocaleUpperCase("es");
  return partes.length === 1 ? primera(partes[0]) : primera(partes[0]) + primera(partes.at(-1));
}

/**
 * Barra superior: marca, «Panel del personal», «Ir a la tienda», chip y «Cerrar sesión».
 * @param {{ nombre?: string, rol?: string }} usuario
 */
export function renderizarBarraSuperior({ nombre = "", rol = "" } = {}) {
  return html`<header class="panel-cabecera">
  <button type="button" id="${ID_BOTON_MENU}" class="panel-boton-menu" aria-label="Abrir menú" aria-expanded="false" aria-controls="panel-menu"><span class="panel-boton-menu-barras" aria-hidden="true"></span></button>
  <div class="panel-marca">
    <span class="panel-marca-logo" aria-hidden="true">PA</span>
    <span class="panel-marca-nombre">Píxel Andino</span>
    <span class="panel-marca-etiqueta">Panel<span class="panel-marca-etiqueta-resto"> del personal</span></span>
  </div>
  <div class="panel-cabecera-acciones">
    <a class="panel-enlace-tienda" href="/">Ir a la tienda</a>
    <div class="panel-chip-usuario">
      <span class="panel-avatar" aria-hidden="true">${iniciales(nombre)}</span>
      <span class="panel-chip-texto">
        <span class="panel-chip-nombre">${nombre}</span>
        <span class="panel-insignia panel-insignia-azul panel-chip-rol">${etiquetaRol(rol)}</span>
      </span>
    </div>
    <button type="button" id="${ID_BOTON_CERRAR_SESION}" class="panel-boton-salir" data-cerrar-sesion>${seguro(icono("cerrar-sesion"))}<span>Cerrar sesión</span></button>
  </div>
</header>`;
}

/**
 * Menú lateral del rol a partir de MENU_POR_ROL. Vacío para CLIENTE o un rol desconocido.
 * @param {unknown} rol
 * @param {string} [rutaActiva] entrada marcada con aria-current="page"
 */
export function renderizarMenuLateral(rol, rutaActiva = "") {
  if (typeof rol !== "string" || !Object.hasOwn(MENU_POR_ROL, rol)) return "";
  const grupos = MENU_POR_ROL[rol].map(({ grupo, entradas }) => {
    const enlaces = entradas.map(({ ruta, etiqueta, icono: nombreIcono }) => {
      const actual = ruta === rutaActiva ? seguro(' aria-current="page"') : "";
      // La ruta es una constante congelada de MENU_POR_ROL (no viene del usuario).
      return html`<li><a class="panel-menu-enlace" href="${seguro(ruta)}"${actual}>${seguro(icono(nombreIcono))}<span>${etiqueta}</span></a></li>`;
    });
    return html`<div class="panel-menu-grupo">
    <p class="panel-menu-etiqueta">${grupo}</p>
    <ul class="panel-menu-lista">${seguro(enlaces.join(""))}</ul>
  </div>`;
  });
  // Pie del cajón (solo se ve por debajo de 576 px, donde la barra los oculta): «Ir a la tienda» y
  // «Cerrar sesión», con el mismo comportamiento. Sin id (el de la barra es único): data-cerrar-sesion.
  const pie = `<div class="panel-menu-pie">
    <a class="panel-enlace-tienda" href="/">Ir a la tienda</a>
    <button type="button" class="panel-boton-salir" data-cerrar-sesion>Cerrar sesión</button>
  </div>`;
  return html`<nav class="panel-menu" id="panel-menu" aria-label="Menú de ${etiquetaRol(rol)}">
  ${seguro(grupos.join(""))}
  ${seguro(pie)}
</nav>`;
}
