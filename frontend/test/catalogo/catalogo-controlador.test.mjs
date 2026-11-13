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
    addEventListener() {}
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
      precioMinimo: minInput,
      precioMaximo: maxInput,
    },
    acciones: {},
  });

  await ctrl.cargarProductos();
  assert.equal(llamadoApi, false); // No debe llamar a la API
  assert.equal(estadoCatalogo.className, "text-danger");
  assert.ok(estadoCatalogo.textContent.includes("no puede superar"));
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
