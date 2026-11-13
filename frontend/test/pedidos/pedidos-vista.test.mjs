import test from "node:test";
import assert from "node:assert/strict";
import {
  claseEstadoPedido,
  crearTarjetaPedido,
  crearFormularioDespacho,
} from "../../src/pedidos/pedidos-vista.js";

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
      this.id = "";
      this.type = "";
      this.required = false;
      this.placeholder = "";
      this.maxLength = 0;
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

test("claseEstadoPedido mapea estados de negocio a clases semánticas de Bootstrap", () => {
  assert.equal(claseEstadoPedido("PENDIENTE"), "text-bg-warning");
  assert.equal(claseEstadoPedido("EN_PREPARACION"), "text-bg-primary");
  assert.equal(claseEstadoPedido("DESPACHADO"), "text-bg-info");
  assert.equal(claseEstadoPedido("ENTREGADO"), "text-bg-success");
  assert.equal(claseEstadoPedido("CANCELADO"), "text-bg-secondary");
  assert.equal(claseEstadoPedido("DESCONOCIDO"), "text-bg-secondary");
});

test("crearTarjetaPedido genera la estructura con stepper, productos y total", () => {
  const pedido = {
    idPedido: 101,
    estado: "PENDIENTE",
    creadoEn: "2026-11-06T10:00:00.000Z",
    total: 350.0,
    productos: [
      {
        nombreProducto: "Teclado mecánico 60% RGB",
        cantidad: 1,
        precioUnitario: 169.0,
        subtotal: 169.0,
      },
    ],
  };

  const tarjeta = crearTarjetaPedido(pedido, {
    esCliente: true,
    usuarioSesion: { rol: "CLIENTE" },
  });

  assert.ok(tarjeta);
  assert.equal(tarjeta.id, "pedido-101");
  assert.ok(tarjeta.children.length >= 2); // header y body
});

test("crearTarjetaPedido neutraliza vectores XSS en cliente, transportista, productos y comentarios", () => {
  const pedidoInfectado = {
    idPedido: 202,
    estado: "DESPACHADO",
    creadoEn: "2026-11-06T12:00:00.000Z",
    total: 99.0,
    clienteNombre: "<script>alert('xss-cliente')</script>",
    clienteCorreo: "hacker@test.com\" onfocus=\"alert(1)",
    envio: {
      transportista: "<img src=x onerror=alert('xss-envio')>",
      codigoSeguimiento: "\"><script>alert('xss-tracking')</script>",
    },
    productos: [
      {
        nombreProducto: "<b onmouseover=alert('xss-prod')>Producto Malicioso</b>",
        cantidad: 2,
        precioUnitario: 49.5,
        subtotal: 99.0,
      },
    ],
    historial: [
      {
        estado: "DESPACHADO",
        comentario: "<svg/onload=alert('xss-comentario')>",
        responsable: "<iframe src=javascript:alert(1)>",
        fecha: "2026-11-06T13:00:00.000Z",
      },
    ],
  };

  const tarjeta = crearTarjetaPedido(pedidoInfectado, {
    esCliente: false,
    usuarioSesion: { rol: "ALMACEN" },
  });

  function obtenerHtmlRecursivo(el) {
    let html = el.innerHTML || "";
    if (Array.isArray(el.children)) {
      for (const child of el.children) {
        html += " " + obtenerHtmlRecursivo(child);
      }
    }
    return html;
  }

  const htmlCompleto = obtenerHtmlRecursivo(tarjeta);

  // Verificar que NO existan tags ejecutables sin escapar
  assert.equal(htmlCompleto.includes("<script>"), false);
  assert.equal(htmlCompleto.includes("<img src=x onerror="), false);
  assert.equal(htmlCompleto.includes("<b onmouseover="), false);
  assert.equal(htmlCompleto.includes("<svg/onload="), false);
  assert.equal(htmlCompleto.includes("<iframe"), false);

  // Verificar que estén presentes las entidades HTML seguras
  assert.ok(htmlCompleto.includes("&lt;script&gt;"));
  assert.ok(htmlCompleto.includes("&lt;img"));
  assert.ok(htmlCompleto.includes("&lt;b"));
  assert.ok(htmlCompleto.includes("&lt;svg&#x2F;onload="));
  assert.ok(htmlCompleto.includes("&lt;iframe"));
});

test("crearFormularioDespacho construye campos de transportista y seguimiento", () => {
  const pedido = { idPedido: 303 };
  const form = crearFormularioDespacho(pedido, () => {});
  assert.ok(form);
  assert.equal(form.tagName, "FORM");
  assert.ok(form.className.includes("row"));
});
