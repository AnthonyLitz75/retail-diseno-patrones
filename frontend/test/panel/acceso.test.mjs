// Panel del personal (spec 19, T02): decisión de acceso al panel y destino tras el login.
import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluarAccesoPanel,
  destinoTrasLoginPorRol,
  planificarArranquePanel,
  MENSAJE_SIN_ACCESO,
  RETRASO_REDIRECCION_MS,
} from "../../src/panel/acceso.js";

const PERSONAL = ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];
const MENSAJE = "Tu rol no tiene acceso a esa sección.";

test("sin sesión: no entra y va al login", () => {
  assert.deepEqual(evaluarAccesoPanel(null), { permitido: false, destino: "login" });
  assert.deepEqual(evaluarAccesoPanel(undefined), { permitido: false, destino: "login" });
});

test("CLIENTE: no entra y vuelve a la tienda con el mensaje", () => {
  assert.equal(MENSAJE_SIN_ACCESO, MENSAJE);
  assert.deepEqual(evaluarAccesoPanel("CLIENTE"), { permitido: false, destino: "tienda", mensaje: MENSAJE });
});

test("cada rol del personal entra al panel", () => {
  for (const rol of PERSONAL) {
    assert.deepEqual(evaluarAccesoPanel(rol), { permitido: true }, rol);
  }
});

test("rol desconocido, cadena vacía o valor inesperado: se deniega como a CLIENTE", () => {
  for (const rol of ["", "admin", "SUPERADMIN", " ADMIN", 0, 42, true, {}, ["ADMIN"]]) {
    assert.deepEqual(
      evaluarAccesoPanel(rol),
      { permitido: false, destino: "tienda", mensaje: MENSAJE },
      JSON.stringify(rol),
    );
  }
});

test("tras el login, el personal va al inicio del panel (ignora volver)", () => {
  for (const rol of PERSONAL) {
    assert.equal(destinoTrasLoginPorRol(rol, ""), "/panel.html#/inicio", rol);
    assert.equal(destinoTrasLoginPorRol(rol, "?volver=%23%2Fpedidos"), "/panel.html#/inicio", rol);
  }
});

test("tras el login, CLIENTE va a la tienda o a la ruta volver validada", () => {
  assert.equal(destinoTrasLoginPorRol("CLIENTE", ""), "/");
  assert.equal(destinoTrasLoginPorRol("CLIENTE", "?volver=%23%2Fpedidos"), "/#/pedidos");
  for (const malicioso of ["?volver=%2F%2Fevil.com", "?volver=//evil.com", "?volver=https%3A%2F%2Fevil.com",
    "?volver=%23%2F%2Fevil.com", "?volver=javascript%3Aalert(1)"]) {
    assert.equal(destinoTrasLoginPorRol("CLIENTE", malicioso), "/", malicioso);
  }
});

test("tras el login, un rol desconocido se trata como CLIENTE y nunca va al panel", () => {
  for (const rol of [null, undefined, "", "admin", "SUPERADMIN", 7]) {
    assert.equal(destinoTrasLoginPorRol(rol, ""), "/", String(rol));
    assert.equal(destinoTrasLoginPorRol(rol, "?volver=%23%2Fpedidos"), "/#/pedidos", String(rol));
    assert.equal(destinoTrasLoginPorRol(rol, "?volver=%2Fpanel.html%23%2Finicio"), "/", String(rol));
    assert.equal(destinoTrasLoginPorRol(rol, "?volver=%2F%2Fevil.com"), "/", String(rol));
  }
});

// T03: qué hace panel.html al arrancar según la sesión. El marco solo se pinta si se permite.
test("arranque sin sesión: no pinta el marco y va a /login.html sin volver", () => {
  for (const usuario of [null, undefined, {}, { nombre: "x" }]) {
    assert.deepEqual(planificarArranquePanel(usuario), { pintar: false, redirigir: "/login.html", retrasoMs: 0 },
      JSON.stringify(usuario));
  }
});

test("arranque como CLIENTE o rol desconocido: no pinta el marco, avisa y vuelve a la tienda a los 1500 ms", () => {
  assert.equal(RETRASO_REDIRECCION_MS, 1500);
  for (const rol of ["CLIENTE", "SUPERADMIN", ""]) {
    assert.deepEqual(planificarArranquePanel({ idUsuario: 9, nombre: "Rosa", rol }), {
      pintar: false, redirigir: "/", retrasoMs: 1500, mensaje: MENSAJE,
    }, rol);
  }
});

test("arranque del personal: pinta el marco y no redirige", () => {
  for (const rol of PERSONAL) {
    assert.deepEqual(planificarArranquePanel({ idUsuario: 1, nombre: "Ana", rol }), { pintar: true }, rol);
  }
});
