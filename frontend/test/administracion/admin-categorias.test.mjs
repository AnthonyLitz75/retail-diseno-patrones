import test from "node:test";
import assert from "node:assert/strict";
import { inicializarAdminCategorias } from "../../src/administracion/admin-categorias.js";

class MockClassList {
  constructor(nodo) { this.nodo = nodo; this.set = new Set(); }
  add(...clases) { for (const c of clases) if (c) this.set.add(c); }
  remove(...clases) { for (const c of clases) this.set.delete(c); }
  contains(c) { return this.set.has(c); }
  sincronizar(valor) { this.set = new Set(String(valor || "").split(/\s+/).filter(Boolean)); }
  toString() { return [...this.set].join(" "); }
}

class MockNode {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = new Map();
    this.dataset = {};
    this.listeners = new Map();
    this.classList = new MockClassList(this);
    this._className = "";
    this._textContent = "";
    this.value = "";
    this.type = "";
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.inert = false;
    this.focused = false;
  }
  set className(v) { this._className = String(v || ""); this.classList.sincronizar(this._className); }
  get className() { return this.classList.toString() || this._className; }
  set textContent(v) { this._textContent = String(v ?? ""); }
  get textContent() {
    if (this.children.length === 0) return this._textContent;
    return this._textContent + this.children.map((c) => c.textContent).join(" ");
  }
  set id(v) { this.attributes.set("id", String(v)); }
  get id() { return this.attributes.get("id") || ""; }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  removeAttribute(k) { this.attributes.delete(k); }
  addEventListener(tipo, fn) {
    if (!this.listeners.has(tipo)) this.listeners.set(tipo, []);
    this.listeners.get(tipo).push(fn);
  }
  dispatchEvent(evento) {
    evento.target ??= this;
    evento.currentTarget ??= this;
    evento.preventDefault ??= () => {};
    for (const fn of this.listeners.get(evento.type) ?? []) fn(evento);
    if (this.parentNode) {
      evento.currentTarget = this.parentNode;
      this.parentNode.dispatchEvent(evento);
    }
  }
  click() { this.dispatchEvent({ type: "click", target: this }); }
  focus() { this.focused = true; }
  scrollIntoView() {}
  reset() {
    for (const el of this.querySelectorAll("input, select")) {
      if (el.tagName === "SELECT") el.value = el.children[0]?.value ?? "";
      else el.value = "";
    }
  }
  append(...nodos) {
    for (const nodo of nodos) {
      if (!nodo) continue;
      if (nodo.tagName === "FRAGMENT") {
        this.append(...nodo.children);
        continue;
      }
      nodo.parentNode = this;
      this.children.push(nodo);
    }
  }
  replaceChildren(...nodos) {
    this.children = [];
    this.append(...nodos);
  }
  closest(selector) {
    if (coincideSelector(this, selector)) return this;
    return this.parentNode ? this.parentNode.closest(selector) : null;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
  querySelectorAll(selector) {
    const partes = selector.split(",").map((s) => s.trim());
    const salida = [];
    const visitar = (nodo) => {
      for (const hijo of nodo.children) {
        if (partes.some((p) => coincideSelector(hijo, p))) salida.push(hijo);
        visitar(hijo);
      }
    };
    visitar(this);
    return salida;
  }
}

function coincideSelector(nodo, selector) {
  if (selector.startsWith("#")) return nodo.id === selector.slice(1);
  if (selector.startsWith(".")) return nodo.classList.contains(selector.slice(1));
  if (selector === "[data-estado]") return nodo.dataset.estado !== undefined;
  const attrMatch = selector.match(/^\[([^=\]]+)="([^"]+)"\]$/);
  if (attrMatch) return nodo.getAttribute(attrMatch[1]) === attrMatch[2] ||
    (attrMatch[1].startsWith("data-") && nodo.dataset[attrMatch[1].slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] === attrMatch[2]);
  const tagSubmit = selector.match(/^button\[type="submit"\]$/);
  if (tagSubmit) return nodo.tagName === "BUTTON" && nodo.type === "submit";
  return nodo.tagName === selector.toUpperCase();
}

function instalarDomMinimo() {
  globalThis.document = {
    createElement: (tag) => new MockNode(tag),
    createDocumentFragment: () => new MockNode("FRAGMENT"),
  };
  globalThis.Option = class MockOption extends MockNode {
    constructor(texto = "", valor = "") {
      super("option");
      this.textContent = texto;
      this.value = String(valor);
    }
  };
}

function crearSeccionCategorias() {
  const crear = (tag, id, cls = "", attrs = {}) => {
    const n = new MockNode(tag);
    if (id) n.id = id;
    if (cls) n.className = cls;
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "type") n.type = v;
      else if (k === "hidden") n.hidden = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("data-")) n.dataset[k.slice(5)] = v;
      else n.setAttribute(k, v);
    }
    return n;
  };

  const seccion = crear("section", "admin-seccion-categorias");
  const form = crear("form", "form-categoria-admin");
  const nombre = crear("input", "nombre-categoria-admin", "form-control");
  const errorNombre = crear("p", "error-nombre-categoria-admin", "invalid-feedback");
  const padre = crear("select", "padre-categoria-admin", "form-select");
  const enviar = crear("button", "", "btn btn-primary", { type: "submit", text: "Crear categoría" });
  form.append(nombre, errorNombre, padre, enviar);

  const estado = crear("p", "estado-categoria-admin");
  const reintentar = crear("button", "reintentar-carga-categorias", "btn", { type: "button", hidden: true });
  const filtros = crear("div", "filtro-estado-categorias");
  filtros.append(
    crear("button", "", "cuentas-filtro", { type: "button", "data-estado": "todas", "aria-pressed": "true", text: "Todas" }),
    crear("button", "", "cuentas-filtro", { type: "button", "data-estado": "activas", "aria-pressed": "false", text: "Activas" }),
    crear("button", "", "cuentas-filtro", { type: "button", "data-estado": "inactivas", "aria-pressed": "false", text: "Inactivas" }),
  );
  const buscar = crear("input", "buscar-categorias-admin", "form-control");
  const limpiar = crear("button", "limpiar-busqueda-categorias", "panel-categorias-limpiar", { type: "button", hidden: true });
  const alternar = crear("button", "alternar-todo-categorias", "btn", { type: "button", text: "Colapsar todo" });
  const seleccionar = crear("button", "seleccionar-resultados-categorias", "btn", { type: "button", text: "Seleccionar visibles" });
  const lote = crear("div", "acciones-categorias-lote", "panel-categorias-lote", { hidden: true });
  const resumen = crear("span", "resumen-seleccion-categorias");
  const activarLote = crear("button", "activar-categorias-seleccionadas", "btn", { type: "button" });
  const desactivarLote = crear("button", "desactivar-categorias-seleccionadas", "btn", { type: "button" });
  lote.append(resumen, activarLote, desactivarLote);
  const lista = crear("ul", "lista-categorias-admin", "panel-categorias-arbol");

  seccion.append(form, estado, reintentar, filtros, buscar, limpiar, alternar, seleccionar, lote, lista);
  return seccion;
}

test("cargarCategorias muestra skeletons iniciales y luego renderiza árbol con contadores y badges", async () => {
  instalarDomMinimo();
  const seccion = crearSeccionCategorias();
  const lista = seccion.querySelector("#lista-categorias-admin");
  let resolver;
  const pendiente = new Promise((r) => { resolver = r; });

  const modulo = inicializarAdminCategorias({
    seccion,
    apiRequest: async () => ({ json: async () => pendiente }),
    mostrarEstado: (el, txt) => { el.textContent = txt; },
    confirmar: async () => true,
    notificar: () => {},
  });

  const carga = modulo.cargarCategorias();
  assert.equal(lista.getAttribute("aria-busy"), "true");
  assert.equal(lista.children.length, 4);
  assert.ok(lista.children.every((li) => li.getAttribute("aria-hidden") === "true"));

  resolver([
    { idCategoria: 1, nombre: "Periféricos", activa: true, categoriaPadreId: null, totalProductos: 0 },
    { idCategoria: 2, nombre: "Teclados", activa: false, categoriaPadreId: 1, totalProductos: 5 },
  ]);
  await carga;

  assert.equal(lista.getAttribute("aria-busy"), "false");
  assert.equal(lista.children.length, 1);
  assert.match(lista.children[0].textContent, /Periféricos/);
  assert.match(lista.children[0].textContent, /1 subcategoría/);
  assert.match(lista.children[0].textContent, /5 productos/);
  assert.match(lista.children[0].textContent, /Inactiva/);
});

test("cargarCategorias ante fallo muestra estado de error con Reintentar", async () => {
  instalarDomMinimo();
  const seccion = crearSeccionCategorias();
  const modulo = inicializarAdminCategorias({
    seccion,
    apiRequest: async () => { throw new Error("Sin red"); },
    mostrarEstado: (el, txt) => { el.textContent = txt; },
    confirmar: async () => true,
    notificar: () => {},
  });

  await modulo.cargarCategorias();
  const lista = seccion.querySelector("#lista-categorias-admin");
  assert.equal(seccion.querySelector("#reintentar-carga-categorias").hidden, false);
  assert.match(lista.textContent, /No se pudieron cargar las categorías/);
  assert.match(lista.textContent, /Reintentar/);
});

test("filtros, limpiar búsqueda, colapsar/expandir todo, + Subcategoría y estado vacío con Limpiar filtros", async () => {
  instalarDomMinimo();
  const seccion = crearSeccionCategorias();
  const datos = [
    { idCategoria: 1, nombre: "Periféricos", activa: true, categoriaPadreId: null, totalProductos: 1 },
    { idCategoria: 2, nombre: "Teclados", activa: true, categoriaPadreId: 1, totalProductos: 3 },
    { idCategoria: 3, nombre: "Monitores", activa: false, categoriaPadreId: null, totalProductos: 0 },
  ];
  const modulo = inicializarAdminCategorias({
    seccion,
    apiRequest: async () => ({ json: async () => datos }),
    mostrarEstado: (el, txt) => { el.textContent = txt; },
    confirmar: async () => true,
    notificar: () => {},
  });
  await modulo.cargarCategorias();

  const btnAlternar = seccion.querySelector("#alternar-todo-categorias");
  assert.equal(btnAlternar.textContent, "Colapsar todo");
  btnAlternar.click();
  assert.equal(btnAlternar.textContent, "Expandir todo");
  assert.equal(seccion.querySelector("#panel-categoria-hijos-1").hidden, true);
  btnAlternar.click();
  assert.equal(btnAlternar.textContent, "Colapsar todo");
  assert.equal(seccion.querySelector("#panel-categoria-hijos-1").hidden, false);

  // Acción rápida + Subcategoría
  const btnSub = seccion.querySelector('[data-agregar-subcategoria="1"]');
  btnSub.click();
  assert.equal(seccion.querySelector("#padre-categoria-admin").value, "1");
  assert.equal(seccion.querySelector("#nombre-categoria-admin").focused, true);

  // Filtro por estado + búsqueda sin resultados -> Limpiar filtros
  const btnInactivas = seccion.querySelector('[data-estado="inactivas"]');
  btnInactivas.click();
  assert.equal(btnInactivas.getAttribute("aria-pressed"), "true");
  const buscar = seccion.querySelector("#buscar-categorias-admin");
  buscar.value = "noexiste";
  buscar.dispatchEvent({ type: "input" });
  assert.equal(seccion.querySelector("#limpiar-busqueda-categorias").hidden, false);
  const lista = seccion.querySelector("#lista-categorias-admin");
  assert.match(lista.textContent, /Limpiar filtros/);

  lista.querySelector("button").click();
  assert.equal(buscar.value, "");
  assert.equal(seccion.querySelector('[data-estado="todas"]').getAttribute("aria-pressed"), "true");
});

test("validación inline en #form-categoria-admin y confirmación antes de desactivar", async () => {
  instalarDomMinimo();
  const seccion = crearSeccionCategorias();
  const llamadas = [];
  const datos = [
    { idCategoria: 1, nombre: "Periféricos", activa: true, categoriaPadreId: null, totalProductos: 2 },
  ];
  let respuestaConfirmacion = false;
  let confirmaciones = 0;

  const modulo = inicializarAdminCategorias({
    seccion,
    apiRequest: async (url, opciones = {}) => {
      llamadas.push({ url, opciones });
      return { json: async () => datos };
    },
    mostrarEstado: (el, txt) => { el.textContent = txt; },
    confirmar: async () => { confirmaciones += 1; return respuestaConfirmacion; },
    notificar: () => {},
  });
  await modulo.cargarCategorias();

  const form = seccion.querySelector("#form-categoria-admin");
  const entrada = seccion.querySelector("#nombre-categoria-admin");
  const errorEl = seccion.querySelector("#error-nombre-categoria-admin");

  entrada.value = "   ";
  form.dispatchEvent({ type: "submit" });
  assert.match(errorEl.textContent, /Ingresa un nombre/);
  assert.equal(entrada.getAttribute("aria-invalid"), "true");
  assert.equal(llamadas.length, 1);

  // Al intentar desactivar con productos, pide confirmación y aborta si es false
  const btnDesactivar = seccion.querySelectorAll("button").find((b) => b.textContent === "Desactivar");
  await btnDesactivar.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(confirmaciones, 1);
  assert.equal(llamadas.length, 1);

  // Si confirma true, envía PATCH de desactivación
  respuestaConfirmacion = true;
  await btnDesactivar.click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(confirmaciones, 2);
  assert.equal(llamadas.some((l) => l.url === "/api/admin/categorias/1/estado"), true);

  // Desactivación en lote también solicita confirmación cuando hay productos
  const seccionLote = crearSeccionCategorias();
  let confLote = 0;
  const llamadasLote = [];
  const moduloLote = inicializarAdminCategorias({
    seccion: seccionLote,
    apiRequest: async (url, opciones = {}) => {
      llamadasLote.push({ url, opciones });
      return { json: async () => datos };
    },
    mostrarEstado: () => {},
    confirmar: async () => { confLote += 1; return false; },
    notificar: () => {},
  });
  await moduloLote.cargarCategorias();
  seccionLote.querySelector("#seleccionar-resultados-categorias").click();
  await seccionLote.querySelector("#desactivar-categorias-seleccionadas").click();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(confLote, 1);
  assert.equal(llamadasLote.some((l) => l.url.includes("/estado")), false);
});

test("botón Crear categoría cambia a Creando... durante la petición", async () => {
  instalarDomMinimo();
  const seccion = crearSeccionCategorias();
  let resolverPost;
  const modulo = inicializarAdminCategorias({
    seccion,
    apiRequest: async (_url, opciones = {}) => {
      if (opciones.method === "POST") {
        await new Promise((r) => { resolverPost = r; });
        return { json: async () => ({}) };
      }
      return { json: async () => [] };
    },
    mostrarEstado: () => {},
    confirmar: async () => true,
    notificar: () => {},
  });
  await modulo.cargarCategorias();

  const form = seccion.querySelector("#form-categoria-admin");
  const entrada = seccion.querySelector("#nombre-categoria-admin");
  const btnEnviar = form.querySelector('button[type="submit"]');
  entrada.value = "Componentes";
  form.dispatchEvent({ type: "submit" });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(btnEnviar.textContent, "Creando...");
  assert.equal(btnEnviar.disabled, true);

  resolverPost();
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(btnEnviar.textContent, "Crear categoría");
  assert.equal(btnEnviar.disabled, false);
});
