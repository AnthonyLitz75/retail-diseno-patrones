// Panel del personal (spec 19, T11, decisión 2): fija las vistas actuales del CLIENTE y del
// invitado en la tienda ANTES de retirar las del personal. T11 no debe cambiar nada de esto.
import test from "node:test";
import assert from "node:assert/strict";
import {
  determinarVistasPorRol,
  obtenerVistaPorDefecto,
  obtenerVistaInicial,
  obtenerEtiquetaPestaña,
  usaMenuLateral,
  esVistaPermitida,
} from "../../src/utilidades/navegacion.js";

test("CLIENTE: tienda, Mis compras y Mi atención; empieza en la tienda; sin menú lateral", () => {
  assert.deepEqual(determinarVistasPorRol("CLIENTE"), ["tienda", "pedidos", "atencion"]);
  assert.equal(obtenerVistaPorDefecto("CLIENTE"), "tienda");
  assert.equal(obtenerVistaInicial("CLIENTE", ""), "tienda");
  assert.equal(obtenerVistaInicial("CLIENTE", "#/pedidos"), "pedidos");
  assert.equal(usaMenuLateral("CLIENTE"), false);
  assert.equal(obtenerEtiquetaPestaña("pedidos", "CLIENTE"), "Mis compras");
  assert.equal(obtenerEtiquetaPestaña("atencion", "CLIENTE"), "Mi atención");
  assert.equal(obtenerEtiquetaPestaña("tienda", "CLIENTE"), "Tienda");
  for (const vista of ["tienda", "pedidos", "atencion"]) assert.equal(esVistaPermitida(vista, "CLIENTE"), true, vista);
  for (const vista of ["productos", "inventario", "administracion", "consultas", "soporte"]) {
    assert.equal(esVistaPermitida(vista, "CLIENTE"), false, vista);
  }
});

test("invitado: solo la tienda; empieza en la tienda; sin menú lateral", () => {
  for (const rol of [null, undefined]) {
    assert.deepEqual(determinarVistasPorRol(rol), ["tienda"]);
    assert.equal(obtenerVistaPorDefecto(rol), "tienda");
    assert.equal(obtenerVistaInicial(rol, "#/pedidos"), "tienda");
    assert.equal(usaMenuLateral(rol), false);
    assert.equal(esVistaPermitida("pedidos", rol), false);
  }
});
