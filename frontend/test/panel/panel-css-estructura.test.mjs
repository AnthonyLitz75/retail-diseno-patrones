// Verificación estructural de los manifiestos CSS del panel y catálogo:
// - Todos los @import existen, no hay ciclos y los manifiestos no mezclan reglas directas.
// - El orden de cascada de panel.css y catalogo.css se conserva intacto.
// - Ningún submódulo supera el límite razonable de mantenimiento ni usa tokens indefinidos.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { leerCssPanel, leerCssResuelto, listarImportsCss } from "./util-css.mjs";

const RUTAS_MANIFIESTOS = [
  "../../src/style.css",
  "../../src/css/catalogo.css",
  "../../src/css/panel.css",
];

function soloComentariosEImports(rutaRelativa) {
  const texto = readFileSync(new URL(rutaRelativa, import.meta.url), "utf8");
  const sinComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, "");
  return sinComentarios
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("@import "));
}

test("todos los @import en style.css, catalogo.css y panel.css apuntan a archivos existentes y sin ciclos", () => {
  for (const manifiesto of RUTAS_MANIFIESTOS) {
    const imports = listarImportsCss(manifiesto, import.meta.url);
    assert.ok(imports.length > 0, `${manifiesto} debe declarar @import`);
    for (const item of imports) {
      assert.equal(existsSync(item.rutaAbsoluta), true, `Falta archivo importado ${item.especificador} en ${manifiesto}`);
    }
    const resuelto = leerCssResuelto(manifiesto, import.meta.url);
    assert.ok(resuelto.length > 0, `${manifiesto} debe resolver contenido CSS`);
  }
});

test("panel.css y catalogo.css actúan como manifiestos puros (solo comentarios y @import)", () => {
  assert.deepEqual(soloComentariosEImports("../../src/css/panel.css"), []);
  assert.deepEqual(soloComentariosEImports("../../src/css/catalogo.css"), []);
});

test("panel.css mantiene el orden de cascada esperado entre sus submódulos", () => {
  const ordenEsperado = [
    "./panel/tokens.css",
    "./panel/marco-barra.css",
    "./panel/marco-menu.css",
    "./panel/marco-responsive.css",
    "./panel/inicio-base.css",
    "./panel/inicio-almacen.css",
    "./panel/tablas-y-vendedor.css",
    "./panel/soporte-admin-auditoria.css",
    "./panel/admin-inicio-v2.css",
    "./panel/cuentas-v2.css",
    "./panel/cuentas-responsive.css",
    "./panel/soporte-inicio-v6.css",
    "./panel/soporte-consulta.css",
    "./panel/soporte-bandejas.css",
    "./panel/soporte-conversacion.css",
    "./panel/soporte-devoluciones-y-retoques.css",
  ];
  const reales = listarImportsCss("../../src/css/panel.css", import.meta.url).map((i) => i.especificador);
  assert.deepEqual(reales, ordenEsperado);
});

test("catalogo.css mantiene el orden de cascada esperado entre sus submódulos", () => {
  const ordenEsperado = [
    "./catalogo/tarjetas-producto.css",
    "./catalogo/filtros-y-acciones.css",
    "./catalogo/pildoras-y-detalle.css",
    "./catalogo/paginacion-y-variantes.css",
  ];
  const reales = listarImportsCss("../../src/css/catalogo.css", import.meta.url).map((i) => i.especificador);
  assert.deepEqual(reales, ordenEsperado);
});

test("ningún submódulo CSS en panel/ ni catalogo/ supera 300 líneas", () => {
  for (const subcarpeta of ["panel", "catalogo"]) {
    const dir = fileURLToPath(new URL(`../../src/css/${subcarpeta}`, import.meta.url));
    const archivos = readdirSync(dir).filter((f) => f.endsWith(".css"));
    assert.ok(archivos.length > 0, `${subcarpeta}/ debe contener archivos CSS`);
    for (const archivo of archivos) {
      const lineas = readFileSync(`${dir}/${archivo}`, "utf8").split(/\r?\n/).length;
      assert.ok(lineas <= 300, `${subcarpeta}/${archivo} tiene ${lineas} líneas (máx. 300)`);
    }
  }
});

test("las variables --panel-* y --retail-* usadas en panel/ y catalogo/ están definidas", () => {
  const varsBase = readFileSync(new URL("../../src/css/variables.css", import.meta.url), "utf8");
  const panelCss = leerCssPanel();
  const catalogoCss = leerCssResuelto("../../src/css/catalogo.css", import.meta.url);
  const combinado = `${varsBase}\n${panelCss}\n${catalogoCss}`;

  const definidas = new Set();
  for (const m of combinado.matchAll(/(--(?:panel|retail)-[a-z0-9-]+)\s*:/gi)) {
    definidas.add(m[1]);
  }
  const usadas = new Set();
  for (const m of `${panelCss}\n${catalogoCss}`.matchAll(/var\(\s*(--(?:panel|retail)-[a-z0-9-]+)/gi)) {
    usadas.add(m[1]);
  }
  assert.ok(usadas.size > 0, "debe consumir variables --panel-* o --retail-*");
  for (const token of usadas) {
    assert.equal(definidas.has(token), true, `Token ${token} usado pero no definido en variables/tokens`);
  }
});

test("cada submódulo de panel/ y catalogo/ declara como máximo un bloque por consulta @media", () => {
  for (const subcarpeta of ["panel", "catalogo"]) {
    const dir = fileURLToPath(new URL(`../../src/css/${subcarpeta}`, import.meta.url));
    for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
      const contenido = readFileSync(`${dir}/${archivo}`, "utf8");
      const consultas = [...contenido.matchAll(/^\s*@media\s+([^{]+)\{/gm)].map((m) => m[1].trim());
      assert.equal(
        new Set(consultas).size,
        consultas.length,
        `${subcarpeta}/${archivo} repite un bloque @media: ${consultas.join(", ")}`,
      );
    }
  }
});
