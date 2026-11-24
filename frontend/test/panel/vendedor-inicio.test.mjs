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

test("encabezado: <h1> Inicio, apoyo y los botones «Ver catálogo» y «Nuevo producto»", () => {
  const html = renderizarInicioVendedor();
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /Tu catálogo y lo que conviene reponer o responder hoy\./);
  assert.match(html, /<a [^>]*class="panel-boton panel-boton-secundario"[^>]*href="#\/productos"[^>]*>Ver catálogo<\/a>/);
  assert.match(html, /<a [^>]*class="panel-boton panel-boton-principal"[^>]*href="#\/productos\?nuevo=1"[^>]*>Nuevo producto<\/a>/);
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

test("indicadores con datos de las dos fuentes", () => {
  const html = renderizarIndicadoresVendedor({
    productos: { activos: 12, desactivados: 3, stockBajo: 2 },
    preguntas: { pendientes: 4 },
  });
  assert.equal(contar(html, /class="panel-kpi"/g), 4);
  assert.match(html, /Productos activos[\s\S]*?>12<[\s\S]*?Visibles en la tienda/);
  assert.match(html, /Desactivados[\s\S]*?>3<[\s\S]*?Ocultos para los clientes/);
  assert.match(html, /Stock bajo[\s\S]*?>2<[\s\S]*?Por debajo del mínimo/);
  assert.match(html, /Preguntas pendientes[\s\S]*?>4<[\s\S]*?Esperan tu respuesta/);
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
  assert.match(html, /<div class="panel-tabla-contenedor">\s*<table class="panel-tabla">/);
  assert.doesNotMatch(html, /class="table/, "las tablas nuevas no usan .table");
  assert.match(html, /<th scope="col">Producto<\/th>/);
  assert.match(html, /<th scope="col" class="panel-num">Stock<\/th>/);
  assert.match(html, /<th scope="col">Estado<\/th>/);
  assert.match(html, /<th scope="col"><span class="visually-hidden">Acción<\/span><\/th>/);
  assert.match(html, /<th scope="row">Mouse<\/th>[\s\S]*?panel-insignia-rojo[^>]*>Agotado</);
  assert.match(html, /<th scope="row">Audífonos<\/th>[\s\S]*?panel-insignia-ambar[^>]*>Stock bajo</);
  assert.match(html, /<button [^>]*type="button"[^>]*data-ajustar-stock="2"[^>]*>Ajustar stock<\/button>/);
});

test("tabla de stock bajo: como máximo 5 filas; «Ver los {n}» usa el total", () => {
  const ocho = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nombre: `P${i + 1}`, stock: 1 }));
  const html = renderizarTablaStockBajo(ocho, 8);
  assert.equal(contar(html, /<tr>\s*<th scope="row">/g), 5);
  assert.match(html, /<a [^>]*href="#\/productos"[^>]*>Ver los 8<\/a>/);
});

test("tabla de stock bajo vacía: «Ningún producto con stock bajo.» y sin enlace", () => {
  const html = renderizarTablaStockBajo([], 0);
  assert.match(html, /Ningún producto con stock bajo\./);
  assert.doesNotMatch(html, /Ver los/);
  assert.doesNotMatch(html, /<table/);
});

test("tabla de stock bajo: escapa los nombres", () => {
  assert.doesNotMatch(renderizarTablaStockBajo([{ id: 1, nombre: "<b>x</b>", stock: 1 }], 1), /<b>x/);
});

// ---------- Consultas ----------

test("consultas: hasta 3, con producto, texto resumido, «Responder» y «Ver todas»", () => {
  const preguntas = [
    { idConsulta: 1, productoId: 2, nombreProducto: "Mouse", pregunta: "¿Es inalámbrico?", creadaEn: "2026-11-18T00:00:00Z" },
    { idConsulta: 2, productoId: 4, pregunta: "x".repeat(100), creadaEn: "2026-11-19T00:00:00Z" },
    { idConsulta: 3, productoId: 99, pregunta: "<script>alert(1)</script>", creadaEn: "2026-11-20T00:00:00Z" },
    { idConsulta: 4, productoId: 2, pregunta: "Cuarta", creadaEn: "2026-11-21T00:00:00Z" },
  ];
  const html = renderizarConsultas(preguntas, [{ id: 4, nombre: "Audífonos" }]);
  assert.equal(contar(html, /<li /g), 3);
  assert.match(html, />Mouse</);
  assert.match(html, />Audífonos</);
  assert.match(html, />Producto #99</);
  assert.match(html, /x{79}…/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /Cuarta/);
  assert.equal(contar(html, /<a [^>]*href="#\/consultas"[^>]*>Responder<\/a>/g), 3);
  assert.match(html, /<a [^>]*href="#\/consultas"[^>]*>Ver todas<\/a>/);
});

test("consultas vacías: recuadro «No hay preguntas pendientes» con su línea de ayuda", () => {
  const html = renderizarConsultas([], []);
  assert.match(html, /No hay preguntas pendientes/);
  assert.match(html, /Cuando un cliente pregunte por un producto, aparecerá aquí para que lo respondas\./);
  assert.doesNotMatch(html, /Responder/);
});

// ---------- Catálogo ----------

test("catálogo: barras con texto, ancho proporcional y la parte visual oculta a lectores", () => {
  const html = renderizarCatalogo({ activos: 12, desactivados: 3 });
  assert.match(html, /Activos · 12/);
  assert.match(html, /Desactivados · 3/);
  assert.match(html, /<div class="panel-barra-relleno panel-barra-verde" style="width: 80%"><\/div>/);
  assert.match(html, /<div class="panel-barra-relleno panel-barra-gris" style="width: 20%"><\/div>/);
  assert.equal(contar(html, /class="panel-barra" aria-hidden="true"/g), 2);
  assert.doesNotMatch(html, /Aún no hay productos/);
});

test("catálogo sin productos: barras al 0 % y «Aún no hay productos.»", () => {
  const html = renderizarCatalogo({ activos: 0, desactivados: 0 });
  assert.equal(contar(html, /style="width: 0%"/g), 2);
  assert.match(html, /Aún no hay productos\./);
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
