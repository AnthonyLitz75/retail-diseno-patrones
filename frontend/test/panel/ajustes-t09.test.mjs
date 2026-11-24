// Panel del personal (spec 19, ajustes a T09): indicadores internos de Administración ocultos
// por ruta, utilidades del panel (fecha y descarga) y carga diferida de Administración.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatearFechaHora, guardarArchivo } from "../../src/panel/utilidades-panel.js";
import { crearPantallaAdministracion } from "../../src/panel/pantallas/administracion.js";

// ---------- a) Indicadores internos ocultos en categorías, cuentas e incidencias ----------

test("panel.css oculta .indicadores-admin en #/categorias, #/cuentas e #/incidencias, no en #/reportes", () => {
  const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf-8");
  const regla = css.match(/([^{}]*\.indicadores-admin[^{}]*)\{([^}]*)\}/);
  assert.ok(regla, "existe una regla para .indicadores-admin");
  const [, selectores, cuerpo] = regla;
  assert.match(cuerpo, /display:\s*none/);
  for (const ruta of ["#/categorias", "#/cuentas", "#/incidencias"]) {
    assert.ok(selectores.includes(`.panel-pagina section[data-ruta="${ruta}"] .indicadores-admin`), ruta);
  }
  assert.ok(!selectores.includes("#/reportes"), "en Reportes siguen visibles");
  assert.equal((css.match(/\.indicadores-admin/g) || []).length, 3, "ninguna otra regla los toca");
});

// ---------- b) Utilidades del panel ----------

test("formatearFechaHora: el mismo formato es-PE corto que la tabla de auditoría", () => {
  const valor = "2026-11-24T15:05:00Z";
  assert.equal(formatearFechaHora(valor), new Date(valor).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }));
  assert.equal(formatearFechaHora("no-es-fecha"), "no-es-fecha");
  assert.equal(formatearFechaHora(null), "");
});

test("guardarArchivo: crea el enlace de descarga, lo pulsa y libera la URL", async () => {
  const eventos = [];
  const enlace = { click: () => eventos.push(["click", enlace.href, enlace.download]) };
  const documento = { createElement: (t) => { eventos.push(["crear", t]); return enlace; } };
  const URLFalsa = {
    createObjectURL: (blob) => { eventos.push(["url", blob]); return "blob:1"; },
    revokeObjectURL: (url) => eventos.push(["revocar", url]),
  };
  await guardarArchivo({ blob: async () => "contenido" }, "ventas.csv", { documento, URL: URLFalsa });
  assert.deepEqual(eventos, [
    ["url", "contenido"],
    ["crear", "a"],
    ["click", "blob:1", "ventas.csv"],
    ["revocar", "blob:1"],
  ]);
});

// ---------- c) Carga diferida de Administración ----------

/** DOM mínimo para la pantalla de Administración. */
class Nodo {
  constructor(etiqueta = "div") {
    this.tagName = etiqueta.toUpperCase();
    this.children = [];
    this.hidden = false;
    this.dataset = {};
    this.parent = null;
    this._html = "";
  }
  set innerHTML(valor) {
    this._html = valor;
    this.children = [];
    this.firstElementChild = new Nodo("div");
    this.firstElementChild.hidden = true;
  }
  get innerHTML() { return this._html; }
  append(...hijos) {
    for (const h of hijos) {
      h.parent?.children.splice(h.parent.children.indexOf(h), 1);
      h.parent = this;
      this.children.push(h);
    }
  }
  querySelector(selector) {
    if (selector === "[data-cargando]" && this._html.includes("data-cargando")) {
      return { remove: () => { this._html = this._html.replace(/<div data-cargando>[\s\S]*?<\/div>/, ""); } };
    }
    return null;
  }
  remove() { this.parent?.children.splice(this.parent.children.indexOf(this), 1); this.parent = null; }
}

function escenario() {
  const llamadas = { importar: 0, crearAdmin: 0, mostrarSeccion: [], cargar: 0, cargarIncidencias: 0 };
  let resolver;
  const promesa = new Promise((r) => { resolver = r; });
  const modulos = {
    crearPanelAdministracion: () => {
      llamadas.crearAdmin += 1;
      return {
        element: new Nodo("section"),
        agregarSeccion() {},
        mostrarSeccion: (id) => llamadas.mostrarSeccion.push(id),
        cargar: async () => { llamadas.cargar += 1; },
      };
    },
    crearPanelIncidencias: () => ({ element: new Nodo("section"), cargar: async () => { llamadas.cargarIncidencias += 1; } }),
  };
  const pantalla = crearPantallaAdministracion({
    cargarModulos: () => { llamadas.importar += 1; return promesa; },
    documento: { createElement: (t) => new Nodo(t) },
  });
  return { llamadas, pantalla, resolver: () => resolver(modulos) };
}

test("dos alMostrar seguidos y un cambio de ruta antes de resolver: un solo montaje y nada fuera de su ruta", async () => {
  const { llamadas, pantalla, resolver } = escenario();
  let rutaActual = "#/cuentas";
  const servicios = {};
  const cuentas = new Nodo("section");
  const reportes = new Nodo("section");
  const ctrlCuentas = pantalla.montar(cuentas, { entrada: { ruta: "#/cuentas" }, servicios, estaVisible: () => rutaActual === "#/cuentas" });
  const ctrlReportes = pantalla.montar(reportes, { entrada: { ruta: "#/reportes" }, servicios, estaVisible: () => rutaActual === "#/reportes" });

  const p1 = ctrlCuentas.alMostrar({});
  rutaActual = "#/reportes"; // el usuario cambia de ruta antes de que llegue el módulo
  const p2 = ctrlReportes.alMostrar({});
  assert.match(cuentas.innerHTML, /Cargando…/, "mientras tanto se ve «Cargando…»");
  resolver();
  await Promise.all([p1, p2]);

  assert.equal(llamadas.importar, 1, "la importación se pide una sola vez");
  assert.equal(llamadas.crearAdmin, 1, "una sola instancia");
  assert.deepEqual(llamadas.mostrarSeccion, ["reportes"], "no se muestra la sección de una ruta que ya no está activa");
  assert.equal(llamadas.cargar, 1, "solo se recarga la sección visible");
  assert.equal(reportes.children.length, 1, "la instancia está en el contenedor de la ruta activa");
  assert.equal(cuentas.children.length, 0);
});

test("cuando la ruta sigue activa, se monta, se muestra su sección y se recarga", async () => {
  const { llamadas, pantalla, resolver } = escenario();
  const incidencias = new Nodo("section");
  const ctrl = pantalla.montar(incidencias, { entrada: { ruta: "#/incidencias" }, servicios: {}, estaVisible: () => true });
  const p = ctrl.alMostrar({});
  resolver();
  await p;
  assert.deepEqual(llamadas.mostrarSeccion, ["incidencias"]);
  assert.equal(llamadas.cargarIncidencias, 1);
  assert.doesNotMatch(incidencias.innerHTML, /Cargando…/);
});
