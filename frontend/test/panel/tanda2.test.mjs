// Panel del personal, tanda 2: fidelidad visual con los bocetos (barra, enlaces de tarjeta,
// cola de Almacén, entrada rápida, catálogo, Soporte, Admin y celular). Marcado + reglas de panel.css.
import test from "node:test";
import assert from "node:assert/strict";
import { leerCssPanel, resolverVarsCss } from "./util-css.mjs";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import { renderizarColumna, renderizarInicioAlmacen } from "../../src/panel/inicio/almacen-inicio.js";
import { renderizarCatalogo, renderizarInicioVendedor, renderizarTablaStockBajo } from "../../src/panel/inicio/vendedor-inicio.js";
import { MAX_PEDIDOS_POR_COLUMNA } from "../../src/panel/inicio/almacen-logica.js";

const css = leerCssPanel();
/** Cuerpos de todas las reglas cuyo selector (lista separada por comas) incluye exactamente el dado. */
const regla = (selector) => {
  const cuerpos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().endsWith(selector) && (x.trim() === selector || /\s$/.test(x.trim().slice(0, x.trim().length - selector.length))))) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return resolverVarsCss(cuerpos.join(" "));
};
const cuenta = (texto, re) => (texto.match(re) ?? []).length;

// ---------- 1. Barra ----------

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

test("3: la columna muestra como máximo 4 pedidos y «Ver {n} más» → #/pedidos?estado=…; el contador sigue siendo el total", () => {
  assert.equal(MAX_PEDIDOS_POR_COLUMNA, 4);
  const seis = renderizarColumna("PENDIENTE", [1, 2, 3, 4, 5, 6].map(pedido));
  assert.equal(cuenta(seis, /<article class="panel-pedido">/g), 4);
  assert.match(seis, /<a class="panel-enlace panel-cola-mas" href="#\/pedidos\?estado=PENDIENTE">Ver 2 más<\/a>/);
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

test("5: la tarjeta del catálogo usa segmentos y casillas por estado de stock", () => {
  const html = renderizarCatalogo({ activos: 32, desactivados: 4, stockBajo: 2, agotado: 1 });
  assert.match(html, /<div class="panel-segmentos" aria-hidden="true">/);
  assert.match(html, />En stock<\/a><span class="panel-estado-numero">30</);
  assert.match(html, />Stock bajo<\/a><span class="panel-estado-numero">1</);
  assert.match(html, />Agotado<\/a><span class="panel-estado-numero">1</);
  assert.match(html, />Desactivados<\/a><span class="panel-estado-numero">4</);
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
  assert.match(css, /\.panel-chip\[aria-current="page"\]\s*\{[^}]*background:\s*var\(--retail-blue-dark\)/, "el primario del panel (el mismo de los botones principales, con contraste 4.5:1)");
  assert.match(r, /color:\s*#ffffff/i);
});

// ---------- 10. Tablas de los Inicios como tarjetas apiladas en celular ----------

test("10: el stock bajo marca su tabla y las celdas de acción siguen en el mismo HTML accesible", () => {
  const html = renderizarTablaStockBajo([{ id: 1, nombre: "Webcam", stock: 3 }], 1);
  assert.match(html, /<table class="panel-tabla panel-tabla-stock">/);
  assert.match(html, /<th scope="row">Webcam<\/th>\s*<td class="panel-num">3<\/td>/);
});

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

function cssSinMedia() {
  let salida = "";
  let i = 0;
  while (i < css.length) {
    const siguiente = css.indexOf("@media", i);
    if (siguiente < 0) {
      salida += css.slice(i);
      break;
    }
    salida += css.slice(i, siguiente);
    const abre = css.indexOf("{", siguiente);
    let nivel = 1;
    let j = abre + 1;
    while (nivel > 0 && j < css.length) {
      if (css[j] === "{") nivel += 1;
      else if (css[j] === "}") nivel -= 1;
      j += 1;
    }
    i = j;
  }
  return salida;
}

test("10: por debajo de 576 px las filas son tarjetas y el botón ocupa todo el ancho a 48 px; desde 576 px vuelven a ser tablas", () => {
  const bloque = bloquesMedia("(max-width: 575.98px)");
  assert.match(bloque, /\.panel-inicio \.panel-tabla tbody tr\s*\{[^}]*display:\s*grid/);
  assert.match(bloque, /grid-template-areas:\s*"principal estado"\s*"detalle detalle"\s*"accion accion"/);
  assert.match(bloque, /td:nth-child\(4\) \.panel-boton\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px/);
  assert.match(bloque, /\.panel-tabla-stock td\.panel-num::before\s*\{[^}]*content:\s*"Stock: "/);
  assert.doesNotMatch(cssSinMedia(), /grid-template-areas:\s*"principal/, "fuera del @media no hay tarjetas");
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
