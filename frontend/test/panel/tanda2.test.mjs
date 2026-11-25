// Panel del personal, tanda 2: fidelidad visual con los bocetos (barra, enlaces de tarjeta,
// cola de Almacén, entrada rápida, catálogo, Soporte, Admin y celular). Marcado + reglas de panel.css.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import { renderizarColumna, renderizarInicioAlmacen } from "../../src/panel/inicio/almacen-inicio.js";
import { renderizarCatalogo, renderizarInicioVendedor, renderizarTablaStockBajo } from "../../src/panel/inicio/vendedor-inicio.js";
import { MAX_PEDIDOS_POR_COLUMNA } from "../../src/panel/inicio/almacen-logica.js";

const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf8");
/** Cuerpos de todas las reglas cuyo selector (lista separada por comas) incluye exactamente el dado. */
const regla = (selector) => {
  const cuerpos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().endsWith(selector) && (x.trim() === selector || /\s$/.test(x.trim().slice(0, x.trim().length - selector.length))))) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return cuerpos.join(" ");
};
const cuenta = (texto, re) => (texto.match(re) ?? []).length;

// ---------- 1. Barra ----------

test("1: «Panel del personal» en mayúsculas, 12 px, 700, 0.06em, #475569 y borde izquierdo #cbd5e1", () => {
  const r = regla(".panel-marca-etiqueta");
  assert.match(r, /text-transform:\s*uppercase/);
  assert.match(r, /font-size:\s*12px/);
  assert.match(r, /font-weight:\s*700/);
  assert.match(r, /letter-spacing:\s*0\.06em/);
  assert.match(r, /color:\s*#475569/i);
  assert.match(r, /border-left:\s*1px solid #cbd5e1/i);
  assert.match(r, /padding-left:\s*12px/);
});

test("1: el chip es una pastilla con borde #e2e8f0: avatar y, al lado, nombre con el rol debajo", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana López", rol: "ADMIN" });
  assert.match(barra, /<div class="panel-chip-usuario">\s*<span class="panel-avatar"[^>]*>AL<\/span>\s*<span class="panel-chip-texto">\s*<span class="panel-chip-nombre">Ana López<\/span>\s*<span class="panel-insignia panel-insignia-azul panel-chip-rol">Administrador<\/span>/);
  assert.match(regla(".panel-chip-usuario"), /border:\s*1px solid #e2e8f0/i);
  assert.match(css, /@media \(min-width: 992px\)[\s\S]*?\.panel-chip-rol\s*\{[^}]*background:\s*transparent/);
});

// ---------- 8. Celular: barra en una fila y pie del cajón ----------

test("8: el texto «Panel del personal» se parte para mostrar solo «Panel» en celular", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana", rol: "VENDEDOR" });
  assert.match(barra, /<span class="panel-marca-etiqueta">Panel<span class="panel-marca-etiqueta-resto"> del personal<\/span><\/span>/);
});

test("8: «Ir a la tienda» y «Cerrar sesión» también están en el pie del cajón, sin repetir el id", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana", rol: "SOPORTE" });
  const menu = renderizarMenuLateral("SOPORTE", "#/inicio");
  assert.match(menu, /<div class="panel-menu-pie">\s*<a class="panel-enlace-tienda" href="\/">Ir a la tienda<\/a>\s*<button type="button" class="panel-boton-salir" data-cerrar-sesion>Cerrar sesión<\/button>/);
  assert.equal(cuenta(barra + menu, /id="panel-cerrar-sesion"/g), 1, "un solo id");
  assert.match(barra, /<button [^>]*id="panel-cerrar-sesion"[^>]*data-cerrar-sesion/);
  assert.match(menu, /<\/div>\s*<\/nav>$/, "el pie va dentro del <nav> del cajón");
});

test("8: por debajo de 576 px la barra es una fila y el pie del cajón es lo único que muestra tienda y salir", () => {
  const m = css.slice(css.indexOf("Tanda 2"));
  assert.match(m, /@media \(max-width: 575\.98px\)[\s\S]*?\.panel-cabecera\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(m, /@media \(max-width: 575\.98px\)[\s\S]*?\.panel-marca-etiqueta-resto[^{}]*\{[^}]*display:\s*none/);
  assert.match(m, /@media \(max-width: 575\.98px\)[\s\S]*?\.panel-cabecera \.panel-enlace-tienda[^{}]*\{[^}]*display:\s*none/);
  assert.match(m, /\.panel-menu-pie\s*\{[^}]*display:\s*none/, "el pie está oculto en pantallas anchas");
  assert.match(m, /@media \(max-width: 575\.98px\)[\s\S]*?\.panel-menu-pie\s*\{[^}]*display:\s*grid/);
});

// ---------- 2. Enlaces de cabecera de tarjeta ----------

test("2: los enlaces de cabecera van sin subrayado y lo muestran con el ratón y el foco", () => {
  assert.match(regla(".panel-enlace"), /text-decoration:\s*none/);
  assert.match(css, /\.panel-enlace:hover,\s*\.panel-enlace:focus-visible\s*\{[^}]*text-decoration:\s*underline/);
  assert.match(regla(".panel-bloque-cabecera"), /align-items:\s*center/);
});

test("2: «Ver los {n}» y «Ver todas» (Vendedor) se anclan a la línea del título; «Administrar productos» va en la cabecera", () => {
  assert.match(css, /\.panel-bloque-enlace\s*\{[^}]*position:\s*absolute[^}]*right:/);
  assert.match(regla(".panel-tarjeta"), /position:\s*relative/);
  const html = renderizarInicioVendedor();
  assert.match(html, /<div class="panel-bloque-cabecera">\s*<h2 id="inicio-titulo-catalogo"[^>]*>Catálogo<\/h2>\s*<a class="panel-enlace" href="#\/productos">Administrar productos<\/a>/);
});

// ---------- 3. Cola de Almacén ----------

const pedido = (id) => ({ idPedido: id, estado: "PENDIENTE", total: 10, productos: [{ nombreProducto: "X", cantidad: 1 }] });

test("3: la columna muestra como máximo 4 pedidos y «Ver {n} más» → #/pedidos; el contador sigue siendo el total", () => {
  assert.equal(MAX_PEDIDOS_POR_COLUMNA, 4);
  const seis = renderizarColumna("PENDIENTE", [1, 2, 3, 4, 5, 6].map(pedido));
  assert.equal(cuenta(seis, /<article class="panel-pedido">/g), 4);
  assert.match(seis, /<a class="panel-enlace panel-cola-mas" href="#\/pedidos">Ver 2 más<\/a>/);
  assert.match(seis, /panel-insignia[^>]*>6</, "el contador sigue en 6");
  const cuatro = renderizarColumna("PENDIENTE", [1, 2, 3, 4].map(pedido));
  assert.equal(cuenta(cuatro, /<article/g), 4);
  assert.doesNotMatch(cuatro, /Ver \d+ más/);
  const cinco = renderizarColumna("PENDIENTE", [1, 2, 3, 4, 5].map(pedido));
  assert.match(cinco, />Ver 1 más</);
});

test("3: cada columna es un recuadro #f1f5f9 de 12 px con las tarjetas de pedido blancas; el botón no se parte", () => {
  const col = regla(".panel-cola-columna");
  assert.match(col, /background:\s*#f1f5f9/i);
  assert.match(col, /border-radius:\s*12px/);
  assert.match(regla(".panel-pedido"), /background:\s*#ffffff/i);
  assert.match(css, /\.panel-pedido \.panel-boton-accion\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(renderizarInicioAlmacen(), /class="panel-inicio-rejilla panel-inicio-rejilla-cola"/);
});

// ---------- 4. Entrada rápida ----------

test("4: Cantidad y Motivo comparten fila (1 parte y 2 partes); apilados por debajo de 576 px", () => {
  const html = renderizarInicioAlmacen();
  assert.match(html, /<div class="panel-formulario-fila">\s*<div class="panel-campo">\s*<label for="inicio-cantidad-entrada"[\s\S]*?<div class="panel-campo">\s*<label for="inicio-motivo-entrada"/);
  assert.match(regla(".panel-formulario-fila"), /grid-template-columns:\s*1fr 2fr/);
  assert.match(css, /@media \(max-width: 575\.98px\)[\s\S]*?\.panel-formulario-fila\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});

// ---------- 5. Catálogo ----------

test("5: cada barra del catálogo es una fila: etiqueta, barra y número", () => {
  const html = renderizarCatalogo({ activos: 32, desactivados: 4, stockBajo: 2 });
  assert.match(html, /<div class="panel-barra-fila">\s*<p class="panel-barra-etiqueta">Activos<\/p>\s*<div class="panel-barra" aria-hidden="true">[\s\S]*?<\/div><\/div>\s*<p class="panel-barra-cantidad">32<\/p>/);
  assert.match(html, />Desactivados<\/p>[\s\S]*?panel-barra-cantidad">4</);
  assert.match(regla(".panel-barra-fila"), /display:\s*grid/);
  assert.match(regla(".panel-barra-fila"), /grid-template-columns:\s*minmax\([^)]*\)\s+minmax\(0, 1fr\)\s+auto/);
});

// ---------- 6. Soporte ----------

test("6: las tablas de Reclamos y Devoluciones del Inicio de Soporte van una debajo de otra", () => {
  assert.match(regla(".panel-inicio-columnas"), /grid-template-columns:\s*minmax\(0, 1fr\)/);
});

// ---------- 7. Admin ----------

test("7: la barra «Pendiente» es ámbar #d97706", () => {
  assert.match(css, /--panel-estado-pendiente:\s*#d97706/i);
});

// ---------- 9. Accesos rápidos ----------

test("9: el acceso rápido de la ruta actual es el relleno primario y lleva aria-current=page", () => {
  assert.match(renderizarInicioAlmacen(), /<a class="panel-chip" href="#\/inicio" aria-current="page">Inicio<\/a>/);
  const r = regla('.panel-chip[aria-current="page"]');
  assert.match(r, /background:\s*var\(--retail-blue-dark\)/, "el primario del panel (el mismo de los botones principales, con contraste 4.5:1)");
  assert.match(r, /color:\s*#ffffff/i);
});

// ---------- 10. Tablas de los Inicios como tarjetas apiladas en celular ----------

test("10: el stock bajo marca su tabla y las celdas de acción siguen en el mismo HTML accesible", () => {
  const html = renderizarTablaStockBajo([{ id: 1, nombre: "Webcam", stock: 3 }], 1);
  assert.match(html, /<table class="panel-tabla panel-tabla-stock">/);
  assert.match(html, /<th scope="row">Webcam<\/th>\s*<td class="panel-num">3<\/td>/);
});

test("10: por debajo de 576 px las filas son tarjetas y el botón ocupa todo el ancho a 48 px; desde 576 px vuelven a ser tablas", () => {
  const m = css.slice(css.indexOf("Tanda 2"));
  const bloque = m.slice(m.indexOf("Celular (< 576 px)"));
  assert.match(bloque, /@media \(max-width: 575\.98px\)/);
  assert.match(bloque, /\.panel-inicio \.panel-tabla tbody tr\s*\{[^}]*display:\s*grid/);
  assert.match(bloque, /grid-template-areas:\s*"principal estado"\s*"detalle detalle"\s*"accion accion"/);
  assert.match(bloque, /td:nth-child\(4\) \.panel-boton\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px/);
  assert.match(bloque, /\.panel-tabla-stock td\.panel-num::before\s*\{[^}]*content:\s*"Stock: "/);
  assert.doesNotMatch(css.slice(0, css.indexOf("Tanda 2")), /grid-template-areas:\s*"principal/, "fuera del @media no hay tarjetas");
});

// ---------- 8 (cajón): el pie entra en el recorrido con Tab ----------

test("8: con el pie del cajón, Tab recorre también «Cerrar sesión» y no sale del cajón", async () => {
  const { crearCajonMenu } = await import("../../src/panel/cajon-menu.js");
  class Nodo {
    constructor(tag, doc) { this.tagName = tag; this.doc = doc; this.children = []; this.parent = null; this.atributos = new Map(); this.dataset = {}; this.oyentes = {}; }
    append(...h) { for (const x of h) { x.parent = this; this.children.push(x); } }
    setAttribute(k, v) { this.atributos.set(k, String(v)); }
    getAttribute(k) { return this.atributos.get(k) ?? null; }
    addEventListener(t, f) { (this.oyentes[t] ??= []).push(f); }
    focus() { this.doc.activeElement = this; }
    contains(o) { for (let n = o; n; n = n.parent) if (n === this) return true; return false; }
    *todos() { for (const h of this.children) { yield h; yield* h.todos(); } }
    querySelectorAll(sel) {
      const a = (n) => n.tagName === "A" && n.getAttribute("href");
      if (sel === "a[href]") return [...this.todos()].filter(a);
      if (sel === "a[href], button") return [...this.todos()].filter((n) => a(n) || n.tagName === "BUTTON");
      return [];
    }
  }
  const teclas = [];
  const doc = { activeElement: null, addEventListener: (t, f) => { if (t === "keydown") teclas.push(f); }, removeEventListener() {} };
  const boton = new Nodo("BUTTON", doc);
  const menu = new Nodo("NAV", doc); menu.id = "panel-menu";
  const inicio = new Nodo("A", doc); inicio.setAttribute("href", "#/inicio");
  const tienda = new Nodo("A", doc); tienda.setAttribute("href", "/");
  const salir = new Nodo("BUTTON", doc);
  menu.append(inicio, tienda, salir);
  const frames = [];
  const cajon = crearCajonMenu({ boton, menu, documento: doc, siguienteFrame: (f) => frames.push(f), esperar() {} });
  cajon.abrir(); frames.splice(0).forEach((f) => f());
  assert.equal(doc.activeElement, inicio, "el foco inicial va a la primera entrada, no al pie");
  salir.focus();
  const ev = { key: "Tab", shiftKey: false, preventDefault() {} };
  teclas.forEach((f) => f(ev));
  assert.equal(doc.activeElement, boton, "del botón «Cerrar sesión» (último) se vuelve al botón del cajón");
  boton.focus();
  teclas.forEach((f) => f({ ...ev, shiftKey: true }));
  assert.equal(doc.activeElement, salir, "hacia atrás desde el botón del cajón se llega a «Cerrar sesión»");
});
