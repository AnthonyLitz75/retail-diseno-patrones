// Panel del personal (spec 19, T08): marcado del Inicio de Soporte (spec 16 y decisiones de T08).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  renderizarInicioSoporte,
  renderizarIndicadoresSoporte,
  renderizarColaReclamos,
  renderizarDevolucionesPorAtender,
  renderizarEnManosDeOtros,
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
  assert.match(html, /<h2[^>]*>Tu cola de reclamos<\/h2>/);
  assert.match(html, /<h2[^>]*>Devoluciones por atender<\/h2>/);
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

const RECLAMOS_KPI = { abiertos: 2, enAtencion: 1, escalados: 3, propios: 1, deOtros: 0, masDe48h: 0 };
const DEVOLUCIONES_KPI = { porEvaluar: 3, porRecibir: 1, porAtender: 4 };

test("indicadores con datos", () => {
  const html = renderizarIndicadoresSoporte({ reclamos: RECLAMOS_KPI, devoluciones: DEVOLUCIONES_KPI });
  assert.equal(contar(html, /class="panel-kpi panel-kpi-icono"/g), 4);
  assert.match(html, /Reclamos abiertos[\s\S]*?>2<[\s\S]*?Esperan primera respuesta/);
  assert.match(html, /En atención[\s\S]*?>1<[\s\S]*?1 tuyo · 0 de otros/);
  assert.match(html, /Escalados[\s\S]*?>3<[\s\S]*?Con la administración/);
  assert.match(html, /Devoluciones por atender[\s\S]*?>4<[\s\S]*?3 por evaluar · 1 por recibir/);
});

test("si fallan los reclamos, sus 3 indicadores muestran «—» y «No se pudo cargar»", () => {
  const html = renderizarIndicadoresSoporte({ reclamos: null, devoluciones: DEVOLUCIONES_KPI });
  assert.equal(contar(html, />—</g), 3);
  assert.equal(contar(html, /No se pudo cargar/g), 3);
});

test("si fallan las devoluciones, solo su indicador muestra «—»", () => {
  const html = renderizarIndicadoresSoporte({ reclamos: { ...RECLAMOS_KPI, abiertos: 0, enAtencion: 0, escalados: 0 }, devoluciones: null });
  assert.equal(contar(html, />—</g), 1);
  assert.match(html, /Devoluciones por atender[\s\S]*?>—<[\s\S]*?No se pudo cargar/);
});

// ---------- Cola, otros y devoluciones (el detalle está en soporte-v2.test.mjs) ----------

test("cola de reclamos: como máximo 5 filas; vacía: «No tienes reclamos pendientes.»", () => {
  const muchos = Array.from({ length: 7 }, (_, i) => ({ id: i + 1, pedidoId: i, motivo: "m", estado: "ABIERTO" }));
  assert.equal(contar(renderizarColaReclamos(muchos, 1), /<th scope="row">/g), 5);
  const vacia = renderizarColaReclamos([], 1);
  assert.match(vacia, /No tienes reclamos pendientes\./);
  assert.doesNotMatch(vacia, /<table/);
});

test("cola: acciones por estado (Atender es un botón; Responder, un enlace) y el texto va escapado", () => {
  const html = renderizarColaReclamos(reclamos, 7);
  assert.match(html, /<table class="panel-tabla panel-reclamos-cola">/);
  assert.doesNotMatch(html, /class="table/);
  assert.match(html, /<th scope="row">#30<\/th>[\s\S]*?Llegó dañado[\s\S]*?panel-insignia-ambar[^>]*>Abierto</);
  assert.match(html, /<button [^>]*type="button"[^>]*data-tomar-reclamo="1"[^>]*>Atender<\/button>/);
  assert.match(html, /#31[\s\S]*?panel-insignia-azul[^>]*>En atención<[\s\S]*?<a [^>]*>Responder<\/a>/);
  assert.doesNotMatch(html, /#32/, "los EN_ATENCION de otros van a «En manos de otros»");
  assert.doesNotMatch(renderizarEnManosDeOtros(reclamos, 7), /<img/);
});

test("devoluciones por atender: producto (P9) y enlaces que no hacen PUT; vacío con verificación", () => {
  const html = renderizarDevolucionesPorAtender(devoluciones);
  assert.match(html, /Pedido #40[\s\S]*?Mouse &lt;b&gt;[\s\S]*?panel-insignia-ambar[^>]*>Solicitada<[\s\S]*?<a [^>]*>Evaluar<\/a>/);
  assert.match(html, /Pedido #41[\s\S]*?2 productos[\s\S]*?panel-insignia-verde[^>]*>Aprobada<[\s\S]*?<a [^>]*>Registrar recepción<\/a>/);
  assert.doesNotMatch(html, /<button/, "ninguna acción de devolución es un botón con petición");
  assert.match(renderizarDevolucionesPorAtender([]), /Todo al día: no hay devoluciones por atender\./);
});

test("en ningún sitio aparecen «En revisión» ni «Resolver»", () => {
  const todos = ["ABIERTO", "EN_ATENCION", "ESCALADO", "RESUELTO"].map((estado, i) => ({ id: i + 1, pedidoId: i, motivo: "m", estado }));
  const todas = ["SOLICITADA", "APROBADA", "RECHAZADA", "CERRADA"].map((estado, i) => ({ id: i + 1, pedidoId: i, estado, lineas: [] }));
  const html = [
    renderizarInicioSoporte(),
    renderizarIndicadoresSoporte({ reclamos: RECLAMOS_KPI, devoluciones: DEVOLUCIONES_KPI }),
    renderizarColaReclamos(todos, 1),
    renderizarEnManosDeOtros(todos, 1),
    renderizarDevolucionesPorAtender(todas),
  ].join("\n");
  assert.doesNotMatch(html, /En revisión/i);
  assert.doesNotMatch(html, /Resolver/i);
});
