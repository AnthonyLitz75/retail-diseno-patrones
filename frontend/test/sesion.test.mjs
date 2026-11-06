import test from "node:test";
import assert from "node:assert/strict";
import { configurarSesionYVistas } from "../src/estado/sesion.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.dataset = {};
      this.attributes = {};
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
      this.children = [];
      this.textContent = "";
      this.hidden = false;
      this.disabled = false;
      this._eventos = {};
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
    addEventListener(ev, cb) {
      if (!this._eventos[ev]) this._eventos[ev] = [];
      this._eventos[ev].push(cb);
    }
    closest() {
      return null;
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
  };
}

test("configurarSesionYVistas - cambiarVista valida permisos por rol y alterna vistas", () => {
  const estado = { usuarioSesion: { rol: "CLIENTE" } };
  const vistaTienda = global.document.createElement("div");
  const vistaPedidos = global.document.createElement("div");
  const vistaAdmin = global.document.createElement("div");

  let vistaReportada = null;

  const sesion = configurarSesionYVistas({
    apiRequest: async () => {},
    estado,
    elementos: {
      mapaVistas: {
        tienda: vistaTienda,
        pedidos: vistaPedidos,
        administracion: vistaAdmin,
      },
    },
    acciones: {
      onCambioVista: (v) => {
        vistaReportada = v;
      },
    },
  });

  // CLIENTE puede ir a pedidos
  sesion.cambiarVista("pedidos");
  assert.equal(sesion.obtenerVistaActiva(), "pedidos");
  assert.equal(vistaPedidos.hidden, false);
  assert.equal(vistaTienda.hidden, true);
  assert.equal(vistaReportada, "pedidos");

  // CLIENTE NO puede ir a administracion -> cae a tienda
  sesion.cambiarVista("administracion");
  assert.equal(sesion.obtenerVistaActiva(), "tienda");
  assert.equal(vistaTienda.hidden, false);
  assert.equal(vistaAdmin.hidden, true);
  assert.equal(vistaReportada, "tienda");
});

test("configurarSesionYVistas - mostrarSesionActiva y mostrarSesionCerrada gestionan ciclo de vida", async () => {
  const estado = { usuarioSesion: null };
  const enlaceLogin = global.document.createElement("a");
  const enlaceRegistro = global.document.createElement("a");
  const usuarioActivo = global.document.createElement("div");
  const botonCerrar = global.document.createElement("button");

  let carritoCargado = false;
  let carritoOculto = false;
  let carritoSincronizado = false;

  const sesion = configurarSesionYVistas({
    apiRequest: async () => ({ json: async () => ({}) }),
    estado,
    elementos: {
      enlaceLogin,
      enlaceRegistro,
      usuarioActivo,
      botonCerrarSesion: botonCerrar,
    },
    acciones: {
      hayCarritoInvitado: () => true,
      sincronizarCarritoInvitadoConBackend: async () => {
        carritoSincronizado = true;
      },
      cargarCarrito: () => {
        carritoCargado = true;
      },
      ocultarCarrito: () => {
        carritoOculto = true;
      },
      mostrarToast: () => {},
    },
  });

  // 1. Iniciar sesión como CLIENTE con carrito de invitado
  await sesion.mostrarSesionActiva({ id: 1, nombre: "Juan Pérez", rol: "CLIENTE" });
  assert.equal(estado.usuarioSesion?.nombre, "Juan Pérez");
  assert.equal(enlaceLogin.hidden, true);
  assert.equal(enlaceRegistro.hidden, true);
  assert.equal(usuarioActivo.hidden, false);
  assert.ok(usuarioActivo.textContent.includes("Juan Pérez (CLIENTE)"));
  assert.equal(carritoSincronizado, true);
  assert.equal(carritoCargado, true);

  // 2. Cerrar sesión
  sesion.mostrarSesionCerrada();
  assert.equal(estado.usuarioSesion, null);
  assert.equal(enlaceLogin.hidden, false);
  assert.equal(enlaceRegistro.hidden, false);
  assert.equal(usuarioActivo.hidden, true);
  assert.equal(botonCerrar.hidden, true);
});
