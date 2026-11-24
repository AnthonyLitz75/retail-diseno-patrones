/**
 * @file panel-router.js
 * Panel del personal (spec 13, T04): rutas hash de panel.html.
 * - resolverRuta (pura): hash + rol → ruta, entrada del menú, parámetros y, si procede, la
 *   redirección a #/inicio con su motivo.
 * - crearPanelRouter: escucha hashchange, carga cada pantalla con import() la primera vez,
 *   la monta una sola vez y en cada cambio actualiza aria-current, <title> y el foco al <h1>.
 * Las rutas válidas salen del menú del rol (menu-por-rol.js); no hay otra lista.
 */

import { ROL } from "../utilidades/constantes.js";
import { MENSAJE_SIN_ACCESO } from "./acceso.js";
import { VISTA_POR_RUTA, entradasDeRol } from "./menu-por-rol.js";

export const RUTA_INICIO = "#/inicio";

const SUFIJO_TITULO = "Panel del personal · Píxel Andino";

/** Parámetros de consulta que lee cada ruta (decisión P8); el resto se ignora. */
const PARAMETROS_POR_RUTA = Object.freeze({
  "#/consulta-pedido": Object.freeze(["pedido"]),
  "#/productos": Object.freeze(["nuevo"]),
  "#/cuentas": Object.freeze(["alta"]),
});

const MOTIVO = Object.freeze({ DESCONOCIDA: "desconocida", SIN_ACCESO: "sin-acceso" });

/** Separa «#/ruta?consulta» sin normalizar: las variantes (#/pedidos/, #/Pedidos) no coinciden. */
function separarHash(hash) {
  const texto = typeof hash === "string" ? hash : "";
  const indice = texto.indexOf("?");
  return indice === -1 ? { ruta: texto, consulta: "" } : { ruta: texto.slice(0, indice), consulta: texto.slice(indice + 1) };
}

function leerParametros(ruta, consulta) {
  const nombres = PARAMETROS_POR_RUTA[ruta] ?? [];
  const busqueda = new URLSearchParams(consulta);
  const parametros = {};
  for (const nombre of nombres) {
    // get() devuelve el primero si el parámetro se repite.
    if (busqueda.has(nombre)) parametros[nombre] = busqueda.get(nombre);
  }
  return parametros;
}

/**
 * @param {string} hash  window.location.hash
 * @param {string} rol
 * @returns {{ ruta: string, entrada: object|undefined, parametros: Record<string, string>,
 *   redireccion?: { a: string, motivo: "desconocida"|"sin-acceso", mensaje?: string } }}
 */
export function resolverRuta(hash, rol) {
  const entradas = entradasDeRol(rol);
  const { ruta, consulta } = separarHash(hash);
  const entrada = entradas.find((e) => e.ruta === ruta);
  if (entrada) return { ruta, entrada, parametros: leerParametros(ruta, consulta) };

  const inicio = entradas.find((e) => e.ruta === RUTA_INICIO);
  const redireccion = Object.hasOwn(VISTA_POR_RUTA, ruta)
    ? { a: RUTA_INICIO, motivo: MOTIVO.SIN_ACCESO, mensaje: MENSAJE_SIN_ACCESO }
    : { a: RUTA_INICIO, motivo: MOTIVO.DESCONOCIDA };
  return { ruta: RUTA_INICIO, entrada: inicio, parametros: {}, redireccion };
}

/** @param {string} etiqueta */
export function tituloPantalla(etiqueta) {
  return `${etiqueta} · ${SUFIJO_TITULO}`;
}

/** Pantallas de módulos existentes, compartidas por los roles que las tienen. */
const PANTALLAS = Object.freeze({
  pedidos: () => import("./pantallas/pedidos.js"),
  inventario: () => import("./pantallas/inventario.js"),
  productos: () => import("./pantallas/productos.js"),
  consultas: () => import("./pantallas/consultas.js"),
  soporte: () => import("./pantallas/soporte.js"),
  administracion: () => import("./pantallas/administracion.js"),
});

/** Pantallas ya construidas, por rol y ruta (cada tarea agrega las suyas). */
const CARGADORES_POR_ROL = Object.freeze({
  [ROL.ADMIN]: Object.freeze({
    "#/inicio": () => import("./inicio/admin-inicio.js"),
    "#/pedidos": PANTALLAS.pedidos,
    "#/productos": PANTALLAS.productos,
    "#/inventario": PANTALLAS.inventario,
    // Una sola instancia de Administración para sus cuatro rutas (decisión P5).
    "#/categorias": PANTALLAS.administracion,
    "#/cuentas": PANTALLAS.administracion,
    "#/reportes": PANTALLAS.administracion,
    "#/incidencias": PANTALLAS.administracion,
    "#/auditoria": () => import("./pantallas/auditoria.js"),
  }),
  [ROL.ALMACEN]: Object.freeze({
    "#/inicio": () => import("./inicio/almacen-inicio.js"),
    "#/pedidos": PANTALLAS.pedidos,
    "#/inventario": PANTALLAS.inventario,
  }),
  [ROL.VENDEDOR]: Object.freeze({
    "#/inicio": () => import("./inicio/vendedor-inicio.js"),
    "#/productos": PANTALLAS.productos,
    "#/pedidos": PANTALLAS.pedidos,
    "#/consultas": PANTALLAS.consultas,
    "#/inventario": PANTALLAS.inventario,
  }),
  [ROL.SOPORTE]: Object.freeze({
    "#/inicio": () => import("./inicio/soporte-inicio.js"),
    // Un solo portal de Soporte para las tres rutas (decisión P1).
    "#/reclamos": PANTALLAS.soporte,
    "#/devoluciones": PANTALLAS.soporte,
    "#/consulta-pedido": PANTALLAS.soporte,
  }),
});

function cargadoresPorDefecto(rol) {
  const propios = CARGADORES_POR_ROL[rol] ?? {};
  return Object.fromEntries(entradasDeRol(rol).map(({ ruta }) => [ruta, propios[ruta]]).filter(([, cargar]) => cargar));
}

/**
 * @param {object} opciones
 * @param {string} opciones.rol
 * @param {Window} opciones.ventana
 * @param {Document} opciones.documento
 * @param {HTMLElement} opciones.menu   nav con los enlaces del menú lateral
 * @param {HTMLElement} opciones.area   <main> donde se montan las pantallas
 * @param {Record<string, () => Promise<{ montar: Function }>>} [opciones.cargadores]
 * @param {(mensaje: string, tipo?: string) => void} opciones.mostrarToast
 * @param {object} [opciones.servicios] lo que las pantallas necesitan del panel (apiRequest,
 *   estado compartido, Modal…); llega a montar() en el contexto.
 *
 * Contrato de una pantalla: `montar(contenedor, { entrada, parametros, rol, servicios, estaVisible })` se
 * llama una sola vez y puede devolver `{ alMostrar(parametros) }`, que el router llama cada vez
 * que muestra la pantalla (también la primera) para recargar sus datos.
 */
export function crearPanelRouter({ rol, ventana, documento, menu, area, cargadores, mostrarToast, servicios = {} }) {
  const tablaCargadores = { ...cargadoresPorDefecto(rol), ...cargadores };
  /** ruta → Promise<{ contenedor, alMostrar }>: un solo import() y un solo montaje por ruta. */
  const montajes = new Map();
  let rutaActual = null;

  function montarPantalla(ruta, entrada, parametros) {
    if (!montajes.has(ruta)) {
      const promesa = (async () => {
        const modulo = await tablaCargadores[ruta]();
        const contenedor = documento.createElement("section");
        contenedor.dataset.ruta = ruta;
        contenedor.hidden = true;
        area.append(contenedor);
        // estaVisible(): ¿la ruta de esta pantalla sigue siendo la actual? (cargas diferidas)
        const estaVisible = () => rutaActual === ruta;
        const controlador = await modulo.montar(contenedor, { entrada, parametros, rol, servicios, estaVisible });
        return { contenedor, alMostrar: controlador?.alMostrar };
      })();
      // Si falla, se olvida para reintentar la próxima vez que se visite la ruta.
      promesa.catch(() => montajes.delete(ruta));
      montajes.set(ruta, promesa);
    }
    return montajes.get(ruta);
  }

  function marcarMenu(ruta) {
    for (const enlace of menu?.querySelectorAll("a[href]") ?? []) {
      if (enlace.getAttribute("href") === ruta) enlace.setAttribute("aria-current", "page");
      else enlace.removeAttribute("aria-current");
    }
  }

  function mostrar(contenedor) {
    for (const hijo of area.children) hijo.hidden = hijo !== contenedor;
    const titulo = contenedor.querySelector("h1");
    if (titulo) {
      if (!titulo.hasAttribute("tabindex")) titulo.setAttribute("tabindex", "-1");
      titulo.focus();
    }
  }

  async function navegar() {
    const { ruta, entrada, parametros, redireccion } = resolverRuta(ventana.location.hash, rol);
    if (redireccion) {
      if (redireccion.mensaje) mostrarToast(redireccion.mensaje, "advertencia");
      const { pathname = "", search = "" } = ventana.location;
      // replaceState no crea entrada en el historial ni dispara hashchange.
      ventana.history.replaceState(null, "", `${pathname}${search}${redireccion.a}`);
    }
    rutaActual = ruta;
    marcarMenu(ruta);
    documento.title = tituloPantalla(entrada.etiqueta);
    let pantalla;
    try {
      pantalla = await montarPantalla(ruta, entrada, parametros);
    } catch {
      mostrarToast("No se pudo cargar esta sección. Inténtalo de nuevo.", "error");
      return;
    }
    // Si el usuario ya cambió de ruta mientras cargaba, no se muestra esta.
    if (rutaActual !== ruta) return;
    mostrar(pantalla.contenedor);
    if (typeof pantalla.alMostrar === "function") {
      try {
        // Cada pantalla muestra sus propios errores de carga; el router solo sigue adelante.
        await pantalla.alMostrar(parametros);
      } catch {
        // Sin acción: la pantalla ya informó del fallo en su bloque.
      }
    }
  }

  function iniciar() {
    ventana.addEventListener("hashchange", () => navegar());
    return navegar();
  }

  return { iniciar, navegar, cargadores: tablaCargadores, rutaActual: () => rutaActual };
}
