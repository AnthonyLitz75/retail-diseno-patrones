// Panel del personal (spec 19, T11, decisión 1): tras el login, el destino depende del rol de la
// respuesta. login.js pinta la página al importarse, así que se revisa su código fuente; el
// comportamiento de destinoTrasLoginPorRol (personal, CLIENTE con y sin volver, otro dominio
// bloqueado y rol desconocido) está probado en test/panel/acceso.test.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { destinoTrasLoginPorRol } from "../../src/panel/acceso.js";

const login = readFileSync(new URL("../../src/autenticacion/login.js", import.meta.url), "utf-8");

test("login.js importa destinoTrasLoginPorRol del panel", () => {
  assert.match(login, /import\s*\{[^}]*\bdestinoTrasLoginPorRol\b[^}]*\}\s*from\s*"\.\.\/panel\/acceso\.js"/);
});

test("la redirección tras el login usa el rol de la respuesta", () => {
  assert.match(login, /window\.location\.href\s*=\s*destinoTrasLoginPorRol\(\s*cuerpo\.rol\s*,\s*window\.location\.search\s*\)/);
  assert.doesNotMatch(login, /window\.location\.href\s*=\s*destinoTrasLogin\(/, "ya no redirige sin mirar el rol");
});

test("resumen del comportamiento que usa login.js", () => {
  for (const rol of ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"]) {
    assert.equal(destinoTrasLoginPorRol(rol, "?volver=%23%2Fpedidos"), "/panel.html#/inicio", rol);
  }
  assert.equal(destinoTrasLoginPorRol("CLIENTE", ""), "/");
  assert.equal(destinoTrasLoginPorRol("CLIENTE", "?volver=%23%2Fpedidos"), "/#/pedidos");
  assert.equal(destinoTrasLoginPorRol("CLIENTE", "?volver=https%3A%2F%2Fotro.example"), "/");
  assert.equal(destinoTrasLoginPorRol("DESCONOCIDO", "?volver=%23%2Fpedidos"), "/#/pedidos");
});
