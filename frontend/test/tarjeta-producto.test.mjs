import test from "node:test";
import assert from "node:assert/strict";
import { crearElementoTarjetaProducto } from "../src/catalogo/tarjeta-producto.js";

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
    addEventListener() {}
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
