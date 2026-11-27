import test from "node:test";
import assert from "node:assert/strict";
import { configurarControladorCatalogo } from "../../src/catalogo/catalogo-controlador.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.children = [];
      this.textContent = "";
      this.value = "";
      this.hidden = false;
      this.checked = false;
      this.attributes = {};
      this.classList = {
        _set: new Set(),
        toggle: (cls, force) => (force ? this.classList._set.add(cls) : this.classList._set.delete(cls)),
        add: (...cls) => cls.forEach((c) => this.classList._set.add(c)),
        remove: (...cls) => cls.forEach((c) => this.classList._set.delete(c)),
        contains: (cls) => this.classList._set.has(cls),
      };
      this._listeners = {};
    }
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    }
    removeAttribute(k) {
      delete this.attributes[k];
    }
    append(...nodes) {
      nodes.forEach((n) => this.children.push(n));
    }
    replaceChildren(...nodes) {
      this.children = [...nodes];
    }
    addEventListener(ev, fn) {
      if (!this._listeners[ev]) this._listeners[ev] = [];
      this._listeners[ev].push(fn);
    }
    dispatchEvent(ev) {
      (this._listeners[ev.type] || []).forEach((fn) => fn(ev));
    }
    querySelector() {
      return null;
    }
    querySelectorAll() {
      return [];
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    },
    addEventListener() {},
  };

  global.Option = function (text, val) {
    const el = new MockElement("option");
    el.textContent = text;
    el.value = val;
    return el;
  };
}

test("configurarControladorCatalogo valida rango de precios minimo y maximo", async () => {
  const contenedor = global.document.createElement("div");
  const estadoCatalogo = global.document.createElement("div");
  const minInput = global.document.createElement("input");
  const maxInput = global.document.createElement("input");
  const contenedorPaginacion = global.document.createElement("nav");
  minInput.value = "500";
  maxInput.value = "100"; // min > max inválido

  let llamadoApi = false;
  const ctrl = configurarControladorCatalogo({
    apiRequest: async () => {
      llamadoApi = true;
      return { json: async () => [] };
    },
    estado: { productosDisponibles: [] },
    elementos: {
      contenedor,
      estadoCatalogo,
      contenedorPaginacion,
      precioMinimo: minInput,
      precioMaximo: maxInput,
    },
    acciones: {},
  });

  await ctrl.cargarProductos();
  assert.equal(llamadoApi, false); // No debe llamar a la API
  assert.equal(estadoCatalogo.className, "text-danger");
  assert.equal(estadoCatalogo.attributes.role, "alert");
  assert.equal(minInput.attributes["aria-invalid"], "true");
  assert.equal(maxInput.attributes["aria-invalid"], "true");
  assert.equal(contenedorPaginacion.hidden, true);
  assert.ok(estadoCatalogo.textContent.includes("no puede superar"));

  maxInput.value = "800";
  await ctrl.cargarProductos();
  assert.equal(llamadoApi, true);
  assert.equal(minInput.attributes["aria-invalid"], undefined);
  assert.equal(maxInput.attributes["aria-invalid"], undefined);
});

test("configurarControladorCatalogo - cargarCategorias llena los selectores", async () => {
  const filtroCat = global.document.createElement("select");
  const formCat = global.document.createElement("select");

  const ctrl = configurarControladorCatalogo({
    apiRequest: async () => ({
      json: async () => [
        { id: 1, nombre: "Periféricos" },
        { id: 2, nombre: "Componentes" },
      ],
    }),
    estado: {},
    elementos: {
      filtroCategoria: filtroCat,
      categoriaProducto: formCat,
    },
    acciones: {},
  });

  await ctrl.cargarCategorias();
  // 1 opción por defecto + 2 categorías = 3 opciones
  assert.equal(filtroCat.children.length, 3);
  assert.equal(formCat.children.length, 3);
  assert.equal(filtroCat.children[1].value, "Periféricos");
});

test("configurarControladorCatalogo filtra por Solo favoritos y reinicia con Limpiar", async () => {
  const contenedor = global.document.createElement("div");
  const estadoCatalogo = global.document.createElement("div");
  const switchFavoritos = global.document.createElement("input");

  const productos = [
    { id: 1, nombre: "Teclado A", sku: "PA-1", precio: 100, stock: 5 },
    { id: 2, nombre: "Mouse B", sku: "PA-2", precio: 50, stock: 4 },
  ];

  const ctrl = configurarControladorCatalogo({
    apiRequest: async () => ({ json: async () => productos }),
    estado: { productosDisponibles: productos, paginaActualCatalogo: 1 },
    elementos: {
      contenedor,
      estadoCatalogo,
      switchSoloFavoritos: switchFavoritos,
    },
    acciones: {
      obtenerIdsFavoritos: () => [2],
    },
  });

  switchFavoritos.checked = true;
  switchFavoritos.dispatchEvent({ type: "change" });
  assert.equal(contenedor.children.length, 1);
  assert.equal(estadoCatalogo.textContent, "1 producto encontrado");

  ctrl.reiniciarFiltrosCatalogo();
  assert.equal(switchFavoritos.checked, false);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(contenedor.children.length, 2);
});

test("establecerSoloFavoritos filtra solo productos marcados como favoritos incluso sin switch DOM", () => {
  const contenedor = global.document.createElement("div");
  const estadoCatalogo = global.document.createElement("div");
  const productos = [
    { id: 1, nombre: "Teclado A", sku: "PA-1", precio: 100, stock: 5 },
    { id: 2, nombre: "Mouse B", sku: "PA-2", precio: 50, stock: 4 },
    { id: 3, nombre: "Webcam C", sku: "PA-3", precio: 120, stock: 3 },
  ];

  const ctrl = configurarControladorCatalogo({
    apiRequest: async () => ({ json: async () => productos }),
    estado: { productosDisponibles: productos, paginaActualCatalogo: 1 },
    elementos: { contenedor, estadoCatalogo },
    acciones: { obtenerIdsFavoritos: () => [2, 3] },
  });

  ctrl.establecerSoloFavoritos(true);
  assert.equal(contenedor.children.length, 2);
  assert.equal(estadoCatalogo.textContent, "2 productos encontrados");

  ctrl.establecerSoloFavoritos(false);
  assert.equal(contenedor.children.length, 3);
  assert.equal(estadoCatalogo.textContent, "3 productos encontrados");
});
