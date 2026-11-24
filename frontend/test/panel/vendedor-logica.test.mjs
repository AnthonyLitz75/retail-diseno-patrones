// Panel del personal (spec 19, T07): lógica pura del Inicio del Vendedor (spec 15).
import test from "node:test";
import assert from "node:assert/strict";
import {
  indicadoresProductos,
  productosStockBajo,
  estadoStockBajo,
  preguntasMasAntiguas,
  resumirTexto,
  nombreProductoPregunta,
  barrasCatalogo,
  detallePreguntas,
  MAX_FILAS_STOCK_BAJO,
  MAX_PREGUNTAS_INICIO,
  MAX_TEXTO_PREGUNTA,
} from "../../src/panel/inicio/vendedor-logica.js";
import { contarPestanas, UMBRAL_STOCK_BAJO } from "../../src/catalogo/gestion/panel-productos.js";

const productos = [
  { id: 1, nombre: "Teclado", stock: 22, activo: true },
  { id: 2, nombre: "Mouse", stock: 0, activo: true },
  { id: 3, nombre: "Webcam", stock: 5, activo: true },
  { id: 4, nombre: "Audífonos", stock: 3, activo: true },
  { id: 5, nombre: "Antiguo", stock: 1, activo: false },
  { id: 6, nombre: "Cargador", stock: 6, activo: true },
];

test("indicadores de productos reutilizan contarPestanas (stock bajo = activos con stock ≤ umbral)", () => {
  assert.equal(UMBRAL_STOCK_BAJO, 5);
  assert.deepEqual(indicadoresProductos(productos), { activos: 5, desactivados: 1, stockBajo: 3 });
  const c = contarPestanas(productos);
  assert.deepEqual(indicadoresProductos(productos), { activos: c.activos, desactivados: c.desactivados, stockBajo: c["stock-bajo"] });
  assert.deepEqual(indicadoresProductos([]), { activos: 0, desactivados: 0, stockBajo: 0 });
});

test("stock bajo: todos los activos con stock ≤ umbral, de menor a mayor y por nombre si empatan", () => {
  assert.deepEqual(productosStockBajo(productos).map((p) => p.id), [2, 4, 3]);
  const empate = productosStockBajo([
    { id: 1, nombre: "Zeta", stock: 2, activo: true },
    { id: 2, nombre: "Alfa", stock: 2, activo: true },
  ]);
  assert.deepEqual(empate.map((p) => p.nombre), ["Alfa", "Zeta"]);
});

test("stock bajo devuelve la lista completa (la tabla corta a 5 y «Ver los {n}» usa el total)", () => {
  assert.equal(MAX_FILAS_STOCK_BAJO, 5);
  const muchos = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nombre: `P${i}`, stock: i % 5, activo: true }));
  assert.equal(productosStockBajo(muchos).length, 8);
});

test("devuelve los mismos objetos de producto (para el modal de stock)", () => {
  assert.equal(productosStockBajo(productos)[0], productos[1]);
});

test("estado de la fila: Agotado (rojo) si 0; Stock bajo (ámbar) si no", () => {
  assert.deepEqual(estadoStockBajo(0), { texto: "Agotado", variante: "rojo" });
  assert.deepEqual(estadoStockBajo(3), { texto: "Stock bajo", variante: "ambar" });
});

test("preguntas: las 3 más antiguas por fecha ascendente", () => {
  assert.equal(MAX_PREGUNTAS_INICIO, 3);
  const lista = preguntasMasAntiguas([
    { idConsulta: 1, creadaEn: "2026-11-20T10:00:00Z" },
    { idConsulta: 2, creadaEn: "2026-11-18T10:00:00Z" },
    { idConsulta: 3, creadaEn: "2026-11-21T10:00:00Z" },
    { idConsulta: 4, creadaEn: "2026-11-19T10:00:00Z" },
  ]);
  assert.deepEqual(lista.map((p) => p.idConsulta), [2, 4, 1]);
});

test("preguntas sin fecha: por id ascendente", () => {
  const lista = preguntasMasAntiguas([{ idConsulta: 9 }, { idConsulta: 3 }, { idConsulta: 5 }, { idConsulta: 1 }]);
  assert.deepEqual(lista.map((p) => p.idConsulta), [1, 3, 5]);
  assert.deepEqual(preguntasMasAntiguas(null), []);
});

test("resumen del texto: hasta 80 caracteres, con «…» solo si se corta", () => {
  assert.equal(MAX_TEXTO_PREGUNTA, 80);
  assert.equal(resumirTexto("¿Tiene garantía?"), "¿Tiene garantía?");
  const exacto = "a".repeat(80);
  assert.equal(resumirTexto(exacto), exacto);
  const largo = resumirTexto("b".repeat(120));
  assert.equal(largo.length, 80);
  assert.ok(largo.endsWith("…"));
  assert.equal(resumirTexto("  con espacios  "), "con espacios");
  assert.equal(resumirTexto(null), "");
});

test("nombre del producto: del DTO; si no, de la lista de gestión; si no, «Producto #{id}»", () => {
  assert.equal(nombreProductoPregunta({ productoId: 2, nombreProducto: "Mouse G203" }, productos), "Mouse G203");
  assert.equal(nombreProductoPregunta({ productoId: 4 }, productos), "Audífonos");
  assert.equal(nombreProductoPregunta({ productoId: 77 }, productos), "Producto #77");
  assert.equal(nombreProductoPregunta({ productoId: 4 }, null), "Producto #4");
});

test("detalle del indicador de preguntas", () => {
  assert.equal(detallePreguntas(0), "Todo respondido");
  assert.equal(detallePreguntas(4), "Esperan tu respuesta");
});

test("barras del catálogo: porcentaje sobre el total; con total 0, ambas al 0 %", () => {
  assert.deepEqual(barrasCatalogo({ activos: 12, desactivados: 3 }), {
    total: 15,
    activos: { cantidad: 12, porcentaje: 80 },
    desactivados: { cantidad: 3, porcentaje: 20 },
  });
  assert.deepEqual(barrasCatalogo({ activos: 0, desactivados: 0 }), {
    total: 0,
    activos: { cantidad: 0, porcentaje: 0 },
    desactivados: { cantidad: 0, porcentaje: 0 },
  });
  const tercios = barrasCatalogo({ activos: 1, desactivados: 2 });
  assert.ok(Math.abs(tercios.activos.porcentaje - 100 / 3) < 1e-9);
});
