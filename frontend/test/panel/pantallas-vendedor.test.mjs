// Panel del personal (spec 19, T07): pantallas montadas para VENDEDOR (productos y consultas)
// y parámetro «nuevo» de #/productos.
import test from "node:test";
import assert from "node:assert/strict";
import { resolverRuta, crearPanelRouter } from "../../src/panel/panel-router.js";
import { IDS_PRODUCTOS, pideNuevoProducto, RUTA_PRODUCTOS } from "../../src/panel/pantallas/productos.js";
import { IDS_CONSULTAS } from "../../src/panel/pantallas/consultas.js";
import { renderizarVistaProductos, renderizarVistaConsultas } from "../../src/layout/vistas-personal.js";

test("#/productos lee el parámetro nuevo; los demás se ignoran", () => {
  assert.deepEqual(resolverRuta("#/productos?nuevo=1", "VENDEDOR").parametros, { nuevo: "1" });
  assert.deepEqual(resolverRuta("#/productos?nuevo=1&x=2", "ADMIN").parametros, { nuevo: "1" });
  assert.deepEqual(resolverRuta("#/productos", "VENDEDOR").parametros, {});
  assert.equal(resolverRuta("#/productos?nuevo=1", "VENDEDOR").redireccion, undefined);
});

test("pideNuevoProducto: solo con nuevo=1", () => {
  assert.equal(pideNuevoProducto({ nuevo: "1" }), true);
  for (const p of [{}, { nuevo: "0" }, { nuevo: "" }, null, undefined]) assert.equal(pideNuevoProducto(p), false);
  assert.equal(RUTA_PRODUCTOS, "#/productos");
});

test("#/productos enlaza los ids del panel de productos y del formulario de producto nuevo (P6)", () => {
  const html = renderizarVistaProductos();
  for (const id of ["seccion-gestion-productos", "form-producto", "resultado-formulario", "panel-nuevo-producto", "boton-nuevo-producto"]) {
    assert.ok(IDS_PRODUCTOS.includes(id), id);
  }
  for (const id of IDS_PRODUCTOS) assert.match(html, new RegExp(`id="${id}"`), id);
});

test("#/consultas enlaza los ids que usa configurarBandejaVendedor", () => {
  const html = renderizarVistaConsultas();
  assert.deepEqual([...IDS_CONSULTAS], [
    "seccion-preguntas-vendedor", "estado-preguntas-vendedor", "lista-preguntas-vendedor", "actualizar-preguntas-vendedor",
  ]);
  for (const id of IDS_CONSULTAS) assert.match(html, new RegExp(`id="${id}"`), id);
});

test("VENDEDOR carga sus cinco pantallas propias", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const router = crearPanelRouter({ rol: "VENDEDOR", ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
  for (const ruta of ["#/inicio", "#/productos", "#/pedidos", "#/consultas", "#/inventario"]) {
    const modulo = await router.cargadores[ruta]();
    assert.equal(typeof modulo.montar, "function", ruta);
  }
});

test("pedidos e inventario del VENDEDOR son las mismas pantallas que las de ALMACEN (sin duplicar)", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const comun = { ventana, documento: {}, menu: null, area: null, mostrarToast() {} };
  const vendedor = crearPanelRouter({ rol: "VENDEDOR", ...comun });
  const almacen = crearPanelRouter({ rol: "ALMACEN", ...comun });
  for (const ruta of ["#/pedidos", "#/inventario"]) {
    assert.equal((await vendedor.cargadores[ruta]()).montar, (await almacen.cargadores[ruta]()).montar, ruta);
  }
});
