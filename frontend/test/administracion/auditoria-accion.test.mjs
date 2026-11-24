// Panel del personal (spec 19, T10 y arreglos aprobados): marcado de la auditoría.
// - La acción va en un <span> con data-accion (insignia con forma de pastilla en panel.css).
// - El usuario de cada fila es <th scope="row">.
// - Error con «No se pudo cargar la auditoría.» y «Reintentar»; aria-busy en los resultados.
// - La fecha coincide con formatearFechaHora del panel.
import test from "node:test";
import assert from "node:assert/strict";
import { crearFilaAuditoria, crearPanelAuditoria } from "../../src/administracion/auditoria-vista.js";
import { formatearFechaHora } from "../../src/panel/utilidades-panel.js";

/** DOM mínimo, suficiente para crearPanelAuditoria y crearFilaAuditoria. */
class Nodo {
  constructor(etiqueta) {
    this.tagName = String(etiqueta).toUpperCase();
    this.children = [];
    this.dataset = {};
    this.atributos = new Map();
    this.oyentes = {};
    this.className = "";
    this.hidden = false;
    this.value = "";
    this._texto = "";
  }
  get textContent() { return this._texto + this.children.map((h) => h.textContent).join(""); }
  set textContent(valor) { this._texto = String(valor); this.children = []; }
  append(...hijos) { this.children.push(...hijos); }
  replaceChildren(...hijos) { this.children = hijos; }
  setAttribute(nombre, valor) { this.atributos.set(nombre, String(valor)); }
  getAttribute(nombre) { return this.atributos.has(nombre) ? this.atributos.get(nombre) : null; }
  addEventListener(tipo, fn) { this.oyentes[tipo] = fn; }
  *todos() { for (const h of this.children) { yield h; yield* h.todos(); } }
}

function conDocumento(fn) {
  const documento = globalThis.document;
  const opcion = globalThis.Option;
  globalThis.document = { createElement: (t) => new Nodo(t) };
  globalThis.Option = class extends Nodo { constructor(texto, valor) { super("option"); this.textContent = texto; this.value = valor; } };
  return Promise.resolve()
    .then(fn)
    .finally(() => { globalThis.document = documento; globalThis.Option = opcion; });
}

const registro = (extra) => ({
  id: 1, fecha: "2026-11-24T15:05:00Z", usuarioNombre: "Ana", rol: "ADMIN",
  entidad: "PRODUCTO", entidadId: 3, detalle: "x", ...extra,
});

// ---------- Fila ----------

test("la acción va en un <span> con data-accion; la celda ya no lleva el atributo", () => conDocumento(() => {
  const celda = crearFilaAuditoria(registro({ accion: "PRECIO_CAMBIADO", accionEtiqueta: "Cambio de precio" })).children[2];
  assert.equal(celda.tagName, "TD");
  assert.equal(celda.dataset.accion, undefined);
  const insignia = celda.children[0];
  assert.equal(insignia.tagName, "SPAN");
  assert.equal(insignia.dataset.accion, "PRECIO_CAMBIADO");
  assert.equal(insignia.textContent, "Cambio de precio");
}));

test("sin etiqueta, el texto de la insignia es el código; un código desconocido también lleva data-accion", () => conDocumento(() => {
  const insignia = crearFilaAuditoria(registro({ accion: "ALGO_NUEVO" })).children[2].children[0];
  assert.equal(insignia.dataset.accion, "ALGO_NUEVO");
  assert.equal(insignia.textContent, "ALGO_NUEVO");
}));

test("el usuario de cada fila es <th scope=\"row\">", () => conDocumento(() => {
  const celda = crearFilaAuditoria(registro({ accion: "PEDIDO_ESTADO" })).children[1];
  assert.equal(celda.tagName, "TH");
  assert.equal(celda.getAttribute("scope"), "row");
  assert.match(celda.textContent, /Ana · ADMIN/);
}));

test("la fecha de la fila tiene exactamente el formato de formatearFechaHora", () => conDocumento(() => {
  const fila = crearFilaAuditoria(registro({ accion: "PEDIDO_ESTADO" }));
  assert.equal(fila.children[0].textContent, formatearFechaHora("2026-11-24T15:05:00Z"));
}));

// ---------- Panel: error, «Reintentar» y aria-busy ----------

function panelCon(apiRequest) {
  const panel = crearPanelAuditoria(apiRequest);
  const nodos = [...panel.element.todos()];
  return {
    panel,
    estado: nodos.find((n) => n.getAttribute("role") === "status" && n.tagName === "P"),
    resultados: nodos.find((n) => n.className === "table-responsive"),
    cuerpo: nodos.find((n) => n.tagName === "TBODY"),
  };
}

const respuesta = (datos) => ({ json: async () => datos });

test("si la consulta falla: «No se pudo cargar la auditoría.» y un botón «Reintentar» que recarga con los filtros", () => conDocumento(async () => {
  const pedidas = [];
  let falla = true;
  const { panel, estado, cuerpo } = panelCon(async (url) => {
    pedidas.push(url);
    if (url.endsWith("/acciones")) return respuesta([]);
    if (falla) throw new Error("sin red");
    return respuesta({ items: [registro({ accion: "PEDIDO_ESTADO" })], total: 1, pagina: 1, tamano: 20 });
  });
  await panel.cargar();
  assert.equal(estado._texto, "No se pudo cargar la auditoría.");
  const boton = estado.children.find((n) => n.tagName === "BUTTON");
  assert.ok(boton, "hay botón «Reintentar»");
  assert.equal(boton.textContent, "Reintentar");
  assert.equal(boton.type, "button");

  falla = false;
  await boton.oyentes.click();
  assert.equal(pedidas.filter((u) => u.startsWith("/api/admin/auditoria?")).length, 2, "vuelve a consultar");
  assert.equal(pedidas.at(-1), pedidas.find((u) => u.startsWith("/api/admin/auditoria?")), "con la misma consulta");
  assert.equal(cuerpo.children.length, 1);
}));

test("los resultados llevan aria-busy=true mientras cargan y false al terminar (también si falla)", () => conDocumento(async () => {
  const estados = [];
  const referencia = {};
  const { panel, resultados } = panelCon(async (url) => {
    if (url.endsWith("/acciones")) return respuesta([]);
    estados.push(referencia.resultados.getAttribute("aria-busy"));
    throw new Error("sin red");
  });
  referencia.resultados = resultados;
  await panel.cargar();
  assert.deepEqual(estados, ["true"]);
  assert.equal(resultados.getAttribute("aria-busy"), "false");
}));
