import test from "node:test";
import assert from "node:assert/strict";

// Mock mínimo de DOM: suficiente para verificar qué se asigna como HTML y qué como texto.
function crearElemento(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    className: "",
    attributes: {},
    innerHTML: "",
    textContent: "",
    children: [],
    listeners: {},
    setAttribute(k, v) {
      this.attributes[k] = v;
    },
    getAttribute(k) {
      return this.attributes[k];
    },
    append(...nodos) {
      this.children.push(...nodos);
    },
    replaceChildren(...nodos) {
      this.children = [...nodos];
    },
    addEventListener(ev, fn) {
      this.listeners[ev] = fn;
    },
    querySelector() {
      return {
        addEventListener() {},
        classList: { toggle() {} },
        textContent: "",
        disabled: false,
      };
    },
    querySelectorAll() {
      return [];
    },
  };
  return el;
}

// Los módulos se importan antes de definir document: Bootstrap se autoinicializa si encuentra un DOM.
const { renderizarVistaDetalleProducto } = await import("../../src/catalogo/vistas/detalle-producto.js");
const { renderizarChipsFiltrosActivos } = await import("../../src/catalogo/vistas/catalogo-vista.js");

globalThis.document = { createElement: crearElemento };

const PAYLOAD = '<img src=x onerror=alert(1)>';

test("detalle de producto escapa nombre, categoría, marca, sku y descripción", () => {
  const elemento = renderizarVistaDetalleProducto(
    {
      id: 7,
      sku: PAYLOAD,
      nombre: `"><script>alert(1)</script>`,
      categoria: PAYLOAD,
      marca: PAYLOAD,
      descripcion: PAYLOAD,
      precio: 10,
      precioAnterior: null,
      stock: 3,
      nuevo: false,
    },
    { imagenUrl: `x" onerror="alert(1)` },
  );

  assert.doesNotMatch(elemento.innerHTML, /<img src=x/);
  assert.doesNotMatch(elemento.innerHTML, /<script>/);
  assert.doesNotMatch(elemento.innerHTML, /alt=""><script/);
  assert.doesNotMatch(elemento.innerHTML, /src="x" onerror=/);
  assert.match(elemento.innerHTML, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test("los chips de filtros muestran la búsqueda como texto y nunca como HTML", () => {
  const contenedor = crearElemento("div");

  renderizarChipsFiltrosActivos({
    filtros: { busqueda: PAYLOAD },
    contenedorChips: contenedor,
    onQuitarFiltro: () => {},
  });

  assert.equal(contenedor.children.length, 1);
  const chip = contenedor.children[0];
  assert.equal(chip.innerHTML, "", "el chip no debe asignarse con innerHTML");

  const etiqueta = chip.children[0];
  assert.match(etiqueta.textContent, /<img src=x onerror=alert\(1\)>/);

  const boton = chip.children.find((nodo) => typeof nodo === "object" && nodo.tagName === "BUTTON");
  assert.ok(boton, "debe existir el botón para quitar el filtro");
  assert.match(boton.getAttribute("aria-label"), /^Quitar filtro /);
});

test("el botón del chip invoca onQuitarFiltro con el tipo de filtro", () => {
  const contenedor = crearElemento("div");
  const quitados = [];

  renderizarChipsFiltrosActivos({
    filtros: { busqueda: "mouse" },
    contenedorChips: contenedor,
    onQuitarFiltro: (tipo) => quitados.push(tipo),
  });

  const chip = contenedor.children[0];
  const boton = chip.children.find((nodo) => typeof nodo === "object" && nodo.tagName === "BUTTON");
  boton.listeners.click();
  assert.deepEqual(quitados, ["busqueda"]);
});
