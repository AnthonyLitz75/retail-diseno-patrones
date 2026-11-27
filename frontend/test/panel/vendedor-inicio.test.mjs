// Panel del personal (spec 19, T07): marcado del Inicio del Vendedor (spec 15 y decisiones de
// T07), ids únicos en el DOM del panel del Vendedor y aviso de cambios de productos.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  renderizarInicioVendedor,
  renderizarIndicadoresVendedor,
  renderizarTablaStockBajo,
  renderizarConsultas,
  renderizarCatalogo,
} from "../../src/panel/inicio/vendedor-inicio.js";
import { crearAvisoCambios } from "../../src/panel/cambios-productos.js";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import {
  renderizarVistaProductos,
  renderizarVistaPedidos,
  renderizarVistaConsultas,
  renderizarVistaInventario,
} from "../../src/layout/vistas-personal.js";

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const contar = (html, patron) => (html.match(patron) || []).length;

// ---------- Estructura ----------

test("encabezado: fecha de hoy, <h1> Inicio, apoyo, botones con icono y skeletons iniciales", () => {
  const html = renderizarInicioVendedor({ hoy: new Date(2026, 10, 26) });
  assert.match(html, /<p class="panel-fecha">Jueves 26 de noviembre<\/p>/);
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /Tu catálogo y lo que conviene reponer o responder hoy\./);
  assert.match(html, /<a [^>]*class="panel-boton panel-boton-secundario"[^>]*href="#\/productos"[^>]*>[\s\S]*?<span>Ver catálogo<\/span><\/a>/);
  assert.match(html, /<a [^>]*class="panel-boton panel-boton-principal"[^>]*href="#\/productos\?nuevo=1"[^>]*>[\s\S]*?<span>Nuevo producto<\/span><\/a>/);
  assert.equal(contar(html, /class="panel-kpi panel-esqueleto-kpi"/g), 4);
  assert.equal(contar(html, /class="panel-esqueleto-lista"/g), 3);
});

test("los bloques de la spec: stock bajo, consultas y catálogo", () => {
  const html = renderizarInicioVendedor();
  assert.match(html, /<h2[^>]*>Productos con stock bajo<\/h2>/);
  assert.match(html, /<h2[^>]*>Consultas de clientes<\/h2>/);
  assert.match(html, /<h2[^>]*>Catálogo<\/h2>/);
  assert.match(html, /<a [^>]*href="#\/productos"[^>]*>Administrar productos<\/a>/);
});

test("todos los ids del Inicio del Vendedor llevan el prefijo inicio-", () => {
  for (const id of idsDe(renderizarInicioVendedor())) assert.ok(id.startsWith("inicio-"), id);
});

test("no hay ids repetidos en el DOM del panel del Vendedor (marco, Inicio, vistas y modales)", () => {
  const modales = readFileSync(new URL("../../src/layout/plantillas/modales.html", import.meta.url), "utf-8");
  const dom = [
    renderizarBarraSuperior({ nombre: "Vera", rol: "VENDEDOR" }),
    renderizarMenuLateral("VENDEDOR"),
    renderizarInicioVendedor(),
    renderizarVistaProductos(),
    renderizarVistaPedidos(),
    renderizarVistaConsultas(),
    renderizarVistaInventario(),
    modales,
  ].join("\n");
  const ids = idsDe(dom);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

// ---------- Indicadores ----------

test("indicadores con datos de las dos fuentes: iconos, alerta de stock bajo y enlace Reponer ahora", () => {
  const html = renderizarIndicadoresVendedor({
    productos: { activos: 12, desactivados: 3, stockBajo: 2 },
    preguntas: { pendientes: 4 },
  });
  assert.equal(contar(html, /<article class="panel-kpi (panel-kpi-icono|panel-kpi-alerta)"/g), 4);
  assert.match(html, /panel-kpi-alerta[\s\S]*?Stock bajo[\s\S]*?>2<[\s\S]*?Reponer ahora/);
  assert.match(html, /Productos activos[\s\S]*?>12<[\s\S]*?Visibles en la tienda/);
  assert.match(html, /Desactivados[\s\S]*?>3<[\s\S]*?Ocultos para los clientes/);
  assert.match(html, /Preguntas pendientes[\s\S]*?>4<[\s\S]*?Esperan tu respuesta/);
  const sinStockBajo = renderizarIndicadoresVendedor({
    productos: { activos: 12, desactivados: 0, stockBajo: 0 },
    preguntas: { pendientes: 0 },
  });
  assert.doesNotMatch(sinStockBajo, /panel-kpi-alerta/);
  assert.match(renderizarIndicadoresVendedor({ productos: null, preguntas: { pendientes: 0 } }), /Todo respondido/);
});

test("si falla gestion: sus tres indicadores muestran «—» y «No se pudo cargar»; preguntas sigue", () => {
  const html = renderizarIndicadoresVendedor({ productos: null, preguntas: { pendientes: 1 } });
  assert.equal(contar(html, />—</g), 3);
  assert.equal(contar(html, /No se pudo cargar/g), 3);
  assert.match(html, /Preguntas pendientes[\s\S]*?>1</);
});

test("si fallan preguntas: solo su indicador muestra «—» y «No se pudo cargar»", () => {
  const html = renderizarIndicadoresVendedor({ productos: { activos: 1, desactivados: 0, stockBajo: 0 }, preguntas: null });
  assert.equal(contar(html, />—</g), 1);
  assert.match(html, /Preguntas pendientes[\s\S]*?>—<[\s\S]*?No se pudo cargar/);
});

// ---------- Tabla de stock bajo ----------

const bajos = [
  { id: 2, nombre: "Mouse", stock: 0 },
  { id: 4, nombre: "Audífonos", stock: 3 },
];

test("tabla de stock bajo: clase propia del panel, encabezados y acción oculta para lectores", () => {
  const html = renderizarTablaStockBajo(bajos, 2);
  assert.match(html, /<div class="panel-tabla-contenedor">\s*<table class="panel-tabla panel-tabla-stock">/);
  assert.doesNotMatch(html, /class="table/, "las tablas nuevas no usan .table");
  assert.match(html, /<th scope="col">Producto<\/th>/);
  assert.match(html, /<th scope="col" class="panel-num">Stock<\/th>/);
  assert.match(html, /<th scope="col">Estado<\/th>/);
  assert.match(html, /<th scope="col"><span class="visually-hidden">Acción<\/span><\/th>/);
  assert.match(html, /<th scope="row">Mouse<\/th>[\s\S]*?panel-insignia-rojo[^>]*>Agotado</);
  assert.match(html, /<th scope="row">Audífonos<\/th>[\s\S]*?panel-insignia-ambar[^>]*>Stock bajo</);
  assert.match(html, /<button [^>]*type="button"[^>]*class="panel-boton panel-boton-principal"[^>]*data-ajustar-stock="2"[^>]*>Ajustar stock<\/button>/);
  assert.match(html, /<button [^>]*type="button"[^>]*class="panel-boton panel-boton-secundario"[^>]*data-ajustar-stock="4"[^>]*>Ajustar stock<\/button>/);

  const conMeta = renderizarTablaStockBajo([{ id: 9, sku: "PA-0010", categoria: "Teclados", nombre: "Teclado Pro", stock: 0 }], 1);
  assert.match(conMeta, /<span class="panel-stock-nombre">Teclado Pro<\/span><span class="panel-stock-meta">PA-0010 · Teclados<\/span>/);
});

test("tabla de stock bajo: como máximo 5 filas; «Ver los {n}» usa el total", () => {
  const ocho = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nombre: `P${i + 1}`, stock: 1 }));
  const html = renderizarTablaStockBajo(ocho, 8);
  assert.equal(contar(html, /<tr>\s*<th scope="row">/g), 5);
  assert.match(html, /<a [^>]*href="#\/productos\?pestana=stock-bajo"[^>]*>Ver los 8<\/a>/);
});

test("tabla de stock bajo vacía: recuadro positivo «Ningún producto con stock bajo.» y sin enlace", () => {
  const html = renderizarTablaStockBajo([], 0);
  assert.match(html, /class="panel-vacio-ok"/);
  assert.match(html, /Ningún producto con stock bajo\./);
  assert.doesNotMatch(html, /Ver los/);
  assert.doesNotMatch(html, /<table/);
});

test("tabla de stock bajo: escapa los nombres", () => {
  assert.doesNotMatch(renderizarTablaStockBajo([{ id: 1, nombre: "<b>x</b>", stock: 1 }], 1), /<b>x/);
});

// ---------- Consultas ----------

test("consultas: hasta 3, con producto, cliente, espera, texto resumido, «Responder» y «Ver todas»", () => {
  const ahora = new Date("2026-11-20T12:00:00Z");
  const preguntas = [
    { idConsulta: 1, productoId: 2, nombreProducto: "Mouse", clienteNombre: "Ana", pregunta: "¿Es inalámbrico?", creadaEn: "2026-11-18T00:00:00Z" },
    { idConsulta: 2, productoId: 4, pregunta: "x".repeat(100), creadaEn: "2026-11-19T00:00:00Z" },
    { idConsulta: 3, productoId: 99, pregunta: "<script>alert(1)</script>", creadaEn: "2026-11-20T00:00:00Z" },
    { idConsulta: 4, productoId: 2, pregunta: "Cuarta", creadaEn: "2026-11-21T00:00:00Z" },
  ];
  const html = renderizarConsultas(preguntas, [{ id: 4, nombre: "Audífonos" }], ahora);
  assert.equal(contar(html, /<li /g), 3);
  assert.match(html, />Mouse</);
  assert.match(html, /· Ana/);
  assert.match(html, /panel-espera panel-espera-rojo/);
  assert.match(html, />Audífonos</);
  assert.match(html, />Producto #99</);
  assert.match(html, /x{79}…/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /Cuarta/);
  assert.equal(contar(html, /panel-boton panel-boton-principal"[^>]*href="#\/consultas\?consulta=1"[^>]*>Responder<\/a>/g), 1);
  assert.equal(contar(html, /<a [^>]*href="#\/consultas\?consulta=\d+"[^>]*>Responder<\/a>/g), 3);
  assert.match(html, /<a [^>]*href="#\/consultas"[^>]*>Ver todas<\/a>/);
});

test("consultas vacías: recuadro «No hay preguntas pendientes» con su línea de ayuda", () => {
  const html = renderizarConsultas([], []);
  assert.match(html, /No hay preguntas pendientes/);
  assert.match(html, /Cuando un cliente pregunte por un producto, aparecerá aquí para que lo respondas\./);
  assert.doesNotMatch(html, /Responder/);
});

// ---------- Catálogo ----------

test("catálogo: barra segmentada y casillas con enlace a su pestaña correspondiente", () => {
  const html = renderizarCatalogo([
    { id: 1, stock: 12, activo: true },
    { id: 2, stock: 3, activo: true },
    { id: 3, stock: 0, activo: true },
    { id: 4, stock: 5, activo: false },
  ]);
  assert.match(html, /<div class="panel-segmentos" aria-hidden="true">/);
  assert.equal(contar(html, /class="panel-segmento /g), 4);
  assert.match(html, /href="#\/productos\?pestana=activos"[^>]*>En stock<\/a><span class="panel-estado-numero">1</);
  assert.match(html, /href="#\/productos\?pestana=stock-bajo"[^>]*>Stock bajo<\/a><span class="panel-estado-numero">1</);
  assert.match(html, /href="#\/productos\?pestana=stock-bajo"[^>]*>Agotado<\/a><span class="panel-estado-numero">1</);
  assert.match(html, /href="#\/productos\?pestana=desactivados"[^>]*>Desactivados<\/a><span class="panel-estado-numero">1</);
  assert.doesNotMatch(html, /Aún no hay productos/);
});

test("catálogo sin productos: muestra «Aún no hay productos.»", () => {
  const html = renderizarCatalogo([]);
  assert.match(html, /Aún no hay productos\./);
  assert.doesNotMatch(html, /panel-segmentos/);
});

// ---------- Aviso de cambios de productos ----------

test("el aviso de cambios llama a cada suscriptor con el origen y permite cancelar", () => {
  const aviso = crearAvisoCambios();
  const recibidos = [];
  const cancelar = aviso.suscribir((origen) => recibidos.push(["a", origen]));
  aviso.suscribir((origen) => recibidos.push(["b", origen]));
  aviso.avisar("modal");
  cancelar();
  aviso.avisar("productos");
  assert.deepEqual(recibidos, [["a", "modal"], ["b", "modal"], ["b", "productos"]]);
});

test("un suscriptor que falla no impide avisar a los demás", () => {
  const aviso = crearAvisoCambios();
  let llamado = false;
  aviso.suscribir(() => { throw new Error("roto"); });
  aviso.suscribir(() => { llamado = true; });
  aviso.avisar("modal");
  assert.equal(llamado, true);
});
