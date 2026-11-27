// Panel del personal (spec 19, T06b): marcado del Inicio de Almacén (spec 14 y P4) e ids
// únicos en el DOM del panel. El pintado se prueba como texto; el arranque solo lo inserta.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  montar,
  renderizarInicioAlmacen,
  renderizarIndicadores,
  renderizarTarjetaPedido,
  renderizarColumna,
  renderizarStockCritico,
  renderizarErrorBloque,
  renderizarCargando,
  ACCION_POR_ESTADO,
} from "../../src/panel/inicio/almacen-inicio.js";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import { renderizarVistaPedidos, renderizarVistaInventario } from "../../src/layout/vistas-personal.js";
import { formatoPrecio } from "../../src/utilidades/formato.js";

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const contar = (html, patron) => (html.match(patron) || []).length;

// ---------- Estructura ----------

test("encabezado con fecha, <h1> «Inicio», apoyo y botones de cabecera", () => {
  const html = renderizarInicioAlmacen({ hoy: new Date(2026, 10, 26) });
  assert.match(html, /<p class="panel-fecha">Jueves 26 de noviembre<\/p>/);
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /Pedidos por preparar y mercadería que necesita reposición\./);
  assert.match(html, /<a [^>]*href="#\/inventario"[^>]*>[\s\S]*?<span>Ir al kardex<\/span><\/a>/);
  assert.match(html, /<a [^>]*href="#\/pedidos"[^>]*>[\s\S]*?<span>Ver pedidos<\/span><\/a>/);
});

test("los tres bloques: cola de pedidos, stock crítico y entrada rápida", () => {
  const html = renderizarInicioAlmacen();
  assert.match(html, /<h2[^>]*>Cola de pedidos<\/h2>/);
  assert.match(html, /<h2[^>]*>Stock crítico<\/h2>/);
  assert.match(html, /<h2[^>]*>Entrada rápida de mercadería<\/h2>/);
  assert.match(html, /<a [^>]*href="#\/pedidos"[^>]*>Ver todos<\/a>/);
  for (const titulo of ["Pendientes", "En preparación", "Despachados"]) {
    assert.match(html, new RegExp(`>${titulo}<`), titulo);
  }
});

test("el formulario de entrada tiene sus tres campos con <label for> y las reglas de la spec", () => {
  const html = renderizarInicioAlmacen();
  for (const id of ["inicio-producto-entrada", "inicio-cantidad-entrada", "inicio-motivo-entrada"]) {
    assert.match(html, new RegExp(`<label [^>]*for="${id}"`), id);
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /<select [^>]*id="inicio-producto-entrada"/);
  assert.match(html, /<input [^>]*id="inicio-cantidad-entrada"[^>]*type="number"[^>]*min="1"[^>]*step="1"/);
  assert.match(html, /<input [^>]*id="inicio-motivo-entrada"[^>]*type="text"/);
  assert.doesNotMatch(html, /id="inicio-motivo-entrada"[^>]*value=/, "sin motivo por defecto");
  assert.match(html, /<button [^>]*type="submit"[^>]*>Registrar entrada<\/button>/);
  assert.match(html, /Queda registrada en el kardex con tu usuario y la fecha\./);
  assert.match(html, /role="alert"/);
});

test("todos los ids del Inicio llevan el prefijo inicio-", () => {
  for (const id of idsDe(renderizarInicioAlmacen())) assert.ok(id.startsWith("inicio-"), id);
});

test("accesos rápidos para celular: Inicio, Pedidos y Kardex", () => {
  const html = renderizarInicioAlmacen();
  assert.match(html, /<nav [^>]*aria-label="Accesos rápidos"/);
  for (const [ruta, texto] of [["#/inicio", "Inicio"], ["#/pedidos", "Pedidos"], ["#/inventario", "Kardex"]]) {
    assert.match(html, new RegExp(`href="${ruta}"[^>]*>${texto}<`), texto);
  }
});

test("no hay ids repetidos en el DOM del panel de Almacén (marco, Inicio, vistas y modales)", () => {
  const modales = readFileSync(new URL("../../src/layout/plantillas/modales.html", import.meta.url), "utf-8");
  const dom = [
    renderizarBarraSuperior({ nombre: "Ana", rol: "ALMACEN" }),
    renderizarMenuLateral("ALMACEN"),
    renderizarInicioAlmacen(),
    renderizarVistaPedidos(),
    renderizarVistaInventario(),
    modales,
  ].join("\n");
  const ids = idsDe(dom);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(repetidos, []);
});

// ---------- Indicadores ----------

test("indicadores de la decisión P4 con iconos, alerta y enlace Atender cola", () => {
  const html = renderizarIndicadores({
    pedidos: { porPreparar: 3, pendientes: 2, enPreparacion: 1, despachados: 4 },
    productos: { stockBajo: 2, unidades: 33, productosActivos: 4 },
  });
  assert.equal(contar(html, /<article class="panel-kpi (panel-kpi-icono|panel-kpi-alerta)"/g), 4);
  assert.match(html, /panel-kpi-alerta[\s\S]*?Por preparar[\s\S]*>3<[\s\S]*2 pendientes · 1 en preparación[\s\S]*Atender cola/);
  assert.match(html, /Despachados[\s\S]*>4<[\s\S]*En camino al cliente/);
  assert.match(html, /Stock bajo[\s\S]*>2<[\s\S]*Por debajo del mínimo/);
  assert.match(html, /Unidades en almacén[\s\S]*>33<[\s\S]*4 productos activos/);
  assert.doesNotMatch(html, /Despachados hoy/);
});

test("indicadores: Atender cola enlaza al filtro de pendientes o en preparación según haya cola", () => {
  const conPendientes = renderizarIndicadores({
    pedidos: { porPreparar: 3, pendientes: 2, enPreparacion: 1, despachados: 0 },
    productos: { stockBajo: 0, unidades: 10, productosActivos: 1 },
  });
  assert.match(conPendientes, /href="#\/pedidos\?estado=PENDIENTE"[^>]*>Atender cola<\/a>/);

  const soloEnPrep = renderizarIndicadores({
    pedidos: { porPreparar: 2, pendientes: 0, enPreparacion: 2, despachados: 0 },
    productos: { stockBajo: 0, unidades: 10, productosActivos: 1 },
  });
  assert.match(soloEnPrep, /href="#\/pedidos\?estado=EN_PREPARACION"[^>]*>Atender cola<\/a>/);
});

test("si falta una fuente, sus indicadores muestran «—» en lugar de un número", () => {
  const html = renderizarIndicadores({ pedidos: null, productos: { stockBajo: 1, unidades: 9, productosActivos: 2 } });
  assert.match(html, /Por preparar[\s\S]*?>—</);
  assert.match(html, /Despachados[\s\S]*?>—</);
  assert.match(html, /Stock bajo[\s\S]*?>1</);
});

// ---------- Tarjetas de pedido ----------

test("tarjeta: número, resumen, monto y el botón de su estado", () => {
  assert.deepEqual({ ...ACCION_POR_ESTADO }, {
    PENDIENTE: { accion: "preparar", texto: "Empezar a preparar" },
    EN_PREPARACION: { accion: "despachar", texto: "Marcar como despachado" },
    DESPACHADO: { accion: "entregar", texto: "Marcar como entregado" },
  });
  const p = { idPedido: 5, estado: "PENDIENTE", total: 447, productos: [{ nombreProducto: "Teclado K380", cantidad: 3 }] };
  const html = renderizarTarjetaPedido(p);
  assert.match(html, />Pedido #5</);
  assert.match(html, /Teclado K380 × 3/);
  assert.ok(html.includes(formatoPrecio(447)));
  assert.match(html, /<button [^>]*type="button"[^>]*data-accion="preparar"[^>]*data-pedido="5"[^>]*>Empezar a preparar<\/button>/);
  assert.match(renderizarTarjetaPedido({ ...p, estado: "EN_PREPARACION" }), /data-accion="despachar"[^>]*>Marcar como despachado</);
  assert.match(renderizarTarjetaPedido({ ...p, estado: "DESPACHADO" }), /data-accion="entregar"[^>]*>Marcar como entregado</);
});

test("tarjeta: escapa los nombres de producto", () => {
  const html = renderizarTarjetaPedido({ idPedido: 1, estado: "PENDIENTE", total: 1,
    productos: [{ nombreProducto: "<img src=x>", cantidad: 1 }] });
  assert.doesNotMatch(html, /<img/);
});

test("columna: título con contador en insignia y «Sin pedidos» si está vacía", () => {
  const vacia = renderizarColumna("PENDIENTE", []);
  assert.match(vacia, /Pendientes/);
  assert.match(vacia, /panel-insignia-ambar[^>]*>0</);
  assert.match(vacia, /Sin pedidos/);
  const llena = renderizarColumna("EN_PREPARACION", [
    { idPedido: 2, estado: "EN_PREPARACION", clienteNombre: "Diego", creadoEn: "2026-11-24T00:00:00Z", total: 1, productos: [] },
    { idPedido: 3, estado: "EN_PREPARACION", clienteNombre: "Ana", creadoEn: "2026-11-26T00:00:00Z", total: 2, productos: [] },
  ], new Date("2026-11-26T12:00:00Z"));
  assert.match(llena, /panel-insignia-azul[^>]*>2</);
  assert.match(llena, /Pedido #2/);
  assert.match(llena, /Diego/);
  assert.match(llena, /panel-espera panel-espera-rojo/);
  assert.equal(contar(llena, /class="panel-boton panel-boton-accion"/g), 1, "solo el más antiguo lleva botón primario");
  assert.equal(contar(llena, /class="panel-boton panel-boton-secundario panel-boton-cola"/g), 1);
  assert.match(renderizarColumna("DESPACHADO", [{ idPedido: 4, estado: "DESPACHADO", total: 1, productos: [] }]),
    /panel-boton-secundario panel-boton-cola/);
  assert.match(renderizarColumna("DESPACHADO", []), /panel-insignia-verde/);
});

// ---------- Stock crítico ----------

test("stock crítico: nombre, insignia y botón «+ Reponer»; recuadro verde si está vacío", () => {
  const vacio = renderizarStockCritico([]);
  assert.match(vacio, /class="panel-vacio-ok"/);
  assert.match(vacio, /Todo el stock está sobre el mínimo\./);
  const html = renderizarStockCritico([{ id: 1, nombre: "Mouse", stock: 0 }, { id: 2, nombre: "Webcam", stock: 1 }]);
  assert.match(html, /Mouse[\s\S]*panel-insignia-rojo[^>]*>Agotado</);
  assert.match(html, /Webcam[\s\S]*panel-insignia-ambar[^>]*>1 unidad</);
  assert.match(html, /data-reponer-producto="1"[^>]*>\+ Reponer<\/button>/);
});

test("pulsar + Reponer en Stock crítico preselecciona el producto, muestra stock actual y enfoca Cantidad", async () => {
  class Nodo {
    constructor(tag = "div") {
      this.tagName = tag.toUpperCase();
      this.children = [];
      this.dataset = {};
      this.attributes = new Map();
      this.listeners = new Map();
      this.value = "";
      this.hidden = false;
      this.disabled = false;
      this.focused = false;
      this._html = "";
      this._text = "";
    }
    set innerHTML(v) { this._html = String(v || ""); }
    get innerHTML() { return this._html; }
    set textContent(v) { this._text = String(v ?? ""); }
    get textContent() { return this._text; }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) ?? null; }
    removeAttribute(k) { this.attributes.delete(k); }
    addEventListener(t, fn) {
      if (!this.listeners.has(t)) this.listeners.set(t, []);
      this.listeners.get(t).push(fn);
    }
    dispatchEvent(ev) {
      for (const fn of this.listeners.get(ev.type) ?? []) fn(ev);
    }
    focus() { this.focused = true; }
    scrollIntoView() {}
    replaceChildren(...nodos) { this.children = nodos; }
    querySelector(sel) { return mapaPorId.get(sel) ?? null; }
  }

  const mapaPorId = new Map([
    ["#inicio-indicadores", new Nodo("section")],
    ["#inicio-cola", new Nodo("div")],
    ["#inicio-stock", new Nodo("div")],
    ["#inicio-form-entrada", new Nodo("form")],
    ["#inicio-producto-entrada", new Nodo("select")],
    ["#inicio-stock-producto-ayuda", new Nodo("p")],
    ["#inicio-cantidad-entrada", new Nodo("input")],
    ["#inicio-motivo-entrada", new Nodo("input")],
    ["#inicio-errores-entrada", new Nodo("div")],
    ["#inicio-registrar-entrada", new Nodo("button")],
  ]);
  globalThis.Option = class MockOption extends Nodo {
    constructor(t = "", v = "") { super("option"); this.textContent = t; this.value = String(v); }
  };

  const contenedor = new Nodo("div");
  const modulo = montar(contenedor, {
    servicios: {
      apiRequest: async (url) => ({
        json: async () => (url === "/api/pedidos/operativos" ? [] : [{ id: 7, nombre: "Mouse Lift", stock: 0, activo: true }]),
      }),
      mostrarToast: () => {},
      estado: {},
    },
  });
  await modulo.alMostrar();

  const btnReponer = new Nodo("button");
  btnReponer.dataset.reponerProducto = "7";
  contenedor.dispatchEvent({
    type: "click",
    target: { closest: (sel) => (sel === "[data-reponer-producto]" ? btnReponer : null) },
  });

  assert.equal(mapaPorId.get("#inicio-producto-entrada").value, "7");
  assert.equal(mapaPorId.get("#inicio-stock-producto-ayuda").hidden, false);
  assert.equal(mapaPorId.get("#inicio-stock-producto-ayuda").textContent, "Stock actual: 0 unidades.");
  assert.equal(mapaPorId.get("#inicio-cantidad-entrada").focused, true);
});

// ---------- Estados de carga y error ----------

test("cargando: skeletons iniciales en renderizarInicioAlmacen y «Reintentar» en error", () => {
  const inicio = renderizarInicioAlmacen();
  assert.equal(contar(inicio, /class="panel-kpi panel-esqueleto-kpi"/g), 4);
  assert.equal(contar(inicio, /class="panel-esqueleto-lista"/g), 4);
  assert.match(renderizarCargando(), /Cargando…/);
  const error = renderizarErrorBloque("pedidos");
  assert.match(error, /No se pudo cargar\./);
  assert.match(error, /<button [^>]*type="button"[^>]*data-reintentar="pedidos"[^>]*>Reintentar<\/button>/);
});

test("responsive de Almacén: + Reponer 44 px / 48 px en móvil y reset de fila estado kardex", () => {
  const cssAlmacen = readFileSync(new URL("../../src/css/panel/inicio-almacen.css", import.meta.url), "utf8");
  assert.match(cssAlmacen, /\.panel-boton-reponer\s*\{[^}]*min-height:\s*var\(--panel-alto-pulsable\)/);
  assert.match(cssAlmacen, /\.panel-stock-info \.panel-stock-nombre\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(cssAlmacen, /@media \(max-width: 991\.98px\)[\s\S]*\.panel-pedido \.panel-boton-cola\s*\{[^}]*min-height:\s*48px/);
  assert.match(cssAlmacen, /@media \(max-width: 575\.98px\)[\s\S]*\.panel-fila-stock\s*\{[^}]*flex-direction:\s*column/);
  assert.match(cssAlmacen, /@media \(max-width: 575\.98px\)[\s\S]*\.panel-boton-reponer\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px/);
  assert.match(cssAlmacen, /@media \(max-width: 575\.98px\)[\s\S]*\.panel-fila-estado-kardex td\s*\{[^}]*display:\s*block/);
});
