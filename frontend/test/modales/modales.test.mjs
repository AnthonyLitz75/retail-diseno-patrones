import test from "node:test";
import assert from "node:assert/strict";
import { renderizarPreguntasModal } from "../../src/modales/modal-preguntas.js";
import { configurarModalStock } from "../../src/modales/modal-stock.js";
import { configurarModalPrecio } from "../../src/modales/modal-precio.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.attributes = {};
      this.children = [];
      this.textContent = "";
      this._innerHTML = "";
    }
    get innerHTML() {
      return this._innerHTML;
    }
    set innerHTML(val) {
      this._innerHTML = String(val);
    }
    setAttribute(k, v) {
      this.attributes[k] = String(v);
    }
    getAttribute(k) {
      return this.attributes[k];
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
    querySelector() {
      return null;
    },
    createTextNode(text) {
      return { textContent: text };
    },
  };
}

test("renderizarPreguntasModal muestra mensaje vacío cuando el producto no tiene consultas", () => {
  const contenedor = document.createElement("div");
  const producto = { id: 10, nombre: "Teclado RGB" };
  const preguntas = [{ id: 1, productoId: 99, pregunta: "¿Tiene stock?" }];

  renderizarPreguntasModal(producto, preguntas, contenedor);

  assert.equal(contenedor.children.length, 1);
  assert.match(contenedor.children[0].textContent, /Aún no has consultado/);
});

test("renderizarPreguntasModal muestra preguntas y respuestas cuando coinciden con el producto", () => {
  const contenedor = document.createElement("div");
  const producto = { id: 10, nombre: "Teclado RGB" };
  const preguntas = [
    {
      id: 1,
      productoId: 10,
      pregunta: "¿Es compatible con Mac?",
      respuesta: "Sí, incluye teclas intercambiables para macOS.",
    },
    {
      id: 2,
      productoId: 10,
      pregunta: "¿Qué switches usa?",
      respuesta: null,
    },
  ];

  renderizarPreguntasModal(producto, preguntas, contenedor);

  assert.equal(contenedor.children.length, 2);
  const primerItem = contenedor.children[0];
  assert.equal(primerItem.tagName, "ARTICLE");
  assert.ok(primerItem.className.includes("product-question-item"));
});

test("configurarModalStock y configurarModalPrecio retornan interfaces seguras aún sin DOM", () => {
  const stockCtrl = configurarModalStock({ apiRequest: async () => {} });
  assert.equal(typeof stockCtrl.abrirModalStock, "function");
  // No debe arrojar error al invocarlo
  assert.doesNotThrow(() => stockCtrl.abrirModalStock(null));

  const precioCtrl = configurarModalPrecio({ apiRequest: async () => {} });
  assert.equal(typeof precioCtrl.abrirModalPrecio, "function");
  assert.doesNotThrow(() => precioCtrl.abrirModalPrecio(null));
});
