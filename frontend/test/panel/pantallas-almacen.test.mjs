// Panel del personal (spec 19, T06c): #/pedidos e #/inventario montan los módulos existentes
// con el HTML compartido de vistas-personal.js.
import test from "node:test";
import assert from "node:assert/strict";
import { rutaDeVista } from "../../src/panel/menu-por-rol.js";
import { crearPanelRouter } from "../../src/panel/panel-router.js";
import { IDS_PEDIDOS } from "../../src/panel/pantallas/pedidos.js";
import { IDS_INVENTARIO, crearCargaProductos } from "../../src/panel/pantallas/inventario.js";
import { renderizarVistaPedidos, renderizarVistaInventario } from "../../src/layout/vistas-personal.js";

test("rutaDeVista traduce una vista de la tienda a la ruta del panel del rol", () => {
  assert.equal(rutaDeVista("pedidos", "ALMACEN"), "#/pedidos");
  assert.equal(rutaDeVista("inventario", "ALMACEN"), "#/inventario");
  assert.equal(rutaDeVista("administracion", "ADMIN"), "#/categorias", "primera entrada de esa vista");
  assert.equal(rutaDeVista("soporte", "SOPORTE"), "#/reclamos");
  assert.equal(rutaDeVista("tienda", "ALMACEN"), null, "la tienda no es una ruta del panel");
  assert.equal(rutaDeVista("administracion", "ALMACEN"), null, "una vista que el rol no tiene");
  assert.equal(rutaDeVista("pedidos", "CLIENTE"), null);
});

test("#/pedidos enlaza en el panel los mismos ids que usa configurarControladorPedidos", () => {
  const html = renderizarVistaPedidos();
  assert.deepEqual([...IDS_PEDIDOS], ["seccion-pedidos", "titulo-pedidos", "estado-pedidos", "lista-pedidos"]);
  for (const id of IDS_PEDIDOS) assert.match(html, new RegExp(`id="${id}"`), id);
});

test("#/inventario enlaza en el panel los mismos ids que usa configurarPanelInventario", () => {
  const html = renderizarVistaInventario();
  for (const id of IDS_INVENTARIO) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.ok(IDS_INVENTARIO.includes("form-entrada-inventario"));
  assert.ok(IDS_INVENTARIO.includes("paginacion-movimientos"));
});

test("la carga propia de productos guarda GET /api/productos en el estado compartido", async () => {
  const estado = { productosInventario: [] };
  const pedidas = [];
  const cargar = crearCargaProductos({
    apiRequest: async (url) => { pedidas.push(url); return { json: async () => [{ id: 1 }] }; },
    estado,
  });
  await cargar();
  assert.deepEqual(pedidas, ["/api/productos"]);
  assert.deepEqual(estado.productosInventario, [{ id: 1 }]);
});

test("si la carga propia falla, el estado se vacía para que el módulo vuelva a pedirlos", async () => {
  const estado = { productosInventario: [{ id: 9 }] };
  const cargar = crearCargaProductos({ apiRequest: async () => { throw new Error("sin red"); }, estado });
  await cargar();
  assert.deepEqual(estado.productosInventario, []);
});

test("ALMACEN carga sus pantallas de pedidos e inventario", async () => {
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  const router = crearPanelRouter({ rol: "ALMACEN", ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
  for (const ruta of ["#/pedidos", "#/inventario"]) {
    const modulo = await router.cargadores[ruta]();
    assert.equal(typeof modulo.montar, "function", ruta);
  }
});
