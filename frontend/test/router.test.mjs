import test from "node:test";
import assert from "node:assert/strict";
import {
  renderizarBreadcrumbsEnDOM,
  configurarEnrutadorSPA,
} from "../src/router/router.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.attributes = {};
      this.classList = {
        _classes: new Set(),
        add(...cls) {
          cls.forEach((c) => this._classes.add(c));
        },
        remove(...cls) {
          cls.forEach((c) => this._classes.delete(c));
        },
      };
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this.value = "";
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
}

test("renderizarBreadcrumbsEnDOM gestiona visibilidad y renderizado accesible de migas de pan", () => {
  const contenedor = global.document.createElement("nav");
  const lista = global.document.createElement("ol");

  // Caso 1: 0 o 1 miga -> se oculta
  renderizarBreadcrumbsEnDOM([{ etiqueta: "Inicio", url: "#/" }], {
    contenedorBreadcrumbs: contenedor,
    listaBreadcrumbs: lista,
  });
  assert.equal(contenedor.hidden, true);
  assert.equal(lista.children.length, 0);

  // Caso 2: 3 migas -> se muestra con enlaces y página activa
  const crumbs = [
    { etiqueta: "Inicio", url: "#/", esActivo: false },
    { etiqueta: "Periféricos", url: "#/categoria/perifericos", esActivo: false },
    { etiqueta: "Teclados", url: "#/subcategoria/teclados", esActivo: true },
  ];
  renderizarBreadcrumbsEnDOM(crumbs, {
    contenedorBreadcrumbs: contenedor,
    listaBreadcrumbs: lista,
  });

  assert.equal(contenedor.hidden, false);
  assert.equal(lista.children.length, 3);

  // El primero tiene enlace
  assert.equal(lista.children[0].children.length, 1);
  assert.equal(lista.children[0].children[0].tagName, "A");
  assert.equal(lista.children[0].children[0].textContent, "Inicio");

  // El último es activo con aria-current
  assert.equal(lista.children[2].textContent, "Teclados");
  assert.equal(lista.children[2].getAttribute("aria-current"), "page");
  assert.ok(lista.children[2].className.includes("active"));
});

test("configurarEnrutadorSPA - manejarRutaHash activa vistas según el hash", async () => {
  const vistaTienda = global.document.createElement("div");
  const bloqueVitrina = global.document.createElement("div");
  const bloqueCatalogo = global.document.createElement("div");
  const vista404 = global.document.createElement("div");

  const estado = {
    categoriasArbol: [],
    productosDisponibles: [],
  };

  global.window = {
    location: { hash: "#/" },
    addEventListener() {},
  };

  const router = configurarEnrutadorSPA({
    estado,
    elementos: {
      vistaTienda,
      bloqueVitrinaInicio: bloqueVitrina,
      bloqueCatalogoCompleto: bloqueCatalogo,
      vista404,
    },
    acciones: {
      cargarProductos: async () => {},
    },
  });

  // Ruta Inicio (#/)
  await router.manejarRutaHash();
  assert.equal(vistaTienda.hidden, false);
  assert.equal(bloqueVitrina.hidden, false);
  assert.equal(bloqueCatalogo.hidden, true);
  assert.equal(vista404.hidden, true);

  // Ruta Catálogo (#/catalogo)
  global.window.location.hash = "#/catalogo";
  await router.manejarRutaHash();
  assert.equal(vistaTienda.hidden, false);
  assert.equal(bloqueVitrina.hidden, true);
  assert.equal(bloqueCatalogo.hidden, false);
  assert.equal(vista404.hidden, true);

  // Ruta inexistente (#/ruta-no-existe) -> 404
  global.window.location.hash = "#/ruta-no-existe";
  await router.manejarRutaHash();
  assert.equal(vistaTienda.hidden, true);
  assert.equal(vista404.hidden, false);
});
