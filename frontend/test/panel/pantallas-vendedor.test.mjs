// Panel del personal (spec 19, T07): pantallas montadas para VENDEDOR (productos y consultas)
// y parámetro «nuevo» de #/productos.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leerCssPanel } from "./util-css.mjs";
import { resolverRuta, crearPanelRouter } from "../../src/panel/panel-router.js";
import { IDS_PRODUCTOS, pestanaDeProductos, pideNuevoProducto, RUTA_PRODUCTOS } from "../../src/panel/pantallas/productos.js";
import { IDS_CONSULTAS } from "../../src/panel/pantallas/consultas.js";
import { renderizarVistaProductos, renderizarVistaConsultas } from "../../src/layout/vistas-personal.js";
import { crearPanelProductos } from "../../src/catalogo/gestion/panel-productos.js";
import { configurarBandejaVendedor } from "../../src/vendedor/vendedor-vista.js";
import { ROL } from "../../src/utilidades/constantes.js";

test("#/productos lee nuevo y pestana; #/consultas lee consulta; los demás se ignoran", () => {
  assert.deepEqual(resolverRuta("#/productos?nuevo=1", "VENDEDOR").parametros, { nuevo: "1" });
  assert.deepEqual(resolverRuta("#/productos?pestana=stock-bajo", "VENDEDOR").parametros, { pestana: "stock-bajo" });
  assert.deepEqual(resolverRuta("#/productos?nuevo=1&x=2", "ADMIN").parametros, { nuevo: "1" });
  assert.deepEqual(resolverRuta("#/consultas?consulta=42", "VENDEDOR").parametros, { consulta: "42" });
  assert.deepEqual(resolverRuta("#/productos", "VENDEDOR").parametros, {});
  assert.equal(resolverRuta("#/productos?nuevo=1", "VENDEDOR").redireccion, undefined);
});

test("pideNuevoProducto y pestanaDeProductos: validan parámetros esperados", () => {
  assert.equal(pideNuevoProducto({ nuevo: "1" }), true);
  for (const p of [{}, { nuevo: "0" }, { nuevo: "" }, null, undefined]) assert.equal(pideNuevoProducto(p), false);
  assert.equal(pestanaDeProductos({ pestana: "stock-bajo" }), "stock-bajo");
  assert.equal(pestanaDeProductos({ pestana: "desactivados" }), "desactivados");
  assert.equal(pestanaDeProductos({ pestana: "activos" }), "activos");
  assert.equal(pestanaDeProductos({ pestana: "invalida" }), null);
  assert.equal(pestanaDeProductos(null), null);
  assert.equal(RUTA_PRODUCTOS, "#/productos");
});

test("#/productos enlaza los ids del panel de productos y del formulario de producto nuevo (P6)", () => {
  const html = renderizarVistaProductos();
  for (const id of ["seccion-gestion-productos", "form-producto", "resultado-formulario", "panel-nuevo-producto", "boton-nuevo-producto"]) {
    assert.ok(IDS_PRODUCTOS.includes(id), id);
  }
  for (const id of IDS_PRODUCTOS) assert.match(html, new RegExp(`id="${id}"`), id);
});

test("#/consultas enlaza los ids que usa configurarBandejaVendedor", () => {
  const html = renderizarVistaConsultas();
  assert.deepEqual([...IDS_CONSULTAS], [
    "seccion-preguntas-vendedor", "estado-preguntas-vendedor", "lista-preguntas-vendedor", "actualizar-preguntas-vendedor",
  ]);
  for (const id of IDS_CONSULTAS) assert.match(html, new RegExp(`id="${id}"`), id);
});

test("VENDEDOR carga sus cinco pantallas propias", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const router = crearPanelRouter({ rol: "VENDEDOR", ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
  for (const ruta of ["#/inicio", "#/productos", "#/pedidos", "#/consultas", "#/inventario"]) {
    const modulo = await router.cargadores[ruta]();
    assert.equal(typeof modulo.montar, "function", ruta);
  }
});

test("pedidos e inventario del VENDEDOR son las mismas pantallas que las de ALMACEN (sin duplicar)", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const comun = { ventana, documento: {}, menu: null, area: null, mostrarToast() {} };
  const vendedor = crearPanelRouter({ rol: "VENDEDOR", ...comun });
  const almacen = crearPanelRouter({ rol: "ALMACEN", ...comun });
  for (const ruta of ["#/pedidos", "#/inventario"]) {
    assert.equal((await vendedor.cargadores[ruta]()).montar, (await almacen.cargadores[ruta]()).montar, ruta);
  }
});

class NodoDom {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.style = {};
    this.classList = {
      set: new Set(),
      add: (...c) => c.forEach((x) => this.classList.set.add(x)),
      remove: (...c) => c.forEach((x) => this.classList.set.delete(x)),
      contains: (c) => this.classList.set.has(c),
    };
    this._className = "";
    this._text = "";
    this.value = "";
    this.hidden = false;
    this.disabled = false;
    this.focused = false;
  }
  set className(v) {
    this._className = String(v || "");
    this.classList.set = new Set(this._className.split(/\s+/).filter(Boolean));
  }
  get className() { return [...this.classList.set].join(" ") || this._className; }
  set textContent(v) { this._text = String(v ?? ""); }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(" "); }
  set innerHTML(v) { this._html = String(v || ""); }
  get innerHTML() { return this._html || ""; }
  set id(v) { this.attributes.set("id", String(v)); }
  get id() { return this.attributes.get("id") || ""; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  removeAttribute(k) { this.attributes.delete(k); }
  addEventListener(t, fn) {
    if (!this.listeners.has(t)) this.listeners.set(t, []);
    this.listeners.get(t).push(fn);
  }
  dispatchEvent(e) {
    e.preventDefault ??= () => {};
    for (const fn of this.listeners.get(e.type) ?? []) fn(e);
  }
  click() { this.dispatchEvent({ type: "click", target: this }); }
  focus() { this.focused = true; }
  scrollIntoView() {}
  append(...nodos) {
    for (const n of nodos) if (n) this.children.push(n);
  }
  replaceChildren(...nodos) {
    this.children = [];
    this.append(...nodos);
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
  querySelectorAll(sel) {
    const out = [];
    const visit = (n) => {
      for (const h of n.children) {
        const match = (sel.startsWith("#") && h.id === sel.slice(1)) ||
          (sel === "[data-consulta-id]" && h.dataset.consultaId !== undefined) ||
          (h.tagName === sel.toUpperCase());
        if (match) out.push(h);
        visit(h);
      }
    };
    visit(this);
    return out;
  }
}

function instalarDomMinimo() {
  globalThis.document = {
    createElement: (tag) => new NodoDom(tag),
    createTextNode: (txt) => {
      const n = new NodoDom("#text");
      n.textContent = txt;
      return n;
    },
    querySelector: () => null,
  };
  globalThis.Option = class MockOption extends NodoDom {
    constructor(txt = "", val = "") {
      super("option");
      this.textContent = txt;
      this.value = String(val);
    }
  };
}

test("panel-productos: skeletons de carga, error con Reintentar, limpiar búsqueda y deep-link de pestaña", async () => {
  instalarDomMinimo();
  let fallar = true;
  const panel = crearPanelProductos({
    apiRequest: async () => {
      if (fallar) throw new Error("Sin conexión");
      return {
        json: async () => [
          { id: 1, sku: "PA-1", nombre: "Mouse", categoria: "Periféricos", precio: 50, stock: 2, activo: true },
          { id: 2, sku: "PA-2", nombre: "Teclado", categoria: "Periféricos", precio: 120, stock: 15, activo: true },
        ],
      };
    },
  });

  await panel.cargar();
  const btnReintentar = panel.element.querySelectorAll("button").find((b) => b.textContent === "Reintentar");
  assert.equal(btnReintentar.hidden, false);

  fallar = false;
  panel.seleccionarPestana("stock-bajo");
  await panel.cargar();
  assert.equal(btnReintentar.hidden, true);
  assert.match(panel.element.textContent, /1 producto encontrado/);

  const buscar = panel.element.querySelector("#buscar-gestion-productos");
  const limpiar = panel.element.querySelector("#limpiar-busqueda-productos");
  buscar.value = "inexistente";
  buscar.dispatchEvent({ type: "input" });
  assert.equal(limpiar.hidden, false);
  assert.match(panel.element.textContent, /Limpiar filtros/);

  limpiar.click();
  assert.equal(buscar.value, "");
  assert.equal(limpiar.hidden, true);
});

test("vendedor-vista: skeletons, tarjeta vacía, error con Reintentar, validación inline y enfocarConsulta", async () => {
  instalarDomMinimo();
  const estadoEl = new NodoDom("p");
  const listaEl = new NodoDom("div");
  const btnAct = new NodoDom("button");
  let modo = "error";
  const enviadas = [];

  const bandeja = configurarBandejaVendedor({
    apiRequest: async (url, opts = {}) => {
      if (opts.method === "POST") {
        enviadas.push({ url, opts });
        return { json: async () => ({}) };
      }
      if (modo === "error") throw new Error("Fallo de red");
      if (modo === "vacio") return { json: async () => [] };
      return {
        json: async () => [
          { idConsulta: 11, nombreProducto: "Webcam", clienteNombre: "Ana", pregunta: "¿Tiene micrófono?", creadaEn: "2026-11-26T10:00:00Z" },
        ],
      };
    },
    obtenerEstado: () => ({ usuarioSesion: { rol: ROL.VENDEDOR } }),
    elementos: { estadoPreguntasVendedor: estadoEl, listaPreguntasVendedor: listaEl, btnActualizarPreguntas: btnAct },
  });

  await bandeja.cargarPreguntasVendedor();
  assert.match(listaEl.textContent, /Reintentar/);

  modo = "vacio";
  await bandeja.cargarPreguntasVendedor();
  assert.match(listaEl.textContent, /No hay preguntas pendientes/);

  modo = "datos";
  await bandeja.cargarPreguntasVendedor();
  assert.equal(bandeja.enfocarConsulta(11), true);
  const tarjeta = listaEl.querySelector("[data-consulta-id]");
  assert.equal(tarjeta.classList.contains("panel-consulta-enfocada"), true);

  const form = tarjeta.querySelector("form");
  const textarea = tarjeta.querySelector("textarea");
  assert.equal(textarea.focused, true);

  // Envío vacío muestra validación inline sin llamar a la API
  textarea.value = "   ";
  form.dispatchEvent({ type: "submit" });
  assert.equal(textarea.getAttribute("aria-invalid"), "true");
  assert.equal(enviadas.length, 0);

  // Al escribir actualiza contador y limpia error
  textarea.value = "Sí, incluye micrófono";
  textarea.dispatchEvent({ type: "input" });
  assert.equal(textarea.getAttribute("aria-invalid"), null);
  assert.match(tarjeta.textContent, /21 \/ 1000/);
});

test("responsive Vendedor: barra de productos adaptada a tablet (768px) y móvil (375px) con blancos táctiles de 44/48px", () => {
  const panelesCss = readFileSync(new URL("../../src/css/paneles.css", import.meta.url), "utf8");
  const panelCss = leerCssPanel();
  assert.match(panelesCss, /@media \(max-width:\s*991\.98px\)[\s\S]*?\.panel-productos-barra\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/);
  assert.match(panelesCss, /@media \(max-width:\s*575\.98px\)[\s\S]*?\.panel-productos-pestana\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(panelesCss, /\.panel-productos-pestana\s*\{[\s\S]*?color:\s*#475569/);
  assert.match(panelCss, /@media \(max-width:\s*575\.98px\)[\s\S]*?\.panel-inicio \.panel-consulta\s*\{[\s\S]*?flex-direction:\s*column/);
  assert.match(panelCss, /@media \(max-width:\s*575\.98px\)[\s\S]*?\.panel-consulta-tarjeta \.panel-boton\s*\{[\s\S]*?min-height:\s*48px/);
});
