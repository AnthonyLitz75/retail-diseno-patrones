// Adelanto de T11 (panel del personal): en la cabecera de la tienda, el personal ve un
// botón «Panel del personal» que lleva a /panel.html#/inicio. El cliente y el invitado no
// ven ningún cambio. El menú lateral viejo y el login siguen igual hasta T11.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { esPersonal, DESTINO_INICIO_PANEL } from "../../src/panel/acceso.js";
import { renderizarHeader } from "../../src/layout/header.js";
import { configurarSesionYVistas } from "../../src/estado/sesion.js";

const PERSONAL = ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];

test("esPersonal: verdadero solo para los cuatro roles del personal", () => {
  for (const rol of PERSONAL) assert.equal(esPersonal(rol), true, rol);
  for (const rol of ["CLIENTE", null, undefined, "", "admin", "SUPERADMIN", 1, {}]) {
    assert.equal(esPersonal(rol), false, String(rol));
  }
});

test("la cabecera tiene el botón «Panel del personal», oculto por defecto, junto al texto de la sesión", () => {
  const html = renderizarHeader();
  const enlace = html.match(/<a [^>]*id="enlace-panel-personal"[^>]*>[\s\S]*?<\/a>/)?.[0];
  assert.ok(enlace, "existe el enlace");
  assert.match(enlace, new RegExp(`href="${DESTINO_INICIO_PANEL.replace(/[/#]/g, "\\$&")}"`));
  assert.equal(DESTINO_INICIO_PANEL, "/panel.html#/inicio");
  assert.match(enlace, /\shidden[\s>]/, "invitado y cliente no lo ven");
  assert.match(enlace, />Panel del personal<\/a>$/);
  // Mismo estilo que «Cerrar sesión» (btn btn-outline-secondary btn-sm).
  assert.match(enlace, /class="btn btn-outline-secondary btn-sm header-btn-panel"/);
  const posicionSesion = html.indexOf('id="usuario-activo"');
  const posicionEnlace = html.indexOf('id="enlace-panel-personal"');
  const posicionSalir = html.indexOf('id="cerrar-sesion"');
  assert.ok(posicionSesion < posicionEnlace && posicionEnlace < posicionSalir, "entre el texto de sesión y Cerrar sesión");
});

test("el botón mide al menos 44 px de alto", () => {
  const css = readFileSync(new URL("../../src/css/header.css", import.meta.url), "utf-8");
  const regla = css.match(/\.header-btn-panel\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(regla, /min-height:\s*44px/);
});

/** Sesión de la tienda con solo los elementos que importan para esta prueba. */
function sesionConEnlace() {
  const enlacePanelPersonal = { hidden: true };
  const sesion = configurarSesionYVistas({
    apiRequest: async () => {},
    estado: { usuarioSesion: null },
    elementos: { enlacePanelPersonal, mapaVistas: {} },
    acciones: {},
  });
  return { sesion, enlacePanelPersonal };
}

test("con sesión de personal el botón se muestra; con cliente sigue oculto", async () => {
  for (const rol of PERSONAL) {
    const { sesion, enlacePanelPersonal } = sesionConEnlace();
    await sesion.mostrarSesionActiva({ idUsuario: 1, nombre: "Ana", rol });
    assert.equal(enlacePanelPersonal.hidden, false, rol);
  }
  const { sesion, enlacePanelPersonal } = sesionConEnlace();
  await sesion.mostrarSesionActiva({ idUsuario: 2, nombre: "Rosa", rol: "CLIENTE" });
  assert.equal(enlacePanelPersonal.hidden, true);
});

test("al cerrar la sesión el botón se oculta", async () => {
  const { sesion, enlacePanelPersonal } = sesionConEnlace();
  await sesion.mostrarSesionActiva({ idUsuario: 1, nombre: "Ana", rol: "ADMIN" });
  sesion.mostrarSesionCerrada();
  assert.equal(enlacePanelPersonal.hidden, true);
});
