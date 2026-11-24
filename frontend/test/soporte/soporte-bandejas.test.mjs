// Panel del personal (spec 19, T05, decisión P1): las tarjetas de reclamos y devoluciones del
// portal de Soporte llevan un gancho estable para que el panel muestre solo la que toca.
import test from "node:test";
import assert from "node:assert/strict";
import { configurarPortalSoporte } from "../../src/soporte/soporte-vista.js";

/** DOM mínimo: lo justo para que configurarPortalSoporte arme sus tarjetas. */
class Nodo {
  constructor(etiqueta) {
    this.tagName = String(etiqueta).toUpperCase();
    this.children = [];
    this.atributos = new Map();
    this.textContent = "";
    this.className = "";
    this.hidden = false;
  }
  append(...hijos) { this.children.push(...hijos); }
  prepend(...hijos) { this.children.unshift(...hijos); }
  replaceChildren(...hijos) { this.children = hijos; }
  setAttribute(nombre, valor) { this.atributos.set(nombre, String(valor)); }
  getAttribute(nombre) { return this.atributos.has(nombre) ? this.atributos.get(nombre) : null; }
  addEventListener() {}
}

function conDomSimulado(fn) {
  const documentoOriginal = globalThis.document;
  const opcionOriginal = globalThis.Option;
  globalThis.document = { createElement: (t) => new Nodo(t) };
  globalThis.Option = class extends Nodo { constructor(texto, valor) { super("option"); this.textContent = texto; this.value = valor; } };
  try {
    return fn();
  } finally {
    globalThis.document = documentoOriginal;
    globalThis.Option = opcionOriginal;
  }
}

test("las tarjetas de Soporte llevan data-bandeja=reclamos y data-bandeja=devoluciones", () => {
  conDomSimulado(() => {
    const contenedor = new Nodo("div");
    configurarPortalSoporte({ apiRequest: async () => ({}), obtenerEstado: () => ({}), contenedor, mostrarToast() {} });
    const [contexto, reclamos, devoluciones] = contenedor.children;
    assert.equal(contenedor.children.length, 3);
    assert.equal(contexto.getAttribute("data-bandeja"), null, "el contexto del pedido no es una bandeja");
    assert.equal(reclamos.getAttribute("data-bandeja"), "reclamos");
    assert.equal(devoluciones.getAttribute("data-bandeja"), "devoluciones");
  });
});
