// Panel del personal (spec 19, T11, bloqueo A): en la tienda, los cuatro roles del personal ven
// las tarjetas de producto como SOPORTE: sin «Gestionar», sin «Agregar al carrito» y sin
// «Consultar dudas». CLIENTE y el invitado ven exactamente lo mismo que antes (línea base).
// La misma tarjeta se usa en el catálogo, las vitrinas (carrusel) y los relacionados del detalle.
import test from "node:test";
import assert from "node:assert/strict";
import { crearElementoTarjetaProducto } from "../../src/catalogo/componentes/tarjeta-producto.js";

class Nodo {
  constructor(etiqueta) {
    this.tagName = String(etiqueta).toUpperCase();
    this.children = [];
    this.atributos = {};
    this.dataset = {};
    this.style = {};
    this.className = "";
    this.textContent = "";
    this.innerHTML = "";
    this.hidden = false;
    const clases = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => clases.add(x)),
      remove: (...c) => c.forEach((x) => clases.delete(x)),
      toggle: (c, f) => ((f ?? !clases.has(c)) ? clases.add(c) : clases.delete(c)),
      contains: (c) => clases.has(c) || this.className.split(" ").includes(c),
    };
  }
  setAttribute(k, v) { this.atributos[k] = String(v); }
  getAttribute(k) { return this.atributos[k] ?? null; }
  append(...n) { this.children.push(...n); }
  addEventListener() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  *todos() { for (const h of this.children) { yield h; yield* h.todos(); } }
}

function conDocumento(fn) {
  const original = globalThis.document;
  globalThis.document = { createElement: (t) => new Nodo(t), addEventListener() {}, removeEventListener() {} };
  try { return fn(); } finally { globalThis.document = original; }
}

const producto = { id: 7, sku: "PA-0007", nombre: "Mouse M170", categoria: "Mouse", precio: 39.9, stock: 12 };

/** Qué acciones ofrece una tarjeta: textos de sus botones y si hay menú «Gestionar». */
function accionesDe(tarjeta) {
  const nodos = [tarjeta, ...tarjeta.todos()];
  return {
    botones: nodos.filter((n) => n.tagName === "BUTTON" && n.textContent).map((n) => n.textContent),
    gestionar: nodos.some((n) => String(n.className).includes("menu-acciones")
      || String(n.getAttribute?.("aria-label") ?? "").startsWith("Gestionar")),
  };
}

const PERSONAL = ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];

for (const esCarousel of [false, true]) {
  const donde = esCarousel ? "vitrina (carrusel)" : "catálogo y relacionados";

  test(`personal en la tienda (${donde}): sin «Gestionar», sin carrito y sin consultas`, () => conDocumento(() => {
    for (const rol of PERSONAL) {
      const tarjeta = crearElementoTarjetaProducto(producto, { esCarousel, usuarioSesion: { rol } });
      const { botones, gestionar } = accionesDe(tarjeta);
      assert.equal(gestionar, false, `${rol}: sin «Gestionar»`);
      assert.ok(!botones.includes("Agregar al carrito"), `${rol}: sin «Agregar al carrito»`);
      assert.ok(!botones.includes("Consultar dudas"), `${rol}: sin «Consultar dudas»`);
    }
  }));

  test(`CLIENTE e invitado (${donde}): las mismas acciones que antes`, () => conDocumento(() => {
    const esperado = esCarousel ? ["Agregar al carrito"] : ["Agregar al carrito", "Consultar dudas"];
    for (const usuarioSesion of [{ rol: "CLIENTE" }, null]) {
      const { botones, gestionar } = accionesDe(crearElementoTarjetaProducto(producto, { esCarousel, usuarioSesion }));
      assert.equal(gestionar, false);
      assert.deepEqual(botones.filter((b) => esperado.includes(b) || b === "Agotado"), esperado, JSON.stringify(usuarioSesion));
    }
  }));
}

test("CLIENTE e invitado con producto agotado: «Agotado» deshabilitado, como antes", () => conDocumento(() => {
  for (const usuarioSesion of [{ rol: "CLIENTE" }, null]) {
    const nodos = [...crearElementoTarjetaProducto({ ...producto, stock: 0 }, { usuarioSesion }).todos()];
    const agotado = nodos.find((n) => n.tagName === "BUTTON" && n.textContent === "Agotado");
    assert.ok(agotado && agotado.disabled === true, JSON.stringify(usuarioSesion));
  }
}));
