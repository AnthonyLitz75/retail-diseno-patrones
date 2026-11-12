// Registro de cliente (boceto "Crear cuenta"): reglas de contraseña en vivo, iguales a las
// del backend (ReglasClave), y validación completa antes de enviar.
import test from "node:test";
import assert from "node:assert/strict";
import { claveCumpleReglas, evaluarClave, validarRegistro } from "../src/autenticacion/reglas-clave.js";

const estado = (clave) => Object.fromEntries(evaluarClave(clave).map((r) => [r.id, r.cumple]));

test("cada regla se marca por separado mientras se escribe", () => {
  assert.deepEqual(estado(""), { longitud: false, mayuscula: false, numero: false });
  assert.deepEqual(estado("segura"), { longitud: false, mayuscula: false, numero: false });
  assert.deepEqual(estado("Segura"), { longitud: false, mayuscula: true, numero: false });
  assert.deepEqual(estado("Segura12"), { longitud: true, mayuscula: true, numero: true });
  assert.deepEqual(estado("Ñandú2026"), { longitud: true, mayuscula: true, numero: true }, "la Ñ cuenta como mayúscula, igual que en el backend");
  assert.equal(estado("A1".padEnd(73, "x")).longitud, false, "más de 72 caracteres (límite de BCrypt)");
});

test("claveCumpleReglas solo acepta la clave que el backend también acepta", () => {
  assert.equal(claveCumpleReglas("Segura123*"), true);
  assert.equal(claveCumpleReglas("clave-segura1"), false);
  assert.equal(claveCumpleReglas("SINNUMEROS"), false);
});

test("validarRegistro devuelve el primer problema en el orden del formulario", () => {
  const ok = { nombre: "Ana Pérez", correo: "ana@example.com", clave: "Segura123", confirmar: "Segura123", acepta: true };
  assert.equal(validarRegistro(ok), null);
  assert.equal(validarRegistro({ ...ok, nombre: "  " }).campo, "nombre");
  assert.equal(validarRegistro({ ...ok, correo: "ana@" }).campo, "correo");
  assert.match(validarRegistro({ ...ok, clave: "segura123", confirmar: "segura123" }).mensaje, /mayúscula/);
  assert.equal(validarRegistro({ ...ok, confirmar: "Segura124" }).campo, "confirmar-clave");
  assert.equal(validarRegistro({ ...ok, acepta: false }).campo, "acepta-terminos");
});
