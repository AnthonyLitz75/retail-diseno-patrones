// Panel del personal (spec 19, T09, P5): Administración como una sola instancia para cuatro
// rutas, ?alta=1 en #/cuentas y pantallas del ADMIN.
import test from "node:test";
import assert from "node:assert/strict";
import { resolverRuta, crearPanelRouter } from "../../src/panel/panel-router.js";
import { seccionDeRuta, pideAlta, TITULO_POR_RUTA, RUTA_CUENTAS } from "../../src/panel/pantallas/administracion.js";

test("cada ruta activa su sección del módulo de administración", () => {
  assert.equal(seccionDeRuta("#/categorias"), "categorias");
  assert.equal(seccionDeRuta("#/cuentas"), "cuentas");
  assert.equal(seccionDeRuta("#/reportes"), "reportes");
  assert.equal(seccionDeRuta("#/incidencias"), "incidencias");
  assert.equal(seccionDeRuta("#/auditoria"), null, "auditoría es T10");
});

test("cada ruta tiene su <h1>", () => {
  assert.deepEqual({ ...TITULO_POR_RUTA }, {
    "#/categorias": "Categorías",
    "#/cuentas": "Cuentas y roles",
    "#/reportes": "Reportes",
    "#/incidencias": "Incidencias",
  });
});

test("#/cuentas lee alta=1; pideAlta solo con alta=1", () => {
  assert.deepEqual(resolverRuta("#/cuentas?alta=1", "ADMIN").parametros, { alta: "1" });
  assert.deepEqual(resolverRuta("#/cuentas", "ADMIN").parametros, {});
  assert.equal(pideAlta({ alta: "1" }), true);
  for (const p of [{}, { alta: "0" }, null]) assert.equal(pideAlta(p), false);
  assert.equal(RUTA_CUENTAS, "#/cuentas");
});

test("ADMIN: Inicio propio, una sola pantalla para las 4 rutas de administración y la auditoría aparte", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const comun = { ventana, documento: {}, menu: null, area: null, mostrarToast() {} };
  const admin = crearPanelRouter({ rol: "ADMIN", ...comun });
  assert.equal(typeof (await admin.cargadores["#/inicio"]()).montar, "function");
  const rutasAdmin = ["#/categorias", "#/cuentas", "#/reportes", "#/incidencias"];
  const modulos = await Promise.all(rutasAdmin.map((r) => admin.cargadores[r]()));
  assert.equal(typeof modulos[0].montar, "function");
  assert.ok(modulos.every((m) => m.montar === modulos[0].montar), "una sola instancia para las cuatro");
  assert.notEqual((await admin.cargadores["#/auditoria"]()).montar, modulos[0].montar);
});

test("productos, pedidos e inventario del ADMIN reutilizan las pantallas existentes", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const comun = { ventana, documento: {}, menu: null, area: null, mostrarToast() {} };
  const admin = crearPanelRouter({ rol: "ADMIN", ...comun });
  const vendedor = crearPanelRouter({ rol: "VENDEDOR", ...comun });
  for (const ruta of ["#/productos", "#/pedidos", "#/inventario"]) {
    assert.equal((await admin.cargadores[ruta]()).montar, (await vendedor.cargadores[ruta]()).montar, ruta);
  }
});
