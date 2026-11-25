// Panel del personal (spec 19, T12): cajón del menú por debajo de 992 px. Botón con aria-label,
// aria-expanded y aria-controls; se cierra con Escape, al tocar fuera y al elegir una entrada;
// el foco vuelve al botón y, mientras está abierto, no se escapa al contenido de detrás.
import test from "node:test";
import assert from "node:assert/strict";
import { crearCajonMenu } from "../../src/panel/cajon-menu.js";

class Elemento {
  constructor(etiqueta, documento) {
    this.tagName = etiqueta.toUpperCase();
    this.documento = documento;
    this.children = [];
    this.parent = null;
    this.atributos = new Map();
    this.dataset = {};
    this.oyentes = {};
  }
  append(...hijos) { for (const h of hijos) { h.parent = this; this.children.push(h); } }
  setAttribute(k, v) { this.atributos.set(k, String(v)); }
  getAttribute(k) { return this.atributos.has(k) ? this.atributos.get(k) : null; }
  addEventListener(tipo, fn) { (this.oyentes[tipo] ??= []).push(fn); }
  focus() { this.documento.activeElement = this; }
  contains(otro) { for (let n = otro; n; n = n.parent) if (n === this) return true; return false; }
  closest(selector) {
    for (let n = this; n; n = n.parent) if (selector === "a[href]" && n.tagName === "A" && n.getAttribute("href")) return n;
    return null;
  }
  *todos() { for (const h of this.children) { yield h; yield* h.todos(); } }
  querySelectorAll(selector) {
    if (selector === "a[href]") return [...this.todos()].filter((n) => n.tagName === "A" && n.getAttribute("href"));
    if (selector === "a[href], button") return [...this.todos()].filter((n) => (n.tagName === "A" && n.getAttribute("href")) || n.tagName === "BUTTON");
    return [];
  }
}

function crearEntorno() {
  const oyentes = {};
  const documento = {
    activeElement: null,
    addEventListener: (tipo, fn) => { (oyentes[tipo] ??= new Set()).add(fn); },
    removeEventListener: (tipo, fn) => { oyentes[tipo]?.delete(fn); },
  };
  const cuerpo = new Elemento("body", documento);
  const boton = new Elemento("button", documento);
  const menu = new Elemento("nav", documento);
  menu.id = "panel-menu";
  const enlaces = ["#/inicio", "#/pedidos", "#/inventario"].map((ruta) => {
    const a = new Elemento("a", documento);
    a.setAttribute("href", ruta);
    menu.append(a);
    return a;
  });
  const contenido = new Elemento("main", documento);
  const enlaceContenido = new Elemento("a", documento);
  enlaceContenido.setAttribute("href", "#/otra");
  contenido.append(enlaceContenido);
  cuerpo.append(boton, menu, contenido);

  // F4: el foco al abrir se pide en el siguiente frame; aquí el «frame» llega justo después de
  // cada evento (el orden con la visibilidad se prueba en tanda1.test.mjs).
  const frames = [];
  const cajon = crearCajonMenu({ boton, menu, documento, siguienteFrame: (fn) => frames.push(fn), esperar() {} });
  const disparar = (objetivo, tipo, extra = {}) => {
    const evento = { type: tipo, target: objetivo, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra };
    // Burbujeo como en el navegador: del objetivo a sus ancestros y, al final, el documento.
    for (let nodo = objetivo; nodo; nodo = nodo.parent) {
      for (const fn of nodo.oyentes?.[tipo] ?? []) fn(evento);
    }
    for (const fn of [...(oyentes[tipo] ?? [])]) fn(evento);
    frames.splice(0).forEach((f) => f());
    return evento;
  };
  return { cajon, boton, menu, enlaces, contenido, enlaceContenido, documento, disparar, oyentes };
}

test("el botón lleva aria-label, aria-controls y aria-expanded=false al empezar", () => {
  const { boton, menu } = crearEntorno();
  assert.equal(boton.getAttribute("aria-label"), "Abrir menú");
  assert.equal(boton.getAttribute("aria-controls"), "panel-menu");
  assert.equal(boton.getAttribute("aria-expanded"), "false");
  assert.equal(menu.dataset.abierto, "false");
});

test("al pulsar el botón se abre, marca aria-expanded=true y lleva el foco a la primera entrada", () => {
  const { boton, menu, enlaces, documento, disparar } = crearEntorno();
  disparar(boton, "click");
  assert.equal(boton.getAttribute("aria-expanded"), "true");
  assert.equal(menu.dataset.abierto, "true");
  assert.equal(documento.activeElement, enlaces[0]);
});

test("Escape cierra y el foco vuelve al botón", () => {
  const { boton, menu, documento, disparar } = crearEntorno();
  disparar(boton, "click");
  disparar(documento.activeElement, "keydown", { key: "Escape" });
  assert.equal(menu.dataset.abierto, "false");
  assert.equal(boton.getAttribute("aria-expanded"), "false");
  assert.equal(documento.activeElement, boton);
});

test("tocar fuera cierra; tocar dentro del menú sin elegir entrada no cierra", () => {
  const { boton, menu, contenido, disparar } = crearEntorno();
  disparar(boton, "click");
  disparar(menu, "click");
  assert.equal(menu.dataset.abierto, "true");
  disparar(contenido, "click");
  assert.equal(menu.dataset.abierto, "false");
});

test("elegir una entrada cierra el cajón y devuelve el foco al botón", () => {
  const { boton, menu, enlaces, documento, disparar } = crearEntorno();
  disparar(boton, "click");
  disparar(enlaces[1], "click");
  assert.equal(menu.dataset.abierto, "false");
  assert.equal(documento.activeElement, boton);
});

test("con el cajón abierto, Tab y Mayús+Tab no salen del botón y las entradas", () => {
  const { boton, enlaces, documento, disparar } = crearEntorno();
  disparar(boton, "click");
  enlaces[2].focus();
  const adelante = disparar(enlaces[2], "keydown", { key: "Tab", shiftKey: false });
  assert.equal(adelante.defaultPrevented, true);
  assert.equal(documento.activeElement, boton, "del último vuelve al botón");
  const atras = disparar(boton, "keydown", { key: "Tab", shiftKey: true });
  assert.equal(atras.defaultPrevented, true);
  assert.equal(documento.activeElement, enlaces[2], "del botón hacia atrás va a la última entrada");
});

test("si el foco estaba en el contenido de detrás, Tab lo devuelve al cajón", () => {
  const { boton, enlaces, enlaceContenido, documento, disparar } = crearEntorno();
  disparar(boton, "click");
  enlaceContenido.focus();
  const evento = disparar(enlaceContenido, "keydown", { key: "Tab", shiftKey: false });
  assert.equal(evento.defaultPrevented, true);
  assert.equal(documento.activeElement, enlaces[0]);
});

test("con el cajón cerrado no intercepta teclas ni clics, y libera sus oyentes del documento", () => {
  const { boton, enlaces, documento, disparar, oyentes } = crearEntorno();
  enlaces[0].focus();
  const evento = disparar(enlaces[0], "keydown", { key: "Tab" });
  assert.equal(evento.defaultPrevented, false);
  disparar(boton, "click");
  disparar(documento.activeElement, "keydown", { key: "Escape" });
  assert.equal(oyentes.keydown?.size ?? 0, 0);
  assert.equal(oyentes.click?.size ?? 0, 0);
});

test("el botón vuelve a cerrar si se pulsa con el cajón abierto", () => {
  const { boton, menu, disparar } = crearEntorno();
  disparar(boton, "click");
  disparar(boton, "click");
  assert.equal(menu.dataset.abierto, "false");
});
