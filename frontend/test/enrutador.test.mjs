import test from "node:test";
import assert from "node:assert/strict";
import {
  generarSlug,
  parsearRuta,
  buscarCategoriaPorSlug,
  construirBreadcrumbs,
} from "../src/router/enrutador.js";

const arbolPrueba = [
  { id: 1, nombre: "Teclados", subcategorias: [] },
  { id: 2, nombre: "Cargadores y cables", subcategorias: [] },
  { id: 3, nombre: "Cámaras", subcategorias: [] },
  {
    id: 4,
    nombre: "Componentes para PC",
    subcategorias: [
      { id: 5, nombre: "Procesadores", subcategorias: [] },
      { id: 6, nombre: "Memorias RAM", subcategorias: [] },
    ],
  },
];

test("generarSlug convierte títulos con acentos, mayúsculas y caracteres especiales", () => {
  assert.equal(generarSlug("Teclados"), "teclados");
  assert.equal(generarSlug("Cámaras"), "camaras");
  assert.equal(generarSlug("Cargadores y cables"), "cargadores-y-cables");
  assert.equal(generarSlug("Componentes para PC"), "componentes-para-pc");
  assert.equal(generarSlug("  Memorias   RAM  "), "memorias-ram");
  assert.equal(generarSlug("Procesadores / Chips!"), "procesadores-chips");
  assert.equal(generarSlug(""), "");
  assert.equal(generarSlug(null), "");
});

test("parsearRuta identifica rutas canónicas, parámetros y query strings", () => {
  // Inicio
  assert.equal(parsearRuta("").tipo, "inicio");
  assert.equal(parsearRuta("#").tipo, "inicio");
  assert.equal(parsearRuta("#/").tipo, "inicio");

  // Catálogo
  const rCatalogo = parsearRuta("#/catalogo");
  assert.equal(rCatalogo.tipo, "catalogo");
  assert.equal(rCatalogo.path, "/catalogo");

  // Categoría Principal
  const rCategoria = parsearRuta("#/categoria/teclados");
  assert.equal(rCategoria.tipo, "categoria");
  assert.equal(rCategoria.params.slug, "teclados");

  // Subcategoría
  const rSub = parsearRuta("#/categoria/componentes-para-pc/procesadores");
  assert.equal(rSub.tipo, "subcategoria");
  assert.equal(rSub.params.slugPadre, "componentes-para-pc");
  assert.equal(rSub.params.slug, "procesadores");

  // Producto por SKU
  const rProd = parsearRuta("#/producto/pa-0001");
  assert.equal(rProd.tipo, "producto");
  assert.equal(rProd.params.sku, "PA-0001");

  // Búsqueda con query param
  const rBuscar = parsearRuta("#/buscar?q=mouse+gamer");
  assert.equal(rBuscar.tipo, "buscar");
  assert.equal(rBuscar.query.q, "mouse gamer");

  // Pedidos y compras
  const rPedidos = parsearRuta("#/pedidos");
  assert.equal(rPedidos.tipo, "pedidos");
  assert.equal(rPedidos.path, "/pedidos");

  const rCompras = parsearRuta("#/compras");
  assert.equal(rCompras.tipo, "pedidos");

  // 404
  const r404 = parsearRuta("#/seccion/desconocida/invalida");
  assert.equal(r404.tipo, "404");
});

test("buscarCategoriaPorSlug localiza nodos raíz e hijos en el árbol Composite", () => {
  const catTeclados = buscarCategoriaPorSlug(arbolPrueba, "teclados");
  assert.ok(catTeclados);
  assert.equal(catTeclados.categoria.nombre, "Teclados");
  assert.equal(catTeclados.padre, null);

  const subProc = buscarCategoriaPorSlug(arbolPrueba, "procesadores");
  assert.ok(subProc);
  assert.equal(subProc.categoria.nombre, "Procesadores");
  assert.equal(subProc.padre.nombre, "Componentes para PC");

  const noExiste = buscarCategoriaPorSlug(arbolPrueba, "impresoras");
  assert.equal(noExiste, null);
});

test("construirBreadcrumbs genera la estructura jerárquica de navegación", () => {
  // Inicio
  const bInicio = construirBreadcrumbs({ tipo: "inicio" });
  assert.equal(bInicio.length, 1);
  assert.equal(bInicio[0].etiqueta, "Inicio");
  assert.equal(bInicio[0].esActivo, true);

  // Catálogo
  const bCat = construirBreadcrumbs({ tipo: "catalogo" });
  assert.equal(bCat.length, 2);
  assert.equal(bCat[1].etiqueta, "Catálogo");
  assert.equal(bCat[1].esActivo, true);

  // Categoría
  const bCategoria = construirBreadcrumbs(
    { tipo: "categoria", params: { slug: "camaras" } },
    arbolPrueba,
  );
  assert.equal(bCategoria.length, 3);
  assert.equal(bCategoria[2].etiqueta, "Cámaras");
  assert.equal(bCategoria[2].esActivo, true);

  // Subcategoría
  const bSub = construirBreadcrumbs(
    {
      tipo: "subcategoria",
      params: { slugPadre: "componentes-para-pc", slug: "procesadores" },
    },
    arbolPrueba,
  );
  assert.equal(bSub.length, 4);
  assert.equal(bSub[2].etiqueta, "Componentes para PC");
  assert.equal(bSub[3].etiqueta, "Procesadores");
  assert.equal(bSub[3].esActivo, true);

  // Producto
  const bProd = construirBreadcrumbs(
    { tipo: "producto", params: { sku: "PA-0001" } },
    arbolPrueba,
    { nombre: "Teclado Fizz K617", categoria: "Teclados" },
  );
  assert.equal(bProd.length, 4);
  assert.equal(bProd[2].etiqueta, "Teclados");
  assert.equal(bProd[3].etiqueta, "Teclado Fizz K617");
  assert.equal(bProd[3].esActivo, true);

  // 404
  const b404 = construirBreadcrumbs({ tipo: "404" });
  assert.equal(b404.length, 2);
  assert.equal(b404[1].etiqueta, "Página no encontrada");
  assert.equal(b404[1].esActivo, true);
});
