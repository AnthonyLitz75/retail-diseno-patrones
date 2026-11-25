// Panel del personal: rediseño del Inicio de Soporte (fecha, indicadores con icono, espera, cola
// propia, «En manos de otros» y devoluciones por atender). Datos como los del escenario demo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  accionDevolucionInicio, accionReclamoInicio, colaReclamos, esperaDe, indicadoresDevoluciones, indicadoresReclamos,
  reclamosEnManosDeOtros,
} from "../../src/panel/inicio/soporte-logica.js";
import {
  renderizarColaReclamos, renderizarDevolucionesPorAtender, renderizarEnManosDeOtros, renderizarIndicadoresSoporte,
  renderizarInicioSoporte,
} from "../../src/panel/inicio/soporte-inicio.js";
import { ICONOS } from "../../src/panel/iconos.js";
import { resolverRuta } from "../../src/panel/panel-router.js";
import { relacionContraste } from "../../src/panel/contraste.js";

const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf8");
const visible = (html) => html.replaceAll("&#x2F;", "/");
const contar = (texto, re) => (texto.match(re) ?? []).length;
const AHORA = new Date("2026-11-25T12:00:00Z");
const haceH = (h) => new Date(AHORA.getTime() - h * 3600_000).toISOString();

function bloquesMedia(consulta) {
  let salida = "";
  let desde = 0;
  for (;;) {
    const i = css.indexOf(`@media ${consulta}`, desde);
    if (i < 0) break;
    const abre = css.indexOf("{", i);
    let nivel = 1;
    let j = abre + 1;
    while (nivel > 0 && j < css.length) {
      if (css[j] === "{") nivel += 1;
      else if (css[j] === "}") nivel -= 1;
      j += 1;
    }
    salida += css.slice(abre + 1, j - 1);
    desde = j;
  }
  assert.ok(salida, `falta @media ${consulta}`);
  return salida;
}
function reglaEn(texto, selector) {
  const cuerpos = [];
  for (const m of texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return cuerpos.join(" ");
}
const regla = (selector) => reglaEn(css, selector);

// Datos del escenario demo vistos por Andrea (usuario 4); Javier es el 5.
const ANDREA = 4;
const reclamos = [
  { id: 1, pedidoId: 2, motivo: "Producto defectuoso", estado: "EN_ATENCION", soporteId: ANDREA, creadoEn: haceH(215) },
  { id: 2, pedidoId: 3, motivo: "Producto dañado en el envío", estado: "EN_ATENCION", soporteId: 5, creadoEn: haceH(190) },
  { id: 3, pedidoId: 5, motivo: "Producto incompatible", estado: "RESUELTO", soporteId: 5, creadoEn: haceH(150) },
  { id: 4, pedidoId: 7, motivo: "Cobro incorrecto", estado: "ESCALADO", soporteId: ANDREA, creadoEn: haceH(110) },
  { id: 5, pedidoId: 6, motivo: "Retraso en la entrega", estado: "ABIERTO", creadoEn: haceH(60) },
  { id: 6, pedidoId: 9, motivo: "Producto incompleto", estado: "ABIERTO", creadoEn: haceH(6) },
];
const devoluciones = [
  { id: 2, pedidoId: 4, estado: "APROBADA", creadoEn: haceH(100), lineas: [{ nombreProducto: "Memoria RAM Fury Beast 16 GB DDR4 3200 MHz" }] },
  { id: 4, pedidoId: 8, estado: "SOLICITADA", creadoEn: haceH(30), lineas: [{ nombreProducto: "A" }, { nombreProducto: "B" }] },
  { id: 3, pedidoId: 6, estado: "RECHAZADA", creadoEn: haceH(90), lineas: [] },
];

// ---------- A3. Espera ----------

test("A3: espera en los límites (23:59 h, 24 h, 48 h, 72 h) con su texto y nivel", () => {
  const caso = (min) => esperaDe(new Date(AHORA.getTime() - min * 60_000).toISOString(), AHORA);
  assert.deepEqual([caso(5).texto, caso(5).nivel], ["hace 5 min", "normal"]);
  assert.deepEqual([caso(59).texto, caso(59).nivel], ["hace 59 min", "normal"]);
  assert.deepEqual([caso(60).texto, caso(60).nivel], ["hace 1 h", "normal"]);
  assert.deepEqual([caso(23 * 60 + 59).texto, caso(23 * 60 + 59).nivel], ["hace 23 h", "normal"]);
  assert.deepEqual([caso(24 * 60).texto, caso(24 * 60).nivel], ["hace 24 h", "ambar"]);
  assert.deepEqual([caso(47 * 60 + 59).texto, caso(47 * 60 + 59).nivel], ["hace 47 h", "ambar"]);
  assert.deepEqual([caso(48 * 60).texto, caso(48 * 60).nivel], ["hace 48 h", "rojo"]);
  assert.deepEqual([caso(71 * 60 + 59).texto, caso(71 * 60 + 59).nivel], ["hace 71 h", "rojo"]);
  assert.deepEqual([caso(72 * 60).texto, caso(72 * 60).nivel], ["hace 3 días", "rojo"]);
  assert.deepEqual([caso(9 * 24 * 60 + 100).texto, caso(9 * 24 * 60 + 100).nivel], ["hace 9 días", "rojo"]);
});

test("A3: sin fecha válida la espera no falla", () => {
  assert.deepEqual(esperaDe(null, AHORA), { texto: "—", nivel: "normal", horas: null });
  assert.equal(esperaDe("no es fecha", AHORA).nivel, "normal");
});

test("A3: colores de la etiqueta de espera con contraste ≥ 4,5:1", () => {
  const pares = {
    normal: [/background:\s*#f1f5f9/i, /color:\s*#475569/i, "#475569", "#f1f5f9"],
    ambar: [/background:\s*#fef3c7/i, /color:\s*#92400e/i, "#92400e", "#fef3c7"],
    rojo: [/background:\s*#fee2e2/i, /color:\s*#b91c1c/i, "#b91c1c", "#fee2e2"],
  };
  for (const [nivel, [fondo, texto, tc, fc]] of Object.entries(pares)) {
    const r = regla(`.panel-espera-${nivel}`);
    assert.match(r, fondo, nivel);
    assert.match(r, texto, nivel);
    assert.ok(relacionContraste(tc, fc) >= 4.5, nivel);
  }
  assert.ok(ICONOS.reloj, "icono de reloj");
});

// ---------- A4/A5. Cola y manos de otros ----------

test("A4: la cola son los ABIERTO y los EN_ATENCION propios, del más antiguo al más reciente", () => {
  assert.deepEqual(colaReclamos(reclamos, ANDREA).map((r) => r.id), [1, 5, 6]);
  assert.deepEqual(colaReclamos(reclamos, 5).map((r) => r.id), [2, 5, 6]);
});

test("A5: en manos de otros: EN_ATENCION de otros agentes y ESCALADO, del más antiguo al más reciente", () => {
  assert.deepEqual(reclamosEnManosDeOtros(reclamos, ANDREA).map((r) => r.id), [2, 4]);
  assert.deepEqual(reclamosEnManosDeOtros(reclamos, 5).map((r) => r.id), [1, 4]);
});

test("A4: acciones del Inicio llevan #/reclamos?id= y #/devoluciones?id=", () => {
  assert.deepEqual(accionReclamoInicio(reclamos[0], ANDREA), { tipo: "enlace", texto: "Responder", ruta: "#/reclamos?id=1" });
  assert.deepEqual(accionReclamoInicio(reclamos[1], ANDREA), { tipo: "enlace", texto: "Ver detalle", ruta: "#/reclamos?id=2" });
  assert.equal(accionReclamoInicio(reclamos[4], ANDREA).tipo, "tomar");
  assert.deepEqual(accionDevolucionInicio(devoluciones[0]), { texto: "Registrar recepción", ruta: "#/devoluciones?id=2" });
  assert.deepEqual(accionDevolucionInicio(devoluciones[1]), { texto: "Evaluar", ruta: "#/devoluciones?id=4" });
});

test("el parámetro id de #/reclamos y #/devoluciones llega a la pantalla", () => {
  assert.deepEqual(resolverRuta("#/reclamos?id=4", "SOPORTE").parametros, { id: "4" });
  assert.deepEqual(resolverRuta("#/devoluciones?id=2", "SOPORTE").parametros, { id: "2" });
});

// ---------- A2. Indicadores ----------

test("A2: indicadores con datos del escenario: valores y detalles", () => {
  const r = indicadoresReclamos(reclamos, ANDREA, AHORA);
  assert.deepEqual(r, { abiertos: 2, enAtencion: 2, escalados: 1, propios: 1, deOtros: 1, masDe48h: 1 });
  const d = indicadoresDevoluciones(devoluciones);
  assert.deepEqual(d, { porEvaluar: 1, porRecibir: 1, porAtender: 2 });
  const html = renderizarIndicadoresSoporte({ reclamos: r, devoluciones: d });
  assert.equal(contar(html, /<article class="panel-kpi panel-kpi-(icono|urgente)"/g), 4);
  assert.equal(contar(html, /class="panel-icono-cuadro panel-icono-/g), 4);
  assert.match(html, /Reclamos abiertos[\s\S]*?>2<[\s\S]*?1 lleva más de 48 h/);
  assert.match(html, /En atención[\s\S]*?>2<[\s\S]*?1 tuyo · 1 de otros/);
  assert.match(html, /Escalados[\s\S]*?>1<[\s\S]*?Con la administración/);
  assert.match(html, /Devoluciones por atender[\s\S]*?>2<[\s\S]*?1 por evaluar · 1 por recibir/);
});

test("A2: reclamos abiertos en alerta solo si alguno lleva más de 48 h; plurales con la utilidad común", () => {
  const sin = renderizarIndicadoresSoporte({
    reclamos: indicadoresReclamos([reclamos[5]], ANDREA, AHORA), devoluciones: { porEvaluar: 0, porRecibir: 0, porAtender: 0 },
  });
  assert.doesNotMatch(sin, /panel-kpi-urgente/);
  assert.match(sin, /Esperan primera respuesta/);
  const dos = [{ ...reclamos[4], creadoEn: haceH(60) }, { ...reclamos[5], creadoEn: haceH(50) }];
  const html = renderizarIndicadoresSoporte({ reclamos: indicadoresReclamos(dos, ANDREA, AHORA), devoluciones: null });
  assert.match(html, /<article class="panel-kpi panel-kpi-urgente">[\s\S]*?Reclamos abiertos/);
  assert.match(html, /2 llevan más de 48 h/);
  const exacto = indicadoresReclamos([{ ...reclamos[4], creadoEn: haceH(48) }], ANDREA, AHORA);
  assert.equal(exacto.masDe48h, 0, "«más de 48 h» es estrictamente mayor");
});

test("A2: iconos y colores de los cuatro indicadores", () => {
  const html = renderizarIndicadoresSoporte({
    reclamos: { abiertos: 0, enAtencion: 0, escalados: 0, propios: 0, deOtros: 0, masDe48h: 0 },
    devoluciones: { porEvaluar: 0, porRecibir: 0, porAtender: 0 },
  });
  assert.match(html, /panel-icono-rojo[\s\S]*?Reclamos abiertos/);
  assert.match(html, /panel-icono-azul[\s\S]*?En atención/);
  assert.match(html, /panel-icono-ambar[\s\S]*?Escalados/);
  assert.match(html, /panel-icono-verde[\s\S]*?Devoluciones por atender/);
  const alerta = regla(".panel-kpi-urgente");
  assert.match(alerta, /background:\s*#fff7ed/i);
  assert.match(alerta, /border-color:\s*#fdba74/i);
  assert.match(regla(".panel-kpi-urgente .panel-kpi-etiqueta"), /color:\s*#7c2d12/i);
  assert.ok(relacionContraste("#7c2d12", "#fff7ed") >= 4.5);
});

test("A2: indicadores con la fuente caída muestran «—»", () => {
  const html = renderizarIndicadoresSoporte({ reclamos: null, devoluciones: { porEvaluar: 1, porRecibir: 0, porAtender: 1 } });
  assert.equal(contar(html, />—</g), 3);
  assert.equal(contar(html, /No se pudo cargar/g), 3);
});

// ---------- A1. Encabezado ----------

test("A1: fecha de hoy sobre el <h1> y búsqueda a la derecha", () => {
  const html = renderizarInicioSoporte({ hoy: new Date(2026, 10, 25) });
  assert.match(html, /<p class="panel-fecha">Miércoles 25 de noviembre<\/p>\s*<h1 class="panel-titulo">Inicio<\/h1>/);
  assert.ok(html.indexOf("panel-fecha") < html.indexOf("<h1"));
  assert.ok(html.indexOf("<h1") < html.indexOf('id="inicio-form-busqueda"'));
  assert.match(html, /Tu cola de reclamos/);
  assert.match(html, /Lo más antiguo primero\. Pasadas 24 h la espera se marca en ámbar y pasadas 48 h en rojo\./);
});

// ---------- A4. Cola ----------

test("A4: cola con columnas, pedido como <th scope=row>, espera con icono y solo la primera fila con botón primario", () => {
  const html = visible(renderizarColaReclamos(reclamos, ANDREA, AHORA));
  for (const col of ["Pedido", "Cliente y motivo", "Espera", "Estado"]) assert.match(html, new RegExp(`<th scope="col">${col}</th>`), col);
  assert.match(html, /<th scope="col"><span class="visually-hidden">Acción<\/span><\/th>/);
  assert.deepEqual([...html.matchAll(/<th scope="row">#(\d+)<\/th>/g)].map((m) => m[1]), ["2", "6", "9"]);
  assert.match(html, /<span class="panel-espera panel-espera-rojo"><svg[\s\S]*?<\/svg>hace 8 días<\/span>/);
  assert.match(html, /hace 6 h<\/span>/);
  assert.equal(contar(html, /panel-boton-principal/g), 1, "solo un botón primario");
  assert.match(html, /<th scope="row">#2<\/th>[\s\S]*?<a [^>]*panel-boton-principal[^>]*href="#\/reclamos\?id=1"[^>]*>Responder<\/a>/);
  assert.match(html, /<button [^>]*panel-boton-secundario[^>]*data-tomar-reclamo="5"[^>]*>Atender<\/button>/);
  assert.match(html, /<button [^>]*data-tomar-reclamo="6"[^>]*>Atender<\/button>/);
  assert.match(html, /panel-insignia-azul[^>]*>En atención/);
});

test("A4: cliente en negrita con el motivo debajo; sin nombre, solo el motivo (el DTO de reclamo no trae el nombre)", () => {
  const sin = renderizarColaReclamos(reclamos, ANDREA, AHORA);
  assert.doesNotMatch(sin, /panel-reclamos-cliente/);
  assert.match(sin, /<span class="panel-reclamos-motivo">Producto defectuoso<\/span>/);
  const con = renderizarColaReclamos([reclamos[4]], ANDREA, AHORA, new Map([[6, "Valeria Rojas Nieto"]]));
  assert.match(con, /<span class="panel-reclamos-cliente">Valeria Rojas Nieto<\/span>\s*<span class="panel-reclamos-motivo">Retraso en la entrega<\/span>/);
});

test("A4: cola vacía y escape de texto", () => {
  assert.match(renderizarColaReclamos([], ANDREA, AHORA), /No tienes reclamos pendientes\./);
  const html = renderizarColaReclamos([{ ...reclamos[4], motivo: "<img src=x>" }], ANDREA, AHORA);
  assert.doesNotMatch(html, /<img/);
});

test("A5: «En manos de otros»: pedido, motivo, quién decide, insignia y «Ver detalle»; vacío no se muestra", () => {
  const html = visible(renderizarEnManosDeOtros(reclamos, ANDREA));
  assert.match(html, /<section class="panel-otros"[^>]*>[\s\S]*?En manos de otros/);
  assert.match(html, /#3[\s\S]*?Producto dañado en el envío[\s\S]*?Lo atiende otro agente[\s\S]*?panel-insignia-azul[^>]*>En atención[\s\S]*?href="#\/reclamos\?id=2"[^>]*>Ver detalle/);
  assert.match(html, /#7[\s\S]*?Cobro incorrecto[\s\S]*?Decide la administración[\s\S]*?panel-insignia-rojo[^>]*>Escalado[\s\S]*?href="#\/reclamos\?id=4"/);
  assert.equal(renderizarEnManosDeOtros([reclamos[4]], ANDREA), "");
  assert.match(regla(".panel-otros"), /background:\s*#f8fafc/i);
});

// ---------- A6. Devoluciones ----------

test("A6: devoluciones por atender: icono de caja, «Pedido #n», producto, espera, insignia y botón de contorno", () => {
  const html = visible(renderizarDevolucionesPorAtender(devoluciones, AHORA));
  assert.deepEqual([...html.matchAll(/Pedido #(\d+)/g)].map((m) => m[1]), ["4", "8"]);
  assert.match(html, /Pedido #4[\s\S]*?Memoria RAM Fury Beast 16 GB DDR4 3200 MHz[\s\S]*?panel-espera[^>]*>[\s\S]*?hace 4 días[\s\S]*?panel-insignia-verde[^>]*>Aprobada[\s\S]*?panel-boton-secundario[^>]*href="#\/devoluciones\?id=2"[^>]*>Registrar recepción/);
  assert.match(html, /Pedido #8[\s\S]*?2 productos[\s\S]*?panel-insignia-ambar[^>]*>Solicitada[\s\S]*?href="#\/devoluciones\?id=4"[^>]*>Evaluar/);
  assert.equal(contar(html, /panel-icono-cuadro/g), 2);
  assert.doesNotMatch(html, /panel-boton-principal/);
});

test("A6: sin devoluciones, estado vacío con icono de verificación", () => {
  const html = renderizarDevolucionesPorAtender([devoluciones[2]], AHORA);
  assert.match(html, /<div class="panel-vacio-ok">[\s\S]*?<svg[\s\S]*?Todo al día: no hay devoluciones por atender\./);
  assert.ok(ICONOS.verificacion);
});

// ---------- A7. Celular ----------

test("A7: celular: indicadores 2 × 2 sin iconos y la cola como tarjetas", () => {
  const m = bloquesMedia("(max-width: 575.98px)");
  assert.match(reglaEn(m, ".panel-kpi > .panel-icono-cuadro"), /display:\s*none/);
  assert.match(reglaEn(m, ".panel-reclamos-cola tr"), /display:\s*grid/);
  assert.match(reglaEn(m, ".panel-reclamos-cola thead"), /display:\s*none|position:\s*absolute/);
  assert.match(reglaEn(m, ".panel-reclamos-cola .panel-boton"), /width:\s*100%/);
  assert.match(css, /@media \(max-width: 991\.98px\)\s*\{[^@]*\.panel-kpis\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});
