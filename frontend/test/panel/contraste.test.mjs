// Panel del personal (spec 19, T12): contraste WCAG. Función pura de luminancia relativa y
// recorrido de los pares texto/fondo de los tokens del panel y de las insignias.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { relacionContraste, luminanciaRelativa, colorSobreFondo, parsearColor } from "../../src/panel/contraste.js";

// ---------- Función pura ----------

test("luminancia relativa: negro 0, blanco 1", () => {
  assert.equal(luminanciaRelativa("#000000"), 0);
  assert.equal(luminanciaRelativa("#ffffff"), 1);
});

test("relación de contraste: 21:1 entre negro y blanco, 1:1 consigo mismo, simétrica", () => {
  assert.equal(relacionContraste("#000000", "#ffffff"), 21);
  assert.equal(relacionContraste("#0d6efd", "#0d6efd"), 1);
  assert.equal(relacionContraste("#0f172a", "#ffffff"), relacionContraste("#ffffff", "#0f172a"));
  assert.ok(Math.abs(relacionContraste("#767676", "#ffffff") - 4.54) < 0.01, "gris de referencia WCAG");
});

test("colores: hex corto y largo, rgb y rgba (compuesto sobre un fondo)", () => {
  assert.deepEqual(parsearColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parsearColor("#0b192c"), { r: 11, g: 25, b: 44, a: 1 });
  assert.deepEqual(parsearColor("rgba(13, 110, 253, 0.32)"), { r: 13, g: 110, b: 253, a: 0.32 });
  assert.deepEqual(colorSobreFondo("rgba(0, 0, 0, 0.5)", "#ffffff"), "#808080");
  assert.throws(() => parsearColor("azul"));
});

// ---------- Tokens del panel ----------

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf-8");
const css = leer("../../src/css/variables.css") + leer("../../src/css/panel.css");

/** Valor de una variable CSS (resuelve var(--x) una vez y toma la última definición). */
function token(nombre) {
  const valores = [...css.matchAll(new RegExp(`${nombre}:\\s*([^;]+);`, "g"))].map((m) => m[1].trim());
  const valor = valores.at(-1);
  assert.ok(valor, `falta ${nombre}`);
  const referencia = valor.match(/^var\((--[\w-]+)\)$/);
  return referencia ? token(referencia[1]) : valor;
}

const BLANCO = "#ffffff";
const NORMAL = 4.5;
const GRANDE_O_COMPONENTE = 3;

/** [descripción, texto, fondo, mínimo]. */
const PARES = [
  ["texto principal / tarjeta", token("--retail-ink"), BLANCO, NORMAL],
  ["texto principal / página", token("--retail-ink"), token("--retail-bg-page"), NORMAL],
  ["texto secundario / tarjeta", token("--panel-texto-secundario"), BLANCO, NORMAL],
  ["texto secundario / página", token("--panel-texto-secundario"), token("--retail-bg-page"), NORMAL],
  ["encabezado de tabla", token("--panel-texto-secundario"), token("--panel-fila-encabezado"), NORMAL],
  ["títulos navy / tarjeta", token("--retail-navy"), BLANCO, NORMAL],
  ["ítem del menú / menú", token("--panel-menu-texto"), token("--retail-navy"), NORMAL],
  ["etiqueta de grupo / menú", token("--panel-menu-etiqueta"), token("--retail-navy"), NORMAL],
  ["ítem activo (blanco) / fondo activo", BLANCO, colorSobreFondo(token("--panel-menu-activo-fondo"), token("--retail-navy")), NORMAL],
  ["enlaces / tarjeta", token("--retail-blue-dark"), BLANCO, NORMAL],
  ["botón principal (blanco) / azul oscuro", BLANCO, token("--retail-blue-dark"), NORMAL],
  ["logo y avatar (blanco) / azul", BLANCO, token("--retail-blue"), NORMAL],
  ["errores de formulario / tarjeta", token("--panel-insignia-rojo-texto"), BLANCO, NORMAL],
  ...["verde", "ambar", "rojo", "azul", "neutro"].map((v) => [
    `insignia ${v}`, token(`--panel-insignia-${v}-texto`), token(`--panel-insignia-${v}-fondo`), NORMAL,
  ]),
  // Componentes (WCAG 1.4.11): el indicador de foco frente a lo que lo rodea.
  ["foco / tarjeta", token("--retail-blue"), BLANCO, GRANDE_O_COMPONENTE],
  ["foco en el menú / menú", BLANCO, token("--retail-navy"), GRANDE_O_COMPONENTE],
  ["borde de campo inválido / tarjeta", token("--panel-insignia-rojo-texto"), BLANCO, GRANDE_O_COMPONENTE],
];

for (const [descripcion, texto, fondo, minimo] of PARES) {
  test(`contraste ${descripcion}: ≥ ${minimo}:1`, () => {
    const relacion = relacionContraste(texto, fondo);
    assert.ok(relacion >= minimo, `${descripcion}: ${relacion.toFixed(2)}:1 (${texto} sobre ${fondo})`);
  });
}
