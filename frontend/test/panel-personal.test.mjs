// Boceto "Panel de personal": vista Productos (filtros, pestañas, paginación), menú lateral
// del personal e indicadores de la cabecera de Administración.
import test from "node:test";
import assert from "node:assert/strict";
import {
  contarPestanas,
  filtrarProductosGestion,
  paginarLista,
  resumenProductos,
  UMBRAL_STOCK_BAJO,
} from "../src/catalogo/panel-productos.js";
import { indicadoresDestacados } from "../src/administracion/administracion.js";
import { obtenerEtiquetaPestaña, usaMenuLateral } from "../src/utilidades/navegacion.js";
import { renderizarCatalogoLayout } from "../src/layout/catalogo-layout.js";

const productos = [
  { id: 1, sku: "PA-0003", nombre: "Teclado inalámbrico K380", categoria: "Teclados", stock: 22, activo: true },
  { id: 2, sku: "PA-0004", nombre: "Teclado mecánico Alloy", categoria: "Teclados", stock: 3, activo: true },
  { id: 3, sku: "PA-0005", nombre: "Mouse gamer G203", categoria: "Mouse", stock: 30, activo: true },
  { id: 4, sku: "PA-0027", nombre: "Memoria RAM Fury", categoria: "Memorias RAM", stock: 5, activo: true },
  { id: 5, sku: null, nombre: "Webcam HD", categoria: "Cámaras", stock: 9, activo: false },
  { id: 6, sku: "PA-0099", nombre: "Cargador viejo", categoria: "Cargadores", stock: 1, activo: false },
];

test("pestañas: activos, desactivados y stock bajo (solo activos con 5 o menos)", () => {
  assert.equal(UMBRAL_STOCK_BAJO, 5);
  assert.deepEqual(contarPestanas(productos), { activos: 4, desactivados: 2, "stock-bajo": 2 });
  assert.equal(resumenProductos(productos), "4 activos · 2 desactivados · 2 con stock bajo");
  assert.deepEqual(filtrarProductosGestion(productos, { pestana: "desactivados" }).map((p) => p.id), [5, 6]);
  assert.deepEqual(filtrarProductosGestion(productos, { pestana: "stock-bajo" }).map((p) => p.id), [2, 4],
    "stock bajo ordena del menor stock al mayor y excluye desactivados");
});

test("búsqueda por nombre o código sin importar tildes, y filtro por categoría", () => {
  assert.deepEqual(filtrarProductosGestion(productos, { texto: "inalambrico" }).map((p) => p.id), [1]);
  assert.deepEqual(filtrarProductosGestion(productos, { texto: "pa-0005" }).map((p) => p.id), [3]);
  assert.deepEqual(filtrarProductosGestion(productos, { categoria: "Teclados" }).map((p) => p.id), [1, 2]);
  assert.deepEqual(filtrarProductosGestion(productos, { pestana: "desactivados", texto: "webcam" }).map((p) => p.id), [5]);
});

test("paginación de 10 en 10 y página fuera de rango ajustada", () => {
  const lista = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(paginarLista(lista, 1), { items: lista.slice(0, 10), pagina: 1, totalPaginas: 3, inicio: 0 });
  assert.deepEqual(paginarLista(lista, 3).items, [21, 22, 23]);
  assert.equal(paginarLista(lista, 9).pagina, 3);
  assert.equal(paginarLista([], 1).totalPaginas, 1);
});

test("la vista Productos existe, tiene su pestaña y contiene el formulario de alta", () => {
  const html = renderizarCatalogoLayout();
  assert.match(html, /id="tab-productos"[^>]*data-vista="productos"[^>]*hidden/);
  const vista = html.slice(html.indexOf('id="vista-productos"'), html.indexOf("<!-- Vista Administración -->"));
  assert.match(vista, /id="seccion-gestion-productos"/);
  assert.match(vista, /id="form-producto"/);
  assert.match(vista, /id="resumen-gestion-productos"/);
  assert.equal(obtenerEtiquetaPestaña("productos", "VENDEDOR"), "Productos");
});

test("menú lateral solo para el personal con más de un módulo", () => {
  assert.equal(usaMenuLateral("ADMIN"), true);
  assert.equal(usaMenuLateral("VENDEDOR"), true);
  assert.equal(usaMenuLateral("SOPORTE"), true);
  assert.equal(usaMenuLateral("CLIENTE"), false, "el cliente conserva las pestañas de la tienda");
  assert.equal(usaMenuLateral(null), false);
  assert.equal(usaMenuLateral("ADMIN", ["administracion"]), false);
});

test("indicadores de Administración: ventas, pedidos, reclamos e inventario con su nota", () => {
  const indicadores = indicadoresDestacados({
    ventasNetas: 174,
    pedidosVendidos: 3,
    pedidosPorEstado: { PENDIENTE: 1, ENTREGADO: 2 },
    escalados: 0,
    valorInventario: 80687,
    unidadesEnStock: 491,
    productosActivos: 32,
  });
  assert.deepEqual(indicadores.map((i) => i.etiqueta), ["Ventas netas", "Pedidos vendidos", "Reclamos escalados", "Valor del inventario"]);
  assert.equal(indicadores[1].nota, "1 pendiente de preparar");
  assert.equal(indicadores[2].nota, "Ninguno abierto");
  assert.equal(indicadores[3].nota, "491 unidades · 32 productos");
  assert.equal(indicadoresDestacados({})[1].valor, "0", "sin datos muestra ceros, no undefined");
});
