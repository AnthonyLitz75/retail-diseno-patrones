/**
 * @file menu-por-rol.js
 * Panel del personal (spec 12): fuente única del menú por rol. La barra lateral, el cajón
 * de celular y la guarda de rutas leen de aquí; no se duplica en otro sitio.
 * El rol CLIENTE no tiene menú de panel.
 */

import { ROL } from "../utilidades/constantes.js";

/** Entrada del menú: el id es la ruta sin «#/» y coincide con el nombre de su icono. */
const entrada = (id, etiqueta, icono = id) => Object.freeze({ id, etiqueta, icono, ruta: `#/${id}` });

const grupo = (nombre, entradas) => Object.freeze({ grupo: nombre, entradas: Object.freeze(entradas) });

const INICIO = entrada("inicio", "Inicio");

export const MENU_POR_ROL = Object.freeze({
  [ROL.ADMIN]: Object.freeze([
    grupo("Operación", [
      INICIO,
      entrada("pedidos", "Pedidos"),
      entrada("productos", "Productos"),
      entrada("inventario", "Inventario y kardex"),
      entrada("categorias", "Categorías"),
    ]),
    grupo("Administración", [
      entrada("cuentas", "Cuentas y roles"),
      entrada("reportes", "Reportes"),
      entrada("incidencias", "Incidencias"),
      entrada("auditoria", "Auditoría"),
    ]),
  ]),
  [ROL.VENDEDOR]: Object.freeze([
    grupo("Ventas", [
      INICIO,
      entrada("productos", "Productos"),
      entrada("pedidos", "Pedidos"),
      entrada("consultas", "Consultas de clientes"),
      entrada("inventario", "Inventario"),
    ]),
  ]),
  [ROL.ALMACEN]: Object.freeze([
    grupo("Almacén", [
      INICIO,
      entrada("pedidos", "Pedidos por atender"),
      entrada("inventario", "Inventario y kardex"),
    ]),
  ]),
  [ROL.SOPORTE]: Object.freeze([
    grupo("Atención al cliente", [
      INICIO,
      entrada("reclamos", "Reclamos"),
      entrada("devoluciones", "Devoluciones"),
      entrada("consulta-pedido", "Consulta de pedido"),
    ]),
  ]),
});

/**
 * Vista actual de la tienda (determinarVistasPorRol) que equivale a cada ruta del panel
 * (decisión P5). #/inicio es nueva y solo agrega datos ya disponibles: no tiene equivalente.
 */
export const VISTA_POR_RUTA = Object.freeze({
  "#/inicio": null,
  "#/pedidos": "pedidos",
  "#/productos": "productos",
  "#/inventario": "inventario",
  "#/consultas": "consultas",
  "#/categorias": "administracion",
  "#/cuentas": "administracion",
  "#/reportes": "administracion",
  "#/incidencias": "administracion",
  "#/auditoria": "administracion",
  "#/reclamos": "soporte",
  "#/devoluciones": "soporte",
  "#/consulta-pedido": "soporte",
});

/**
 * Ruta del panel que corresponde a una vista de la tienda (por ejemplo, el cambiarVista que
 * reciben los módulos existentes). La primera entrada del rol con esa vista; null si el rol
 * no la tiene en el panel (como «tienda»).
 * @param {string} vista
 * @param {string} rol
 * @returns {string|null}
 */
export function rutaDeVista(vista, rol) {
  return entradasDeRol(rol).find(({ ruta }) => VISTA_POR_RUTA[ruta] === vista)?.ruta ?? null;
}

/**
 * Entradas del rol en el orden del menú; vacío para CLIENTE o un rol desconocido.
 * @param {string|null|undefined} rol
 */
export function entradasDeRol(rol) {
  const grupos = typeof rol === "string" && Object.hasOwn(MENU_POR_ROL, rol) ? MENU_POR_ROL[rol] : [];
  return grupos.flatMap((g) => g.entradas);
}
