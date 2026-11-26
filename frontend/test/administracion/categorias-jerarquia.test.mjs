import test from "node:test";
import assert from "node:assert/strict";
import {
  ESTADOS_FILTRO_CATEGORIA,
  construirConfirmacionDesactivacion,
  construirJerarquiaCategorias,
  filtrarArbolCategorias,
  formatearContadorProductos,
  formatearContadorSubcategorias,
  principalesDisponiblesPara,
  validarNombreCategoria,
} from "../../src/administracion/categorias-logica.js";

test("construirJerarquiaCategorias agrupa cada principal seguida de sus subcategorías ordenadas", () => {
  const categorias = [
    { idCategoria: 3, nombre: "Teclados", activa: true, categoriaPadreId: 1 },
    { idCategoria: 1, nombre: "Periféricos", activa: true, categoriaPadreId: null },
    { idCategoria: 2, nombre: "Audio", activa: true, categoriaPadreId: 1 },
    { idCategoria: 4, nombre: "Accesorios", activa: true, categoriaPadreId: null },
  ];

  const { raices, filas } = construirJerarquiaCategorias(categorias);
  assert.deepEqual(raices.map((c) => c.nombre), ["Accesorios", "Periféricos"]);
  assert.deepEqual(
    filas.map((f) => ({ nombre: f.categoria.nombre, sub: f.esSubcategoria, hijas: f.totalSubcategorias })),
    [
      { nombre: "Accesorios", sub: false, hijas: 0 },
      { nombre: "Periféricos", sub: false, hijas: 2 },
      { nombre: "Audio", sub: true, hijas: 0 },
      { nombre: "Teclados", sub: true, hijas: 0 },
    ],
  );
});

test("construirJerarquiaCategorias trata huérfanas como principales y principalesDisponiblesPara excluye el id propio", () => {
  const categorias = [
    { idCategoria: 1, nombre: "Periféricos", categoriaPadreId: null },
    { idCategoria: 5, nombre: "Huérfana", categoriaPadreId: 999 },
    { idCategoria: 2, nombre: "Audio", categoriaPadreId: null },
  ];
  const { raices, filas } = construirJerarquiaCategorias(categorias);
  assert.equal(filas.length, 3);
  assert.deepEqual(
    principalesDisponiblesPara(raices, 1).map((c) => c.nombre),
    ["Audio"],
  );
});

test("filtrarArbolCategorias filtra por estado y texto preservando el árbol y conteos de rama", () => {
  const categorias = [
    { idCategoria: 1, nombre: "Periféricos", activa: true, categoriaPadreId: null, totalProductos: 1 },
    { idCategoria: 2, nombre: "Teclados", activa: true, categoriaPadreId: 1, totalProductos: 4 },
    { idCategoria: 3, nombre: "Audio", activa: false, categoriaPadreId: 1, totalProductos: 2 },
    { idCategoria: 4, nombre: "Monitores", activa: false, categoriaPadreId: null, totalProductos: 0 },
  ];

  const activas = filtrarArbolCategorias(categorias, { estado: ESTADOS_FILTRO_CATEGORIA.ACTIVAS });
  assert.equal(activas.grupos.length, 1);
  assert.deepEqual(activas.grupos[0].hijas.map((h) => h.nombre), ["Teclados"]);
  assert.equal(activas.grupos[0].totalProductosRama, 7);
  assert.deepEqual(activas.idsVisibles, [1, 2]);
  assert.equal(activas.hayFiltrosActivos, true);

  const inactivas = filtrarArbolCategorias(categorias, { estado: ESTADOS_FILTRO_CATEGORIA.INACTIVAS });
  assert.deepEqual(inactivas.grupos.map((g) => g.raiz.nombre), ["Monitores", "Periféricos"]);
  assert.deepEqual(inactivas.grupos[1].hijas.map((h) => h.nombre), ["Audio"]);
  assert.deepEqual(inactivas.idsVisibles, [4, 3]);

  const busqueda = filtrarArbolCategorias(categorias, { texto: "perifericos" });
  assert.equal(busqueda.grupos.length, 1);
  assert.equal(busqueda.grupos[0].hijas.length, 2);

  const sinCoincidencia = filtrarArbolCategorias(categorias, { estado: ESTADOS_FILTRO_CATEGORIA.ACTIVAS, texto: "monitores" });
  assert.equal(sinCoincidencia.grupos.length, 0);
  assert.equal(sinCoincidencia.filasVisibles, 0);
});

test("validarNombreCategoria valida requerido y máximo de 80 caracteres", () => {
  assert.match(validarNombreCategoria("   "), /Ingresa un nombre/);
  assert.match(validarNombreCategoria("x".repeat(81)), /80 caracteres/);
  assert.equal(validarNombreCategoria("Periféricos"), "");
});

test("construirConfirmacionDesactivacion pide confirmación solo cuando hay subcategorías o productos", () => {
  const categorias = [
    { idCategoria: 1, nombre: "Periféricos", activa: true, categoriaPadreId: null, totalProductos: 0 },
    { idCategoria: 2, nombre: "Teclados", activa: true, categoriaPadreId: 1, totalProductos: 3 },
    { idCategoria: 3, nombre: "Vacía", activa: true, categoriaPadreId: null, totalProductos: 0 },
  ];

  assert.equal(construirConfirmacionDesactivacion([categorias[2]], categorias), null);

  const confUnica = construirConfirmacionDesactivacion([categorias[0]], categorias);
  assert.ok(confUnica);
  assert.match(confUnica.mensaje, /1 subcategoría/);
  assert.match(confUnica.mensaje, /3 productos activos/);

  const confLote = construirConfirmacionDesactivacion([categorias[0], categorias[1]], categorias);
  assert.ok(confLote);
  assert.match(confLote.mensaje, /2 categorías/);
  assert.match(confLote.mensaje, /3 productos activos/);
});

test("formateadores de contadores respetan singular y plural", () => {
  assert.equal(formatearContadorSubcategorias(1), "1 subcategoría");
  assert.equal(formatearContadorSubcategorias(2), "2 subcategorías");
  assert.equal(formatearContadorProductos(0), "0 productos");
  assert.equal(formatearContadorProductos(1), "1 producto");
});
