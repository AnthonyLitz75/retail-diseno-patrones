import test from "node:test";
import assert from "node:assert/strict";
import { configurarDockCuenta } from "../../src/layout/dock-cuenta.js";

class NodoDock {
  constructor(tag, doc) {
    this.tagName = tag.toUpperCase();
    this.ownerDocument = doc;
    this.className = "";
    this.id = "";
    this.children = [];
    this.textContent = "";
    this.hidden = false;
    this.atributos = new Map();
    this._eventos = {};
    this._hermanosDespues = [];
    this.classList = {
      _set: new Set(),
      add: (...c) => c.forEach((x) => this.classList._set.add(x)),
      remove: (...c) => c.forEach((x) => this.classList._set.delete(x)),
      contains: (x) => this.classList._set.has(x),
    };
  }
  append(...nodes) {
    for (const n of nodes) {
      n.parent = this;
      this.children.push(n);
    }
  }
  replaceChildren(...nodes) {
    this.children = [];
    this.append(...nodes);
  }
  after(...nodes) { this._hermanosDespues.push(...nodes); }
  setAttribute(k, v) { this.atributos.set(k, String(v)); }
  getAttribute(k) { return this.atributos.get(k) ?? null; }
  removeAttribute(k) { this.atributos.delete(k); }
  addEventListener(ev, cb) { (this._eventos[ev] ??= []).push(cb); }
  focus() { this.ownerDocument.activeElement = this; }
  contains(o) {
    for (let n = o; n; n = n.parent) if (n === this) return true;
    return false;
  }
  *todos() {
    for (const h of this.children) {
      yield h;
      yield* h.todos();
    }
  }
  querySelector(sel) {
    if (sel === "a, button") {
      return [...this.todos()].find((n) => n.tagName === "A" || n.tagName === "BUTTON") ?? null;
    }
    return null;
  }
  dispatch(ev, extra = {}) {
    const evento = {
      type: ev,
      defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() {},
      target: this,
      ...extra,
    };
    for (const cb of this._eventos[ev] ?? []) cb(evento);
    return evento;
  }
}

test("dock Mi cuenta: invitado va a /login.html; CLIENTE abre menú con acciones y Escape devuelve foco", () => {
  const prevDoc = global.document;
  const docListeners = {};
  const doc = {
    activeElement: null,
    createElement: (tag) => new NodoDock(tag, doc),
    addEventListener: (ev, cb) => { (docListeners[ev] ??= []).push(cb); },
  };
  global.document = doc;

  try {
    const dockBtn = new NodoDock("a", doc);
    dockBtn.setAttribute("href", "/login.html");

    let sesion = null;
    const llamadas = [];
    const ctrl = configurarDockCuenta({
      dockBtnUsuario: dockBtn,
      obtenerUsuarioSesion: () => sesion,
      acciones: {
        irAMisCompras: () => llamadas.push("compras"),
        irAMiAtencion: () => llamadas.push("atencion"),
        irAFavoritos: () => llamadas.push("favoritos"),
        cerrarSesion: () => llamadas.push("salir"),
      },
    });

    const menu = dockBtn._hermanosDespues[0];
    assert.equal(menu.id, "dock-menu-cuenta");
    assert.equal(menu.hidden, true);

    // Invitado: sigue yendo a /login.html sin interceptar click
    ctrl.actualizar(null);
    assert.equal(dockBtn.getAttribute("href"), "/login.html");
    const clickInvitado = dockBtn.dispatch("click");
    assert.equal(clickInvitado.defaultPrevented, false);

    // Cliente: actualiza href, abre diálogo con datos y acciones reales
    sesion = { nombre: "Makaay Anthony", correo: "m@correo.com", rol: "CLIENTE" };
    ctrl.actualizar(sesion);
    assert.equal(dockBtn.getAttribute("href"), "#/pedidos");
    assert.equal(dockBtn.getAttribute("aria-haspopup"), "dialog");

    const clickCliente = dockBtn.dispatch("click");
    assert.equal(clickCliente.defaultPrevented, true);
    assert.equal(menu.hidden, false);
    assert.equal(dockBtn.getAttribute("aria-expanded"), "true");

    const acciones = menu.children[1].children;
    assert.deepEqual(acciones.map((b) => b.textContent), ["Mis compras", "Mi atención", "Favoritos"]);
    assert.equal(doc.activeElement, acciones[0], "enfoca la primera acción al abrir");

    acciones[2].dispatch("click");
    assert.deepEqual(llamadas, ["favoritos"]);
    assert.equal(menu.hidden, true);

    // Abrir de nuevo y cerrar con Escape devuelve foco al botón del dock
    dockBtn.dispatch("click");
    assert.equal(menu.hidden, false);
    docListeners.keydown.forEach((fn) => fn({ key: "Escape" }));
    assert.equal(menu.hidden, true);
    assert.equal(doc.activeElement, dockBtn);

    // Personal: muestra enlace a /panel.html#/inicio
    sesion = { nombre: "Ana", correo: "a@correo.com", rol: "ALMACEN" };
    ctrl.actualizar(sesion);
    assert.equal(dockBtn.getAttribute("href"), "/panel.html#/inicio");
    assert.equal(menu.children[1].children[0].getAttribute("href"), "/panel.html#/inicio");
  } finally {
    global.document = prevDoc;
  }
});
