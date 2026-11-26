import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const plantilla = readFileSync(
  new URL("../../src/layout/plantillas/administracion.html", import.meta.url),
  "utf-8",
);
const cssAuditoriaAdmin = readFileSync(
  new URL("../../src/css/panel/soporte-admin-auditoria.css", import.meta.url),
  "utf-8",
);

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const contar = (texto, patron) => (texto.match(patron) || []).length;

test("plantilla de administración: no duplica ids y mantiene balance de etiquetas", () => {
  const ids = idsDe(plantilla);
  assert.equal(new Set(ids).size, ids.length, "Todos los ids deben ser únicos");
  assert.equal(contar(plantilla, /<div[\s>]/g), contar(plantilla, /<\/div>/g), "<div> balanceados");
  assert.equal(contar(plantilla, /<section[\s>]/g), contar(plantilla, /<\/section>/g), "<section> balanceados");
  assert.equal(contar(plantilla, /<form[\s>]/g), contar(plantilla, /<\/form>/g), "<form> balanceados");
});

test("sección categorías: conserva los ids esperados por admin-categorias.js", () => {
  const idsEsperados = [
    "admin-seccion-categorias",
    "titulo-categorias-admin",
    "form-categoria-admin",
    "nombre-categoria-admin",
    "error-nombre-categoria-admin",
    "padre-categoria-admin",
    "estado-categoria-admin",
    "reintentar-carga-categorias",
    "filtro-estado-categorias",
    "buscar-categorias-admin",
    "limpiar-busqueda-categorias",
    "alternar-todo-categorias",
    "seleccionar-resultados-categorias",
    "acciones-categorias-lote",
    "resumen-seleccion-categorias",
    "activar-categorias-seleccionadas",
    "desactivar-categorias-seleccionadas",
    "lista-categorias-admin",
  ];
  const ids = idsDe(plantilla);
  for (const id of idsEsperados) {
    assert.ok(ids.includes(id), `Falta #${id}`);
  }
});

test("sección categorías: formulario con novalidate, campo obligatorio, ejemplo y feedback de error accesible", () => {
  assert.match(plantilla, /<form[^>]*id="form-categoria-admin"[^>]*novalidate/);
  assert.match(
    plantilla,
    /<label[^>]*for="nombre-categoria-admin"[^>]*>[\s\S]*?Nombre[\s\S]*?\*[\s\S]*?\(obligatorio\)/,
  );
  assert.match(
    plantilla,
    /<input[^>]*id="nombre-categoria-admin"[^>]*placeholder="[^"]+"[^>]*aria-describedby="error-nombre-categoria-admin"[^>]*required/,
  );
  assert.match(
    plantilla,
    /<p[^>]*id="error-nombre-categoria-admin"[^>]*class="invalid-feedback[^"]*"[^>]*role="alert"/,
  );
});

test("sección categorías: filtros de estado, limpieza de búsqueda y control global del árbol", () => {
  assert.match(
    plantilla,
    /<div[^>]*id="filtro-estado-categorias"[^>]*role="group"[^>]*aria-label="Filtrar categorías por estado"/,
  );
  assert.match(plantilla, /data-estado="todas"[^>]*aria-pressed="true"/);
  assert.match(plantilla, /data-estado="activas"[^>]*aria-pressed="false"/);
  assert.match(plantilla, /data-estado="inactivas"[^>]*aria-pressed="false"/);
  assert.match(
    plantilla,
    /<button[^>]*id="limpiar-busqueda-categorias"[^>]*type="button"[^>]*aria-label="Limpiar búsqueda"[^>]*hidden/,
  );
  assert.match(plantilla, /<button[^>]*id="alternar-todo-categorias"[^>]*type="button"/);
});

test("panel administrativo: oculta el h2 genérico Administración dentro de #vista-administracion", () => {
  assert.match(
    cssAuditoriaAdmin,
    /\.panel-pagina\s+#vista-administracion\s+#titulo-administracion\s*\{\s*display:\s*none;\s*\}/,
  );
});
