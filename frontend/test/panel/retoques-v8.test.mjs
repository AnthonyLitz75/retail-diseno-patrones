// Panel del personal: dos ajustes pequeños de Soporte (v8): la fila de acciones del reclamo y la
// casilla «Solicitada» de la devolución.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderizarDetalleDevolucion } from "../../src/panel/pantallas/bandeja-vista.js";

const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf8");
const AHORA = new Date("2026-11-25T12:00:00Z");

function reglaEn(texto, selector) {
  const cuerpos = [];
  for (const m of texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return cuerpos.join(" ");
}
const regla = (selector) => reglaEn(css, selector);
function bloquesMedia(consulta) {
  let salida = "";
  let desde = 0;
  for (;;) {
    const i = css.indexOf(`@media ${consulta}`, desde);
    if (i < 0) break;
    const abre = css.indexOf("{", i);
    let nivel = 1;
    let j = abre + 1;
    while (nivel > 0 && j < css.length) {
      if (css[j] === "{") nivel += 1;
      else if (css[j] === "}") nivel -= 1;
      j += 1;
    }
    salida += css.slice(abre + 1, j - 1);
    desde = j;
  }
  return salida;
}

test("1: la etiqueta de la casilla y el texto de los botones no se parten (nowrap)", () => {
  assert.match(regla(".panel-acciones-fila .form-check-label"), /white-space:\s*nowrap/);
  assert.match(regla(".panel-acciones-detalle .panel-boton"), /white-space:\s*nowrap/);
});

test("1: la fila hace wrap: casilla a la izquierda y botones a la derecha; si no caben, los botones bajan alineados a la derecha", () => {
  assert.match(regla(".panel-acciones-fila"), /flex-wrap:\s*wrap/);
  assert.match(regla(".panel-acciones-fila"), /justify-content:\s*space-between/);
  assert.match(regla(".panel-acciones-fila .panel-acciones-detalle"), /margin-left:\s*auto/);
  assert.match(regla(".panel-acciones-fila .panel-acciones-detalle"), /justify-content:\s*flex-end/);
  // Ninguna regla de escritorio obliga a una sola línea: eso partía el texto de los botones.
  assert.doesNotMatch(bloquesMedia("(min-width: 992px)"), /\.panel-acciones-fila[^{]*\{[^}]*flex-wrap:\s*nowrap/);
});

test("2: casilla «Solicitada»: fecha y hora en una línea y debajo «hace {n} días» en 12 px #64748b", () => {
  const dev = { id: 2, pedidoId: 4, estado: "SOLICITADA", motivo: "m", importeReembolso: 175, creadoEn: new Date(AHORA.getTime() - 100 * 3600_000).toISOString(), lineas: [] };
  const html = renderizarDetalleDevolucion(dev, { contexto: null, ahora: AHORA });
  assert.match(html, /<dt>Solicitada<\/dt>\s*<dd><time class="panel-casilla-fecha" datetime="[^"]+">[^<]+<\/time><small class="panel-casilla-espera">hace 4 días<\/small><\/dd>/);
  assert.doesNotMatch(html, /<dt>Solicitada<\/dt>\s*<dd>[^<]* · /, "ya no van en el mismo texto");
  assert.match(regla(".panel-casilla-fecha"), /white-space:\s*nowrap/);
  const espera = regla(".panel-casilla-espera");
  assert.match(espera, /font-size:\s*12px/);
  assert.match(espera, /color:\s*#64748b/i);
});
