// Utilidades para resolver @import CSS de forma estática en los tests sin servidor ni navegador.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RE_IMPORT_CSS = /^\s*@import\s+(?:url\()?["']([^"']+)["']\)?(?:\s+[^;]*)?;\s*$/;

function expandirCss(rutaAbsoluta, visitados) {
  if (visitados.has(rutaAbsoluta)) {
    throw new Error(`Ciclo de @import detectado en CSS: ${rutaAbsoluta}`);
  }
  visitados.add(rutaAbsoluta);

  const directorio = dirname(rutaAbsoluta);
  const lineas = readFileSync(rutaAbsoluta, "utf8").split(/\r?\n/);
  const salida = [];

  for (const linea of lineas) {
    const coincidencia = RE_IMPORT_CSS.exec(linea);
    if (coincidencia) {
      const rutaHija = resolve(directorio, coincidencia[1]);
      salida.push(expandirCss(rutaHija, visitados));
    } else {
      salida.push(linea);
    }
  }

  visitados.delete(rutaAbsoluta);
  return salida.join("\n");
}

/**
 * Lee un archivo CSS y expande recursivamente todos sus `@import` relativos en orden de cascada.
 * @param {string} rutaRelativa Ruta relativa al archivo llamador (o a `import.meta.url` de este módulo si no se pasa `baseUrl`).
 * @param {string | URL} [baseUrl] `import.meta.url` del archivo de test llamador.
 */
export function leerCssResuelto(rutaRelativa, baseUrl = import.meta.url) {
  const rutaAbsoluta = fileURLToPath(new URL(rutaRelativa, baseUrl));
  return expandirCss(rutaAbsoluta, new Set());
}

/** Devuelve `src/css/panel.css` completamente resuelto siguiendo todos sus `@import`. */
export function leerCssPanel() {
  return leerCssResuelto("../../src/css/panel.css", import.meta.url);
}

let mapaTokensCache = null;

function mapaTokensPanel() {
  if (mapaTokensCache) return mapaTokensCache;
  const vars = readFileSync(new URL("../../src/css/variables.css", import.meta.url), "utf8");
  const combined = `${vars}\n${leerCssPanel()}`;
  const mapa = new Map();
  for (const m of combined.matchAll(/(--(?:retail|panel)-[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    mapa.set(m[1], m[2].trim());
  }
  mapaTokensCache = mapa;
  return mapa;
}

/** Resuelve llamadas `var(--retail-*)` / `var(--panel-*)` cuyo destino es un color hexadecimal. */
export function resolverVarsCss(texto) {
  const mapa = mapaTokensPanel();
  const resolverColor = (nombre) => {
    let val = mapa.get(nombre);
    for (let paso = 0; paso < 2 && val; paso += 1) {
      const m = /^var\(\s*(--(?:retail|panel)-[a-z0-9-]+)\s*\)$/i.exec(val);
      if (!m) break;
      val = mapa.get(m[1]);
    }
    return val && /^#[0-9a-f]{3,8}$/i.test(val) ? val : null;
  };
  return texto.replace(/var\(\s*(--(?:retail|panel)-[a-z0-9-]+)\s*\)/gi, (coinc, nombre) => resolverColor(nombre) ?? coinc);
}

/** Lista los destinos directos `@import` declarados dentro de un manifiesto CSS. */
export function listarImportsCss(rutaRelativa, baseUrl = import.meta.url) {
  const rutaAbsoluta = fileURLToPath(new URL(rutaRelativa, baseUrl));
  const directorio = dirname(rutaAbsoluta);
  const lineas = readFileSync(rutaAbsoluta, "utf8").split(/\r?\n/);
  const destino = [];

  for (const linea of lineas) {
    const coincidencia = RE_IMPORT_CSS.exec(linea);
    if (coincidencia) {
      destino.push({
        especificador: coincidencia[1],
        rutaAbsoluta: resolve(directorio, coincidencia[1]),
      });
    }
  }
  return destino;
}
