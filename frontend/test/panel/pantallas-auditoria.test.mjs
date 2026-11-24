// Panel del personal (spec 19, T10): pantalla #/auditoria (spec 18), solo para ADMIN, y fin del
// marcador temporal.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolverRuta, crearPanelRouter } from "../../src/panel/panel-router.js";
import { entradasDeRol } from "../../src/panel/menu-por-rol.js";
import { renderizarEncabezadoAuditoria } from "../../src/panel/pantallas/auditoria.js";

test("encabezado: <h1> «Auditoría», la frase de apoyo y el hueco para «Descargar CSV» a la derecha", () => {
  const html = renderizarEncabezadoAuditoria();
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Auditoría<\/h1>/);
  assert.match(html, /Registro de quién hizo qué en el sistema\. Solo lectura\./);
  assert.match(html, /<div class="panel-acciones-encabezado" data-acciones-auditoria><\/div>/);
});

test("solo ADMIN entra a #/auditoria; los demás vuelven a #/inicio con el aviso", () => {
  assert.equal(resolverRuta("#/auditoria", "ADMIN").ruta, "#/auditoria");
  for (const rol of ["VENDEDOR", "ALMACEN", "SOPORTE"]) {
    const r = resolverRuta("#/auditoria", rol);
    assert.equal(r.ruta, "#/inicio", rol);
    assert.equal(r.redireccion.motivo, "sin-acceso", rol);
  }
});

test("el marcador desaparece: no existe el archivo y cada ruta de cada rol tiene su pantalla", async () => {
  assert.equal(existsSync(new URL("../../src/panel/pantallas/marcador.js", import.meta.url)), false);
  const ventana = { location: { hash: "" }, history: {}, addEventListener() {} };
  for (const rol of ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"]) {
    const router = crearPanelRouter({ rol, ventana, documento: {}, menu: null, area: null, mostrarToast() {} });
    for (const { ruta } of entradasDeRol(rol)) {
      assert.equal(typeof router.cargadores[ruta], "function", `${rol} ${ruta}`);
    }
  }
});

test("insignias de acción (span[data-accion]) en forma de pastilla: azul, ámbar, verde y neutro por defecto", () => {
  const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf-8");
  const regla = (selector) => css.match(new RegExp(`${selector.replace(/[[\]"#.]/g, "\\$&")}[^{]*\\{([^}]*)\\}`))?.[1] ?? "";
  const neutra = regla('#admin-seccion-auditoria span[data-accion]');
  assert.match(neutra, /--panel-insignia-neutro-fondo/);
  assert.match(neutra, /border-radius:\s*var\(--panel-radio-pastilla\)/, "forma de pastilla");
  assert.doesNotMatch(css, /td\[data-accion/, "el atributo ya no está en la celda");
  assert.match(css, /span\[data-accion="PEDIDO_ESTADO"\][^{]*\{[^}]*--panel-insignia-azul-fondo/);
  assert.match(css, /span\[data-accion="PRECIO_CAMBIADO"\],[\s\S]*?span\[data-accion="STOCK_AJUSTADO"\][^{]*\{[^}]*--panel-insignia-ambar-fondo/);
  assert.match(css, /span\[data-accion="PRODUCTO_EDITADO"\][^{]*\{[^}]*--panel-insignia-verde-fondo/);
});

test("el título propio del módulo se oculta en el panel (no hay dos títulos)", () => {
  const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf-8");
  assert.match(css, /\.panel-pagina #titulo-auditoria-admin\s*\{[^}]*display:\s*none/);
});
