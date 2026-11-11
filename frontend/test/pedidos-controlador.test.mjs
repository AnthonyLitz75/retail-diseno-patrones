import test from "node:test";
import assert from "node:assert/strict";
import { configurarControladorPedidos } from "../src/pedidos/pedidos-controlador.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this._eventos = {};
    }
    append(...nodes) {
      nodes.forEach((n) => this.children.push(n));
    }
    replaceChildren(...nodes) {
      this.children = [...nodes];
    }
    addEventListener(ev, cb) {
      if (!this._eventos[ev]) this._eventos[ev] = [];
      this._eventos[ev].push(cb);
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    addEventListener() {},
  };
}

test("configurarControladorPedidos oculta la sección si no hay sesión", async () => {
  const seccion = global.document.createElement("section");
  const lista = global.document.createElement("div");

  const ctrl = configurarControladorPedidos({
    apiRequest: async () => ({ json: async () => [] }),
    obtenerEstado: () => ({ usuarioSesion: null }),
    elementos: {
      seccionPedidos: seccion,
      listaPedidos: lista,
    },
  });

  await ctrl.cargarPedidos();
  assert.equal(seccion.hidden, true);
});

test("configurarControladorPedidos consulta endpoint correspondiente según rol CLIENTE vs ALMACEN", async () => {
  const seccion = global.document.createElement("section");
  const titulo = global.document.createElement("h2");
  const estadoPedidos = global.document.createElement("div");
  const lista = global.document.createElement("div");

  let rutaConsultada = null;
  let rutas = [];
  const apiMock = async (ruta) => {
    rutas.push(ruta);
    rutaConsultada = rutas[0];
    return { json: async () => [] };
  };

  let rolActual = "CLIENTE";

  const ctrl = configurarControladorPedidos({
    apiRequest: apiMock,
    obtenerEstado: () => ({ usuarioSesion: { rol: rolActual } }),
    elementos: {
      seccionPedidos: seccion,
      tituloPedidos: titulo,
      estadoPedidos,
      listaPedidos: lista,
    },
  });

  // Rol CLIENTE
  await ctrl.cargarPedidos();
  assert.equal(seccion.hidden, false);
  assert.equal(rutaConsultada, "/api/pedidos/mis-pedidos");
  assert.deepEqual(rutas.slice(1).sort(), ["/api/devoluciones/mis-devoluciones", "/api/reclamos/mis-reclamos"],
    "El cliente también carga sus reclamos y devoluciones");
  assert.equal(titulo.textContent, "Mis pedidos");

  // Rol ALMACEN
  rolActual = "ALMACEN";
  rutas = [];
  await ctrl.cargarPedidos();
  assert.equal(rutaConsultada, "/api/pedidos/operativos");
  assert.equal(rutas.length, 1, "El personal no consulta atenciones de cliente");
  assert.equal(titulo.textContent, "Gestión operativa de pedidos");
});
