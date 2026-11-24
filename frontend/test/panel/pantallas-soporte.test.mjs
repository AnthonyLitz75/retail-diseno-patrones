// Panel del personal (spec 19, T08, P1 y P8): #/reclamos, #/devoluciones y #/consulta-pedido
// comparten un solo portal de Soporte y ocultan desde fuera las tarjetas que no tocan.
import test from "node:test";
import assert from "node:assert/strict";
import { crearPanelRouter } from "../../src/panel/panel-router.js";
import { bandejaDeRuta, pedidoDeConsulta, TITULO_POR_RUTA } from "../../src/panel/pantallas/soporte.js";

test("cada ruta muestra solo su bandeja; la consulta de pedido, ninguna", () => {
  assert.equal(bandejaDeRuta("#/reclamos"), "reclamos");
  assert.equal(bandejaDeRuta("#/devoluciones"), "devoluciones");
  assert.equal(bandejaDeRuta("#/consulta-pedido"), null);
});

test("cada ruta tiene su <h1> (el router le pasa el foco)", () => {
  assert.deepEqual({ ...TITULO_POR_RUTA }, {
    "#/reclamos": "Reclamos",
    "#/devoluciones": "Devoluciones",
    "#/consulta-pedido": "Consulta de pedido",
  });
});

test("pedido de la URL: válido → número; no válido o ausente → null (no se consulta)", () => {
  assert.equal(pedidoDeConsulta({ pedido: "3" }), 3);
  assert.equal(pedidoDeConsulta({ pedido: "03" }), 3);
  for (const p of [{ pedido: "abc" }, { pedido: "0" }, { pedido: "" }, {}, null]) assert.equal(pedidoDeConsulta(p), null);
});

test("SOPORTE: Inicio propio y las tres rutas con la misma pantalla compartida", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const router = crearPanelRouter({ rol: "SOPORTE", ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
  const inicio = await router.cargadores["#/inicio"]();
  assert.equal(typeof inicio.montar, "function");
  const modulos = await Promise.all(["#/reclamos", "#/devoluciones", "#/consulta-pedido"].map((r) => router.cargadores[r]()));
  assert.equal(typeof modulos[0].montar, "function");
  assert.ok(modulos.every((m) => m.montar === modulos[0].montar), "un solo módulo para las tres rutas");
});
