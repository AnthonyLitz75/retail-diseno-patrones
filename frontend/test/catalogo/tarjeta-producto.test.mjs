import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { crearElementoTarjetaProducto } from "../../src/catalogo/componentes/tarjeta-producto.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.classList = {
        _classes: new Set(),
        add(...cls) {
          cls.forEach((c) => this._classes.add(c));
        },
        remove(...cls) {
          cls.forEach((c) => this._classes.delete(c));
        },
        toggle(cls, force) {
          if (force === undefined) {
            if (this._classes.has(cls)) this._classes.delete(cls);
            else this._classes.add(cls);
          } else if (force) {
            this._classes.add(cls);
          } else {
            this._classes.delete(cls);
          }
        },
        contains(cls) {
          return this._classes.has(cls);
        },
      };
      this.attributes = {};
      this.children = [];
      this.textContent = "";
      this.title = "";
      this.innerHTML = "";
      this._listeners = {};
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
    addEventListener(ev, fn) {
      if (!this._listeners[ev]) this._listeners[ev] = [];
      this._listeners[ev].push(fn);
    }
    dispatchEvent(ev) {
      (this._listeners[ev.type] || []).forEach((fn) => fn(ev));
    }
    querySelector() {
      return new MockElement("div");
    }
    querySelectorAll() {
      return [];
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
  };
}

test("crearElementoTarjetaProducto construye tarjeta con producto en stock y descuento", () => {
  const producto = {
    id: 1,
    sku: "PA-0001",
    nombre: "Teclado mecánico 60% RGB Fizz K617",
    categoria: "Teclados",
    precio: 169.0,
    precioAnterior: 199.0,
    stock: 14,
    nuevo: true,
  };

  const tarjeta = crearElementoTarjetaProducto(producto, {
    esCarousel: false,
    usuarioSesion: { rol: "CLIENTE" },
  });

  assert.ok(tarjeta);
  assert.equal(tarjeta.tagName, "ARTICLE");
  assert.ok(tarjeta.className.includes("product-card"));
  assert.equal(tarjeta.classList.contains("is-out-of-stock"), false);
});

test("crearElementoTarjetaProducto envuelve en product-card-wrap si esCarousel es true", () => {
  const producto = {
    id: 2,
    sku: "PA-0002",
    nombre: "Mouse gamer G203",
    stock: 5,
    precio: 79.0,
  };

  const wrapper = crearElementoTarjetaProducto(producto, {
    esCarousel: true,
  });

  assert.ok(wrapper);
  assert.equal(wrapper.tagName, "DIV");
  assert.equal(wrapper.className, "product-card-wrap");
  assert.equal(wrapper.children.length, 1);
  assert.equal(wrapper.children[0].tagName, "ARTICLE");
});

test("crearElementoTarjetaProducto marca tarjeta como agotada si stock es 0", () => {
  const producto = {
    id: 3,
    sku: "PA-0003",
    nombre: "Teclado agotado",
    stock: 0,
    precio: 120.0,
  };

  const tarjeta = crearElementoTarjetaProducto(producto, {
    esCarousel: false,
  });

  assert.ok(tarjeta.classList.contains("is-out-of-stock"));
  assert.ok(tarjeta.classList.contains("product-card-agotado"));
});

test("botón favorito expone aria-pressed dinámico y pregunta no recorta altura con py-0", () => {
  const producto = { id: 10, sku: "PA-0010", nombre: "Mouse Pro", stock: 5, precio: 99 };
  const tarjeta = crearElementoTarjetaProducto(producto, {
    esCarousel: false,
    callbacks: {
      onAlternarFavorito: (_p, btn) => btn.classList.toggle("is-favorite"),
    },
  });
  const btnFav = tarjeta.children[0].children.find((n) => n.className === "product-fav-btn");
  assert.equal(btnFav.getAttribute("aria-pressed"), "false");
  assert.equal(btnFav.getAttribute("aria-label"), "Guardar Mouse Pro en favoritos");

  btnFav.dispatchEvent({ type: "click", stopPropagation() {} });
  assert.equal(btnFav.getAttribute("aria-pressed"), "true");
  assert.equal(btnFav.getAttribute("aria-label"), "Quitar Mouse Pro de favoritos");

  const actionsBox = tarjeta.children.at(-1);
  const btnPreguntas = actionsBox.children.find((n) => n.className.includes("product-card-question-btn"));
  assert.ok(btnPreguntas);
  assert.doesNotMatch(btnPreguntas.className, /\bpy-0\b/);
});

test("tienda y carrito cumplen objetivos táctiles >= 44 px y contraste --retail-blue-dark", () => {
  const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
  const headerCss = leer("../../src/css/header.css");
  const tarjetasCss = leer("../../src/css/catalogo/tarjetas-producto.css");
  const filtrosCss = leer("../../src/css/catalogo/filtros-y-acciones.css");
  const pildorasCss = leer("../../src/css/catalogo/pildoras-y-detalle.css");
  const carritoCss = leer("../../src/css/carrito.css");

  assert.match(headerCss, /\.header-search-btn\s*\{[^}]*background:\s*var\(--retail-blue-dark\)[^}]*min-height:\s*44px/);
  assert.match(tarjetasCss, /\.section-carousel-btn\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/);
  assert.match(tarjetasCss, /\.product-fav-btn\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px/);
  assert.match(tarjetasCss, /\.product-badge-new\s*\{[^}]*background:\s*var\(--retail-blue-dark\)/);
  assert.match(tarjetasCss, /\.product-btn-add\s*\{[^}]*min-height:\s*44px/);
  assert.match(tarjetasCss, /\.product-card\.is-out-of-stock \.product-image-box\s*\{/);
  assert.doesNotMatch(tarjetasCss, /\.product-card\.is-out-of-stock\s*\{/);
  assert.match(filtrosCss, /\.filter-chip\s*\{[^}]*min-height:\s*44px/);
  assert.match(filtrosCss, /\.filter-chip\.is-active\s*\{[^}]*background:\s*var\(--retail-blue-dark\)/);
  assert.match(pildorasCss, /\.quantity-selector-group button\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/);
  assert.match(carritoCss, /\.cart-btn-remove,\s*\.cart-item-remove\s*\{[^}]*min-width:\s*44px;\s*min-height:\s*44px/);
  assert.match(carritoCss, /@media \(max-width: 575\.98px\)[\s\S]*\.cart-stepper-btn\s*\{[^}]*width:\s*44px;\s*height:\s*44px/);
});
