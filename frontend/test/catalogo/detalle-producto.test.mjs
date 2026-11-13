import test from "node:test";
import assert from "node:assert/strict";
import {
  calcularAhorroProducto,
  renderizarVistaDetalleProducto,
} from "../../src/catalogo/vistas/detalle-producto.js";

// Mock mínimo de DOM para Node.js si window no está presente
if (typeof document === "undefined") {
  global.document = {
    createElement(tag) {
      const el = {
        tagName: tag.toUpperCase(),
        className: "",
        attributes: {},
        innerHTML: "",
        children: [],
        listeners: {},
        setAttribute(k, v) {
          this.attributes[k] = v;
        },
        getAttribute(k) {
          return this.attributes[k];
        },
        querySelector(_selector) {
          return {
            addEventListener(ev, fn) {
              el.listeners[ev] = fn;
            },
            classList: {
              toggle: () => {},
            },
            textContent: "",
            disabled: false,
          };
        },
        querySelectorAll() {
          return [];
        },
        addEventListener(ev, fn) {
          this.listeners[ev] = fn;
        },
      };
      return el;
    },
  };
}

test("calcularAhorroProducto detecta descuentos y calcula ahorro porcentual y en soles", () => {
  // Sin descuento
  const sinDesc = calcularAhorroProducto(100, null);
  assert.equal(sinDesc.tieneDescuento, false);
  assert.equal(sinDesc.porcentaje, 0);
  assert.equal(sinDesc.montoAhorro, 0);

  // Precio anterior menor o igual
  const menor = calcularAhorroProducto(150, 120);
  assert.equal(menor.tieneDescuento, false);

  // Con descuento: 169 de 199
  const conDesc = calcularAhorroProducto(169, 199);
  assert.equal(conDesc.tieneDescuento, true);
  assert.equal(conDesc.montoAhorro, 30);
  assert.equal(conDesc.porcentaje, 15);
});

test("renderizarVistaDetalleProducto construye la estructura para producto con stock", () => {
  const prod = {
    id: 1,
    sku: "PA-0001",
    nombre: "Teclado mecánico 60% RGB Fizz K617",
    categoria: "Teclados",
    marca: "Redragon",
    precio: 169.0,
    precioAnterior: 199.0,
    stock: 14,
    nuevo: true,
    descripcion: "Teclado compacto para gaming",
  };

  const elemento = renderizarVistaDetalleProducto(prod, {
    imagenUrl: "/img/productos/teclado.png",
    esFavorito: true,
  });

  assert.ok(elemento);
  assert.match(elemento.innerHTML, /Teclado mecánico 60% RGB Fizz K617/);
  assert.match(elemento.innerHTML, /PA-0001/);
  assert.match(elemento.innerHTML, /169\.00/);
  assert.match(elemento.innerHTML, /199\.00/);
  assert.match(elemento.innerHTML, /-15% OFF/);
  assert.match(elemento.innerHTML, /Agregar al carrito/);
});

test("renderizarVistaDetalleProducto gestiona producto agotado", () => {
  const prodAgotado = {
    id: 99,
    sku: "PA-0099",
    nombre: "Mouse inalámbrico agotado",
    categoria: "Mouse",
    precio: 89.0,
    precioAnterior: null,
    stock: 0,
    nuevo: false,
    descripcion: "Sin existencias",
  };

  const elemento = renderizarVistaDetalleProducto(prodAgotado);
  assert.ok(elemento);
  assert.match(elemento.innerHTML, /Producto actualmente agotado/);
});
