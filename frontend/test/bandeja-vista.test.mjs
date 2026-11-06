import test from "node:test";
import assert from "node:assert/strict";
import {
  crearElementoNotificacion,
  renderizarBandejaNotificaciones,
  configurarBandejaNotificaciones,
} from "../src/notificaciones/bandeja-vista.js";

// Mock mínimo de DOM si estamos en entorno Node.js
if (typeof document === "undefined") {
  class MockElement {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.className = "";
      this.style = {};
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
    appendChild(n) {
      this.children.push(n);
    }
    replaceChildren(...nodes) {
      this.children = [...nodes];
    }
    addEventListener(evento, cb) {
      if (!this._eventos[evento]) this._eventos[evento] = [];
      this._eventos[evento].push(cb);
    }
    dispatch(evento, datos) {
      if (this._eventos[evento]) {
        this._eventos[evento].forEach((cb) => cb(datos || { stopPropagation: () => {} }));
      }
    }
  }

  global.document = {
    createElement(tag) {
      return new MockElement(tag);
    },
    addEventListener() {},
    hidden: false,
  };
}

test("crearElementoNotificacion genera elemento con clases semánticas y maneja clics", () => {
  const notificacion = {
    id: 1,
    pedidoId: 104,
    estado: "DESPACHADO",
    mensaje: "Tu pedido #104 va en camino",
    leida: false,
    creadaEn: "2026-11-06T12:00:00Z",
  };

  let seleccionada = null;
  const elemento = crearElementoNotificacion(notificacion, (n) => {
    seleccionada = n;
  });

  assert.equal(elemento.tagName, "DIV");
  assert.ok(elemento.classList.contains("is-unread"));
  const cabecera = elemento.children[0];
  assert.ok(cabecera.children.some((c) => c.textContent.includes("Despachado")));
  assert.ok(elemento.children.some((c) => c.textContent.includes("Tu pedido #104 va en camino")));

  // Simular click
  elemento.dispatch("click");
  assert.deepEqual(seleccionada, notificacion);
});

test("renderizarBandejaNotificaciones muestra estado vacío y maneja badge", () => {
  const badgeContador = global.document.createElement("span");
  const listaContenedor = global.document.createElement("div");

  // Caso 1: Sin notificaciones
  renderizarBandejaNotificaciones([], { badgeContador, listaContenedor });
  assert.equal(badgeContador.hidden, true);
  assert.equal(listaContenedor.children.length, 1);
  assert.ok(
    listaContenedor.children[0].children.some((c) =>
      c.textContent.includes("No tienes notificaciones pendientes"),
    ),
  );

  // Caso 2: Con notificaciones pendientes
  const notificaciones = [
    { id: 1, pedidoId: 10, estado: "ENTREGADO", leida: false },
    { id: 2, pedidoId: 11, estado: "CANCELADO", leida: true },
  ];
  renderizarBandejaNotificaciones(notificaciones, { badgeContador, listaContenedor });
  assert.equal(badgeContador.hidden, false);
  assert.equal(badgeContador.textContent, "1"); // Solo 1 no leída
  assert.equal(listaContenedor.children.length, 2);
});

test("configurarBandejaNotificaciones controla ciclo de vida y visibilidad según rol", async () => {
  const contenedor = global.document.createElement("div");
  const badge = global.document.createElement("span");
  const lista = global.document.createElement("div");

  let rolUsuario = "VENDEDOR";

  const bandeja = configurarBandejaNotificaciones({
    apiRequest: async () => [
      { id: 1, pedidoId: 1, estado: "EN_PREPARACION", leida: false },
    ],
    obtenerUsuarioSesion: () => ({ rol: rolUsuario }),
    cambiarVista: () => {},
    elementos: {
      contenedorNotificaciones: contenedor,
      badgeContadorNotificaciones: badge,
      listaNotificaciones: lista,
    },
    intervaloMs: 100,
  });

  // Rol VENDEDOR no muestra la bandeja de notificaciones de cliente
  const resVendedor = await bandeja.cargarNotificacionesCliente();
  assert.deepEqual(resVendedor, []);
  assert.equal(contenedor.hidden, true);

  // Rol CLIENTE activa la bandeja
  rolUsuario = "CLIENTE";
  const resCliente = await bandeja.cargarNotificacionesCliente();
  assert.equal(resCliente.length, 1);
  assert.equal(contenedor.hidden, false);
  assert.equal(badge.hidden, false);
  assert.equal(badge.textContent, "1");

  // Iniciar y detener polling
  bandeja.iniciarPollingNotificaciones();
  bandeja.detenerPollingNotificaciones();
});
