// Panel del personal (spec 19, T08): marcado del Inicio de Soporte (spec 16 y decisiones de T08).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  renderizarInicioSoporte,
  renderizarIndicadoresSoporte,
  renderizarTablaReclamos,
  renderizarTablaDevoluciones,
} from "../../src/panel/inicio/soporte-inicio.js";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import { renderizarVistaSoporte } from "../../src/layout/vistas-personal.js";

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const contar = (html, patron) => (html.match(patron) || []).length;

const reclamos = [
  { id: 1, pedidoId: 30, motivo: "Llegó dañado", estado: "ABIERTO", creadoEn: "2026-11-18T00:00:00Z" },
  { id: 2, pedidoId: 31, motivo: "No llegó", estado: "EN_ATENCION", soporteId: 7, creadoEn: "2026-11-19T00:00:00Z" },
  { id: 3, pedidoId: 32, motivo: "Otro agente", estado: "EN_ATENCION", soporteId: 8, creadoEn: "2026-11-20T00:00:00Z" },
  { id: 4, pedidoId: 33, motivo: "<img src=x>", estado: "ESCALADO", creadoEn: "2026-11-21T00:00:00Z" },
];
const devoluciones = [
  { id: 5, pedidoId: 40, estado: "SOLICITADA", creadoEn: "2026-11-18T00:00:00Z", lineas: [{ nombreProducto: "Mouse <b>" }] },
  { id: 6, pedidoId: 41, estado: "APROBADA", creadoEn: "2026-11-19T00:00:00Z", lineas: [{ nombreProducto: "A" }, { nombreProducto: "B" }] },
];

// ---------- Estructura y búsqueda ----------

test("encabezado: <h1> Inicio, apoyo y formulario «Buscar pedido»", () => {
  const html = renderizarInicioSoporte();
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /Casos abiertos de clientes, ordenados por antigüedad\./);
  assert.match(html, /<label [^>]*for="inicio-buscar-pedido"[^>]*>Buscar pedido<\/label>/);
  assert.match(html, /<input [^>]*id="inicio-buscar-pedido"[^>]*placeholder="Número, por ejemplo 3"/);
  assert.match(html, /<button [^>]*type="submit"[^>]*>Buscar<\/button>/);
  assert.match(html, /<p [^>]*id="inicio-error-busqueda"[^>]*role="alert"/);
});

test("bloques de reclamos y devoluciones con sus enlaces «Ver todos/as»", () => {
  const html = renderizarInicioSoporte();
  assert.match(html, /<h2[^>]*>Reclamos<\/h2>/);
  assert.match(html, /<h2[^>]*>Devoluciones<\/h2>/);
  assert.match(html, /<a [^>]*href="#\/reclamos"[^>]*>Ver todos<\/a>/);
  assert.match(html, /<a [^>]*href="#\/devoluciones"[^>]*>Ver todas<\/a>/);
});

test("ids con prefijo inicio- y sin repetidos en el DOM del panel de Soporte", () => {
  for (const id of idsDe(renderizarInicioSoporte())) assert.ok(id.startsWith("inicio-"), id);
  const modales = readFileSync(new URL("../../src/layout/plantillas/modales.html", import.meta.url), "utf-8");
  const dom = [
    renderizarBarraSuperior({ nombre: "Sol", rol: "SOPORTE" }),
    renderizarMenuLateral("SOPORTE"),
    renderizarInicioSoporte(),
    renderizarVistaSoporte(),
    modales,
  ].join("\n");
  const ids = idsDe(dom);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

// ---------- Indicadores ----------

test("indicadores con datos", () => {
  const html = renderizarIndicadoresSoporte({
    reclamos: { abiertos: 2, enAtencion: 1, escalados: 3 },
    devoluciones: { porAtender: 4 },
  });
  assert.equal(contar(html, /class="panel-kpi"/g), 4);
  assert.match(html, /Reclamos abiertos[\s\S]*?>2<[\s\S]*?Esperan primera respuesta/);
  assert.match(html, /En atención[\s\S]*?>1<[\s\S]*?En curso/);
  assert.match(html, /Escalados[\s\S]*?>3<[\s\S]*?Con el administrador/);
  assert.match(html, /Devoluciones por atender[\s\S]*?>4<[\s\S]*?Esperan decisión/);
});

test("si fallan los reclamos, sus 3 indicadores muestran «—» y «No se pudo cargar»", () => {
  const html = renderizarIndicadoresSoporte({ reclamos: null, devoluciones: { porAtender: 1 } });
  assert.equal(contar(html, />—</g), 3);
  assert.equal(contar(html, /No se pudo cargar/g), 3);
});

test("si fallan las devoluciones, solo su indicador muestra «—»", () => {
  const html = renderizarIndicadoresSoporte({ reclamos: { abiertos: 0, enAtencion: 0, escalados: 0 }, devoluciones: null });
  assert.equal(contar(html, />—</g), 1);
  assert.match(html, /Devoluciones por atender[\s\S]*?>—<[\s\S]*?No se pudo cargar/);
});

// ---------- Tabla de reclamos ----------

test("tabla de reclamos: columnas, «#{pedidoId}», insignias y acciones por estado", () => {
  const html = renderizarTablaReclamos(reclamos, 7);
  assert.match(html, /<table class="panel-tabla">/);
  assert.doesNotMatch(html, /class="table/);
  for (const col of ["Pedido", "Motivo", "Estado"]) assert.match(html, new RegExp(`<th scope="col">${col}</th>`));
  assert.match(html, /<th scope="col"><span class="visually-hidden">Acción<\/span><\/th>/);
  assert.match(html, /<th scope="row">#30<\/th>[\s\S]*?Llegó dañado[\s\S]*?panel-insignia-ambar[^>]*>Abierto</);
  assert.match(html, /<button [^>]*type="button"[^>]*data-tomar-reclamo="1"[^>]*>Atender<\/button>/);
  assert.match(html, /#31[\s\S]*?panel-insignia-azul[^>]*>En atención<[\s\S]*?<a [^>]*href="#\/reclamos"[^>]*>Responder<\/a>/);
  assert.match(html, /#32[\s\S]*?<a [^>]*href="#\/reclamos"[^>]*>Ver detalle<\/a>/);
  assert.match(html, /#33[\s\S]*?panel-insignia-rojo[^>]*>Escalado<[\s\S]*?Ver detalle/);
  assert.doesNotMatch(html, /<img/);
});

test("tabla de reclamos: como máximo 5 filas; vacía: «No hay reclamos abiertos.»", () => {
  const muchos = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, pedidoId: i, motivo: "m", estado: "ABIERTO" }));
  assert.equal(contar(renderizarTablaReclamos(muchos, 1), /<th scope="row">/g), 5);
  const vacia = renderizarTablaReclamos([], 1);
  assert.match(vacia, /No hay reclamos abiertos\./);
  assert.doesNotMatch(vacia, /<table/);
});

// ---------- Tabla de devoluciones ----------

test("tabla de devoluciones: producto (P9), insignias y enlaces que no hacen PUT", () => {
  const html = renderizarTablaDevoluciones(devoluciones);
  for (const col of ["Pedido", "Producto", "Estado"]) assert.match(html, new RegExp(`<th scope="col">${col}</th>`));
  assert.match(html, /<th scope="row">#40<\/th>[\s\S]*?Mouse &lt;b&gt;[\s\S]*?panel-insignia-ambar[^>]*>Solicitada<[\s\S]*?<a [^>]*href="#\/devoluciones"[^>]*>Evaluar<\/a>/);
  assert.match(html, /#41[\s\S]*?2 productos[\s\S]*?panel-insignia-verde[^>]*>Aprobada<[\s\S]*?<a [^>]*href="#\/devoluciones"[^>]*>Registrar recepción<\/a>/);
  assert.doesNotMatch(html, /<button/, "ninguna acción de devolución es un botón con petición");
});

test("tabla de devoluciones vacía: «No hay devoluciones por atender.»", () => {
  assert.match(renderizarTablaDevoluciones([]), /No hay devoluciones por atender\./);
});

test("en ningún sitio aparecen «En revisión» ni «Resolver»", () => {
  const todos = ["ABIERTO", "EN_ATENCION", "ESCALADO", "RESUELTO"].map((estado, i) => ({ id: i + 1, pedidoId: i, motivo: "m", estado }));
  const todas = ["SOLICITADA", "APROBADA", "RECHAZADA", "CERRADA"].map((estado, i) => ({ id: i + 1, pedidoId: i, estado, lineas: [] }));
  const html = [
    renderizarInicioSoporte(),
    renderizarIndicadoresSoporte({ reclamos: { abiertos: 1, enAtencion: 1, escalados: 1 }, devoluciones: { porAtender: 1 } }),
    renderizarTablaReclamos(todos, 1),
    renderizarTablaDevoluciones(todas),
  ].join("\n");
  assert.doesNotMatch(html, /En revisión/i);
  assert.doesNotMatch(html, /Resolver/i);
});
