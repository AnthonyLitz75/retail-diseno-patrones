// Panel del personal (spec 19, T12): celular y accesibilidad que se pueden comprobar en Node.
// - «Saltar al contenido» como primer enlace de panel.html y botón del cajón en la barra.
// - Reglas de panel.css: cajón < 992 px, foco visible, 48 px < 576 px, tablas con desplazamiento
//   propio y sin desbordar la página.
// - Todo <th> de las tablas propias del panel lleva scope (col en la cabecera, row en el cuerpo).
// Lo que solo se ve en el navegador está en specs/panel-personal/pruebas-manuales.md.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderizarBarraSuperior, ID_BOTON_MENU } from "../../src/panel/panel-layout.js";
import { renderizarTablaStockBajo } from "../../src/panel/inicio/vendedor-inicio.js";
import { renderizarColaReclamos } from "../../src/panel/inicio/soporte-inicio.js";
import { renderizarInicioAlmacen } from "../../src/panel/inicio/almacen-inicio.js";
import { renderizarInicioAdmin } from "../../src/panel/inicio/admin-inicio.js";
import { renderizarInicioVendedor } from "../../src/panel/inicio/vendedor-inicio.js";
import { renderizarInicioSoporte } from "../../src/panel/inicio/soporte-inicio.js";
import { renderizarEncabezadoAuditoria } from "../../src/panel/pantallas/auditoria.js";
import { renderizarCabeceraConsulta } from "../../src/panel/pantallas/soporte.js";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf-8");
const css = leer("../../src/css/panel.css");
/** Cuerpo de la regla cuyo selector contiene `selector` (dentro o fuera de @media). */
const regla = (selector, fuente = css) => {
  const indice = fuente.indexOf(selector);
  if (indice === -1) return "";
  return fuente.slice(fuente.indexOf("{", indice) + 1, fuente.indexOf("}", indice));
};
const bloqueMedia = (consulta) => {
  const partes = css.split(`@media ${consulta}`).slice(1);
  return partes.map((p) => {
    let nivel = 0;
    for (let i = p.indexOf("{"); i < p.length; i += 1) {
      if (p[i] === "{") nivel += 1;
      if (p[i] === "}" && --nivel === 0) return p.slice(0, i + 1);
    }
    return p;
  }).join("\n");
};

// ---------- Saltar al contenido y botón del cajón ----------

test("panel.html: el primer elemento enfocable es «Saltar al contenido» y lleva al <main>", () => {
  const html = leer("../../panel.html");
  const cuerpo = html.slice(html.indexOf("<body"));
  const primero = cuerpo.match(/<(a|button|input|select|textarea)\b[^>]*>/)?.[0] ?? "";
  assert.match(primero, /^<a [^>]*class="saltar-contenido"/);
  assert.match(primero, /href="#panel-area"/);
  assert.match(primero, /data-saltar-a="panel-area"/);
  assert.match(cuerpo, /class="saltar-contenido"[^>]*>Saltar al contenido<\/a>/);
});

test("la barra superior tiene el botón del cajón con aria-label, aria-expanded y aria-controls", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana", rol: "ADMIN" });
  const boton = barra.match(new RegExp(`<button [^>]*id="${ID_BOTON_MENU}"[^>]*>`))?.[0] ?? "";
  assert.match(boton, /type="button"/);
  assert.match(boton, /aria-label="Abrir menú"/);
  assert.match(boton, /aria-expanded="false"/);
  assert.match(boton, /aria-controls="panel-menu"/);
  assert.ok(barra.indexOf(`id="${ID_BOTON_MENU}"`) < barra.indexOf("panel-marca"), "es lo primero de la barra");
});

// ---------- CSS: cajón, foco, 48 px y tablas ----------

test("el botón del cajón mide 44 × 44 px y solo se ve por debajo de 992 px", () => {
  assert.match(regla(".panel-boton-menu {"), /width:\s*var\(--panel-alto-pulsable\)/);
  assert.match(regla(".panel-boton-menu {"), /height:\s*var\(--panel-alto-pulsable\)/);
  assert.match(regla(".panel-boton-menu {"), /display:\s*none/);
  assert.match(regla(".panel-boton-menu", bloqueMedia("(max-width: 991.98px)")), /display:\s*inline-flex/);
});

test("por debajo de 992 px el menú es un cajón fijo que solo se ve abierto", () => {
  const movil = bloqueMedia("(max-width: 991.98px)");
  const menu = regla(".panel-menu {", movil);
  assert.match(menu, /position:\s*fixed/);
  assert.match(menu, /transform:\s*translateX\(-100%\)/);
  assert.match(regla('.panel-menu[data-abierto="true"]', movil), /transform:\s*none/);
});

test("foco visible en todo el panel y blanco dentro del menú oscuro", () => {
  assert.match(regla(".panel-pagina :focus-visible"), /outline:\s*3px solid/);
  assert.match(regla(".panel-pagina .panel-menu :focus-visible"), /outline-color:\s*#ffffff/);
});

test("por debajo de 576 px los botones de acción de tarjetas y filas de los Inicios miden 48 px", () => {
  const pequena = bloqueMedia("(max-width: 575.98px)");
  for (const selector of [".panel-inicio .panel-tabla .panel-boton", ".panel-inicio .panel-pedido .panel-boton",
    ".panel-inicio .panel-atencion .panel-boton", ".panel-inicio .panel-consulta .panel-boton"]) {
    assert.ok(pequena.includes(selector), selector);
  }
  assert.match(pequena, /min-height:\s*48px/);
});

test("las tablas se desplazan dentro de su contenedor y la página no desborda", () => {
  assert.match(regla(".panel-tabla-contenedor {"), /overflow-x:\s*auto/);
  assert.match(regla(".panel-pagina .table-responsive"), /overflow-x:\s*auto/);
  assert.match(regla(".panel-area {"), /min-width:\s*0/);
  assert.match(regla("body.panel-pagina {"), /overflow-x:\s*hidden/);
});

// ---------- Tablas propias: contenedor y <th scope> ----------

const TABLAS = {
  "Inicio del Vendedor · stock bajo": renderizarTablaStockBajo(
    [{ id: 1, nombre: "Mouse", stock: 0 }, { id: 2, nombre: "Webcam", stock: 3 }], 2),
  "Inicio de Soporte · reclamos": renderizarColaReclamos([
    { id: 1, pedidoId: 3, motivo: "Llegó dañado", estado: "ABIERTO" },
    { id: 2, pedidoId: 4, motivo: "No llegó", estado: "ESCALADO" },
  ], 7),
};

for (const [nombre, html] of Object.entries(TABLAS)) {
  test(`${nombre}: dentro de un contenedor con desplazamiento y con <th scope> correcto`, () => {
    assert.match(html, /<div class="panel-tabla-contenedor">\s*<table class="panel-tabla( panel-tabla-stock| panel-reclamos-cola)?">/);
    const cabecera = html.slice(html.indexOf("<thead>"), html.indexOf("</thead>"));
    const cuerpo = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    const thCabecera = cabecera.match(/<th\b[^>]*>/g) ?? [];
    const thCuerpo = cuerpo.match(/<th\b[^>]*>/g) ?? [];
    assert.ok(thCabecera.length > 0 && thCabecera.every((th) => /scope="col"/.test(th)), "cabecera con scope=col");
    assert.ok(thCuerpo.length > 0 && thCuerpo.every((th) => /scope="row"/.test(th)), "cada fila con su encabezado scope=row");
  });
}

test("el resto de pantallas propias del panel no pinta <th> sin scope", () => {
  const pantallas = [renderizarInicioAlmacen(), renderizarInicioAdmin(), renderizarInicioVendedor(),
    renderizarInicioSoporte(), renderizarEncabezadoAuditoria(), renderizarCabeceraConsulta()].join("\n");
  for (const th of pantallas.match(/<th\b[^>]*>/g) ?? []) assert.match(th, /scope="(col|row)"/, th);
});
