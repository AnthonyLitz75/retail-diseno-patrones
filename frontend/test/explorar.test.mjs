// Bocetos del equipo: productos relacionados, chips "Compra por categoría", resumen del
// catálogo y filtros de "Mis pedidos" con el botón "Copiar código".
import test from "node:test";
import assert from "node:assert/strict";
import {
  enlacesCategorias,
  resumenCatalogo,
  seleccionarRelacionados,
} from "../src/catalogo/explorar.js";
import { contarPedidosPorFiltro, crearBotonCopiarCodigo } from "../src/pedidos/pedidos-vista.js";
import { renderizarCatalogoLayout } from "../src/layout/catalogo-layout.js";

const p = (id, categoria, precio, stock = 5, extra = {}) => ({ id, categoria, precio, stock, nombre: `P${id}`, ...extra });

test("relacionados: misma categoría, sin el actual, primero con stock y de precio parecido", () => {
  const actual = p(1, "Teclados", 300);
  const catalogo = [
    actual,
    p(2, "Teclados", 900),
    p(3, "Teclados", 290, 0),
    p(4, "Teclados", 310),
    p(5, "Mouse", 300),
    p(6, "Teclados", 150),
    p(7, "Teclados", 320, 4, { activo: false }),
  ];
  assert.deepEqual(seleccionarRelacionados(actual, catalogo).map((x) => x.id), [4, 6, 2, 3]);
  assert.deepEqual(seleccionarRelacionados(actual, catalogo, 2).map((x) => x.id), [4, 6]);
  assert.deepEqual(seleccionarRelacionados(p(9, "Cámaras", 100), catalogo), [], "sin otros de su categoría no hay sección");
  assert.deepEqual(seleccionarRelacionados(p(9, null, 100), catalogo), [], "sin categoría no se inventan relacionados");
});

test("chips de categoría: subcategorías con la ruta padre/hija y raíces sin hijas con su ruta", () => {
  const arbol = [
    { nombre: "Periféricos", subcategorias: [{ nombre: "Teclados", totalProductos: 4 }, { nombre: "Cámaras", totalProductos: 0 }] },
    { nombre: "Accesorios", subcategorias: [], totalProductos: 3 },
  ];
  assert.deepEqual(enlacesCategorias(arbol), [
    { nombre: "Teclados", href: "#/categoria/perifericos/teclados", total: 4 },
    { nombre: "Accesorios", href: "#/categoria/accesorios", total: 3 },
  ], "una categoría sin productos no se ofrece");
  assert.deepEqual(enlacesCategorias(null), []);
});

test("resumen del catálogo: productos y categorías con productos", () => {
  assert.equal(resumenCatalogo([p(1, "A", 1), p(2, "A", 1), p(3, "B", 1)]), "3 productos en 2 categorías");
  assert.equal(resumenCatalogo([p(1, "A", 1)]), "1 producto en 1 categoría");
  assert.equal(resumenCatalogo([]), "");
});

test("la plantilla del inicio tiene la sección de categorías (oculta hasta cargar) y el resumen", () => {
  const html = renderizarCatalogoLayout();
  assert.match(html, /id="seccion-compra-categoria"[^>]*hidden/);
  assert.match(html, /id="chips-categorias-inicio"/);
  assert.match(html, /id="resumen-catalogo-inicio"/);
});

test("filtros de pedidos: Todos más cada estado presente, en el orden del ciclo de vida", () => {
  const pedidos = [
    { estado: "ENTREGADO" }, { estado: "PENDIENTE" }, { estado: "DESPACHADO" }, { estado: "PENDIENTE" },
  ];
  assert.deepEqual(
    contarPedidosPorFiltro(pedidos).map(({ clave, etiqueta, total }) => [clave, etiqueta, total]),
    [["TODOS", "Todos", 4], ["PENDIENTE", "Pendiente", 2], ["DESPACHADO", "En camino", 1], ["ENTREGADO", "Entregado", 1]],
  );
  assert.deepEqual(contarPedidosPorFiltro([]).map((f) => f.total), [0]);
});

test("Copiar código usa el portapapeles y avisa si no se puede", async () => {
  const anterior = globalThis.document;
  globalThis.document = {
    createElement: () => {
      const escuchas = {};
      return {
        textContent: "",
        setAttribute() {},
        addEventListener: (tipo, fn) => { escuchas[tipo] = fn; },
        clic: () => escuchas.click(),
      };
    },
  };
  try {
    let copiado = "";
    const boton = crearBotonCopiarCodigo("OLV-001", { writeText: async (texto) => { copiado = texto; } });
    assert.equal(boton.textContent, "Copiar código");
    await boton.clic();
    assert.equal(copiado, "OLV-001");
    assert.equal(boton.textContent, "¡Copiado!");

    const sinPermiso = crearBotonCopiarCodigo("OLV-002", { writeText: async () => { throw new Error("denegado"); } });
    await sinPermiso.clic();
    assert.equal(sinPermiso.textContent, "Selecciónalo y cópialo");
  } finally {
    globalThis.document = anterior;
  }
});
