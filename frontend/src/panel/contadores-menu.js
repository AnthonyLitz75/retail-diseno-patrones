/**
 * @file contadores-menu.js
 * Panel del personal: contadores del menú lateral (y de los accesos rápidos en celular).
 *
 * - `calcularContadores(rol, fuentes)`: lógica pura. Convierte las fuentes que ya cargan los
 *   Inicios (resumen, pedidos operativos, preguntas, reclamos, devoluciones) en el contador de
 *   cada entrada del menú. No hay contador si el valor es 0 o si su fuente falló (null).
 * - `crearContadores({...})`: el marco guarda las últimas fuentes recibidas y repinta. Cada Inicio
 *   llama a `actualizarContadores(mapa)` cuando recibe (o pierde) sus datos; si el panel arranca
 *   en otra ruta, `cargarEnSegundoPlano()` pide UNA vez las mismas fuentes del rol y, si fallan,
 *   no muestra nada (sin toast). No hay llamadas en cada navegación.
 *
 * Accesibilidad: el número va con aria-hidden y la entrada lleva texto oculto («, 5 pendientes»)
 * que completa su nombre accesible («Pedidos, 5 pendientes»).
 */

import { entradasDeRol } from "./menu-por-rol.js";
import { plural } from "./utilidades-panel.js";

/** Fuentes de cada rol: son las que su Inicio ya carga. */
export const FUENTES_POR_ROL = Object.freeze({
  ADMIN: Object.freeze(["resumen"]),
  ALMACEN: Object.freeze(["pedidos"]),
  VENDEDOR: Object.freeze(["preguntas"]),
  SOPORTE: Object.freeze(["reclamos", "devoluciones"]),
});

const URL_FUENTE = Object.freeze({
  resumen: "/api/admin/reportes/resumen",
  pedidos: "/api/pedidos/operativos",
  preguntas: "/api/vendedor/preguntas",
  reclamos: "/api/soporte/reclamos",
  devoluciones: "/api/soporte/devoluciones",
});

const contar = (lista, estado) => (Array.isArray(lista) ? lista.filter((e) => e?.estado === estado).length : 0);

/** Definición de cada contador: ruta del menú, fuente, tono, valor y frase accesible. */
const CONTADORES_POR_ROL = Object.freeze({
  ADMIN: [
    { ruta: "#/pedidos", fuente: "resumen", tono: "ambar", valor: (r) => r?.pedidosPorEstado?.PENDIENTE, frase: (n) => plural(n, "pendiente", "pendientes") },
    { ruta: "#/incidencias", fuente: "resumen", tono: "rojo", valor: (r) => r?.escalados, frase: (n) => plural(n, "escalado", "escalados") },
  ],
  ALMACEN: [
    {
      ruta: "#/pedidos", fuente: "pedidos", tono: "ambar",
      valor: (p) => contar(p, "PENDIENTE") + contar(p, "EN_PREPARACION"),
      frase: (n) => plural(n, "por atender", "por atender"),
    },
  ],
  VENDEDOR: [
    { ruta: "#/consultas", fuente: "preguntas", tono: "ambar", valor: (p) => (Array.isArray(p) ? p.length : 0), frase: (n) => plural(n, "pendiente", "pendientes") },
  ],
  SOPORTE: [
    { ruta: "#/reclamos", fuente: "reclamos", tono: "ambar", valor: (r) => contar(r, "ABIERTO"), frase: (n) => plural(n, "abierto", "abiertos") },
    { ruta: "#/devoluciones", fuente: "devoluciones", tono: "ambar", valor: (d) => contar(d, "SOLICITADA"), frase: (n) => plural(n, "solicitada", "solicitadas") },
  ],
});

/**
 * @param {string} rol
 * @param {Record<string, unknown>} fuentes lo recibido hasta ahora; null = la fuente falló
 * @returns {Record<string, { valor: number, tono: "ambar"|"rojo", texto: string, etiqueta: string }>}
 *   solo las entradas con contador visible, por ruta
 */
export function calcularContadores(rol, fuentes = {}) {
  const resultado = {};
  const entradas = entradasDeRol(rol);
  for (const definicion of CONTADORES_POR_ROL[rol] ?? []) {
    const datos = fuentes[definicion.fuente];
    if (datos === null || datos === undefined) continue;
    const valor = Number(definicion.valor(datos));
    if (!Number.isFinite(valor) || valor <= 0) continue;
    const entrada = entradas.find((e) => e.ruta === definicion.ruta);
    if (!entrada) continue;
    resultado[definicion.ruta] = { valor, tono: definicion.tono, texto: definicion.frase(valor).replace(/^\d+ /, `${valor} `), etiqueta: entrada.etiqueta };
  }
  return resultado;
}

/** Marcado de la pastilla y de su texto oculto (el número es solo visual). */
export function htmlContador({ valor, tono, texto }) {
  const clase = tono === "rojo" ? "panel-contador panel-contador-rojo" : "panel-contador";
  const frase = String(texto).replace(/^\d+ /, "");
  return `<span class="${clase}" aria-hidden="true">${valor}</span><span class="visually-hidden">, ${valor} ${frase}</span>`;
}

const QUITAR = ".panel-contador, .panel-contador + .visually-hidden";

/**
 * @param {object} dependencias
 * @param {string} dependencias.rol
 * @param {{ querySelectorAll: Function }} dependencias.menu       nav del menú lateral
 * @param {{ querySelectorAll: Function }} [dependencias.documento] para los accesos rápidos
 * @param {Function} dependencias.apiRequest
 */
export function crearContadores({ rol, menu, documento = globalThis.document, apiRequest }) {
  /** Últimas fuentes recibidas (de los Inicios o de la carga de respaldo). */
  const fuentes = {};

  function pintar() {
    const mapa = calcularContadores(rol, fuentes);
    const enlaces = [
      ...menu.querySelectorAll("a[href]"),
      ...(documento?.querySelectorAll?.(".panel-chips-rapidos a[href]") ?? []),
    ];
    for (const enlace of enlaces) {
      for (const previo of [...enlace.querySelectorAll(QUITAR)]) previo.remove();
      const contador = mapa[enlace.getAttribute("href")];
      if (contador) enlace.insertAdjacentHTML("beforeend", htmlContador(contador));
    }
  }

  /** @param {Record<string, unknown>} parcial fuentes nuevas (o null si fallaron); las demás se conservan */
  function actualizarContadores(parcial) {
    Object.assign(fuentes, parcial);
    pintar();
  }

  async function cargarEnSegundoPlano() {
    const nombres = FUENTES_POR_ROL[rol] ?? [];
    const cargadas = await Promise.all(nombres.map(async (nombre) => {
      try {
        const respuesta = await apiRequest(URL_FUENTE[nombre]);
        return [nombre, await respuesta.json()];
      } catch {
        return [nombre, null];
      }
    }));
    // Lo que un Inicio ya haya enviado mientras tanto es más reciente: no se pisa.
    const nuevas = Object.fromEntries(cargadas.filter(([nombre]) => !(nombre in fuentes)));
    actualizarContadores(nuevas);
  }

  return { actualizarContadores, cargarEnSegundoPlano };
}
