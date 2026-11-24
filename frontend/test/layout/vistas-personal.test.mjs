// Panel del personal (spec 19, T05): el HTML de las vistas del personal sale de un módulo
// compartido por la tienda y el panel, sin cambiar ni un carácter de lo que la tienda pinta.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderizarCatalogoLayout } from "../../src/layout/catalogo-layout.js";
import {
  renderizarVistaPedidos,
  renderizarVistaInventario,
  renderizarVistaProductos,
  renderizarVistaConsultas,
  renderizarVistaAdministracion,
  renderizarVistaSoporte,
} from "../../src/layout/vistas-personal.js";

const leerCaptura = (archivo) => readFileSync(new URL(`./fixtures/${archivo}`, import.meta.url), "utf-8")
  .replace(/\r\n/g, "\n");
/** Salida actual de renderizarCatalogoLayout (desde T11, sin las vistas del personal). */
const CAPTURA = leerCaptura("catalogo-layout.html");
/** Salida de renderizarCatalogoLayout en T05 (con las vistas del personal), antes de T11. */
const CAPTURA_T05 = leerCaptura("catalogo-layout-t05.html");
const HERO = '<div id="hero-test"></div>';

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const contar = (html, patron) => (html.match(patron) || []).length;

test("la tienda pinta exactamente el HTML capturado (actualizado en T11)", () => {
  assert.equal(renderizarCatalogoLayout({ heroHtml: HERO }), CAPTURA);
});

const VISTAS = [
  ["pedidos", renderizarVistaPedidos, ["seccion-pedidos", "titulo-pedidos", "estado-pedidos", "lista-pedidos"]],
  ["inventario", renderizarVistaInventario, [
    "seccion-inventario", "seccion-entrada-inventario", "form-entrada-inventario", "producto-entrada",
    "cantidad-entrada", "motivo-entrada", "estado-entrada-inventario", "filtros-movimientos",
    "filtro-producto-movimientos", "movimientos-desde", "movimientos-hasta", "estado-movimientos",
    "lista-movimientos", "paginacion-movimientos",
  ]],
  ["productos", renderizarVistaProductos, [
    "seccion-gestion-productos", "form-producto", "categoria-producto", "resultado-formulario",
  ]],
  ["consultas", renderizarVistaConsultas, [
    "seccion-preguntas-vendedor", "estado-preguntas-vendedor", "lista-preguntas-vendedor",
    "actualizar-preguntas-vendedor",
  ]],
  ["administracion", renderizarVistaAdministracion, []],
  ["soporte", renderizarVistaSoporte, []],
];

for (const [nombre, renderizar, idsModulo] of VISTAS) {
  test(`vista ${nombre}: el panel recibe el mismo marcado que la tienda`, () => {
    const html = renderizar();
    assert.ok(html.startsWith(`<div id="vista-${nombre}" class="modulo-vista" hidden>`), nombre);
    assert.ok(html.endsWith("</div>"), nombre);
    assert.equal(contar(html, /<div[\s>]/g), contar(html, /<\/div>/g), `${nombre}: bloque completo`);
    assert.ok(CAPTURA_T05.includes(html), `${nombre}: fragmento idéntico al que tenía la tienda en T05`);
  });

  test(`vista ${nombre}: conserva los ids que usan los módulos`, () => {
    const ids = idsDe(renderizar());
    for (const id of [`vista-${nombre}`, ...idsModulo]) assert.ok(ids.includes(id), `${nombre}: falta #${id}`);
    assert.equal(new Set(ids).size, ids.length, `${nombre}: ids repetidos`);
  });
}

test("T11: en la tienda queda #vista-pedidos (Mis compras); las vistas del personal salen", () => {
  const tienda = renderizarCatalogoLayout({ heroHtml: HERO });
  for (const [nombre, renderizar] of VISTAS) {
    const esperado = nombre === "pedidos" ? 1 : 0;
    assert.equal(contar(tienda, new RegExp(renderizar().slice(0, 40))), esperado, nombre);
  }
});
