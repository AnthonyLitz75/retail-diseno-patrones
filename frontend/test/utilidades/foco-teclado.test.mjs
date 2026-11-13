// RNF06: navegación con teclado — retorno del foco al cerrar modales y offcanvas, primer
// campo al abrir un modal y enlace "Saltar al contenido".
import test from "node:test";
import assert from "node:assert/strict";
import { configurarFocoTeclado, primerCampo, puedeRecibirFoco } from "../../src/utilidades/foco-teclado.js";
import { readFileSync } from "node:fs";
import { renderizarCatalogoLayout } from "../../src/layout/catalogo-layout.js";

function elemento(nombre, { visible = true, dentroDe = null } = {}) {
  return {
    nombre,
    isConnected: true,
    focusCount: 0,
    focus() { this.focusCount += 1; documento.activeElement = this; },
    closest: () => null,
    getClientRects: () => (visible ? [{}] : []),
    contains(otro) { return otro === this || otro?.padre === this; },
    padre: dentroDe,
  };
}

let documento;
function crearDocumento() {
  const escuchas = {};
  documento = {
    body: { nombre: "body" },
    activeElement: null,
    addEventListener: (tipo, fn) => { (escuchas[tipo] ??= []).push(fn); },
    emitir: (tipo, evento) => (escuchas[tipo] ?? []).forEach((fn) => fn(evento)),
    getElementById: () => null,
  };
  documento.activeElement = documento.body;
  return documento;
}

test("al cerrar un modal abierto desde código, el foco vuelve a quien lo abrió", () => {
  const doc = crearDocumento();
  configurarFocoTeclado(doc);
  const boton = elemento("Gestionar");
  const modal = elemento("modal");
  doc.activeElement = boton;

  doc.emitir("show.bs.modal", { target: modal });
  doc.activeElement = doc.body; // Bootstrap deja el foco perdido al ocultar
  doc.emitir("hidden.bs.modal", { target: modal });

  assert.equal(doc.activeElement, boton);
  assert.equal(boton.focusCount, 1);
});

test("también con el carrito (offcanvas) abierto al agregar un producto", () => {
  const doc = crearDocumento();
  configurarFocoTeclado(doc);
  const agregar = elemento("Agregar al carrito");
  const carrito = elemento("carrito");
  doc.activeElement = agregar;
  doc.emitir("show.bs.offcanvas", { target: carrito });
  doc.activeElement = elemento("cerrar", { dentroDe: carrito });
  doc.emitir("hidden.bs.offcanvas", { target: carrito });
  assert.equal(doc.activeElement, agregar);
});

test("no roba el foco si el usuario ya está en otro lugar, ni lo devuelve a algo oculto", () => {
  const doc = crearDocumento();
  configurarFocoTeclado(doc);
  const origen = elemento("origen");
  const modal = elemento("modal");
  const otro = elemento("otro");
  doc.activeElement = origen;
  doc.emitir("show.bs.modal", { target: modal });
  doc.activeElement = otro;
  doc.emitir("hidden.bs.modal", { target: modal });
  assert.equal(doc.activeElement, otro);

  const oculto = elemento("oculto", { visible: false });
  assert.equal(puedeRecibirFoco(oculto, doc), false);
  assert.equal(puedeRecibirFoco(doc.body, doc), false);
});

test("primerCampo devuelve el primer campo visible del modal", () => {
  crearDocumento();
  const invisible = elemento("invisible", { visible: false });
  const precio = elemento("precio");
  assert.equal(primerCampo({ querySelectorAll: () => [invisible, precio] }), precio);
  assert.equal(primerCampo({ querySelectorAll: () => [] }), null);
});

test("el layout empieza con 'Saltar al contenido' apuntando al <main>", () => {
  // layout.js importa plantillas .html de Vite; se revisa su fuente.
  const layout = readFileSync(new URL("../../src/layout/layout.js", import.meta.url), "utf8");
  const plantilla = layout.slice(layout.indexOf("return `"));
  assert.match(plantilla, /^return `\s*<a class="saltar-contenido" href="#contenido-principal" data-saltar-a="contenido-principal">/);
  assert.match(renderizarCatalogoLayout(), /<main id="contenido-principal"[^>]*tabindex="-1"/);
});

test("si quien abrió el carrito ya no existe, el foco va al respaldo que declara el panel", () => {
  const doc = crearDocumento();
  const botonCarrito = elemento("botón del carrito");
  doc.querySelector = (selector) => (selector === "#enlace-carrito-nav" ? botonCarrito : null);
  configurarFocoTeclado(doc);
  const agregar = elemento("Agregar al carrito");
  const carrito = { ...elemento("carrito"), dataset: { focoRespaldo: "#enlace-carrito-nav" } };
  doc.activeElement = agregar;
  doc.emitir("show.bs.offcanvas", { target: carrito });
  agregar.isConnected = false; // el catálogo se redibujó tras la compra
  doc.activeElement = doc.body;
  doc.emitir("hidden.bs.offcanvas", { target: carrito });
  assert.equal(doc.activeElement, botonCarrito);
});
