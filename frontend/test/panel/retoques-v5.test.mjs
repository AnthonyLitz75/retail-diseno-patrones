// Panel del personal: últimos retoques (v5) de «Cuentas y roles» y del Inicio del administrador.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leerCssPanel, resolverVarsCss } from "./util-css.mjs";
import { ordenarCuentas } from "../../src/administracion/cuentas-logica.js";
import { renderizarEncabezadoCuentas } from "../../src/panel/pantallas/administracion.js";
import { indicadoresAdmin } from "../../src/panel/inicio/admin-logica.js";
import { renderizarIndicadoresAdmin, renderizarInicioAdmin } from "../../src/panel/inicio/admin-inicio.js";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const css = leerCssPanel();
const plantilla = leer("../../src/layout/plantillas/administracion.html");
const seccionCuentas = plantilla.slice(plantilla.indexOf('<section id="admin-seccion-cuentas"'), plantilla.indexOf('<section id="admin-seccion-categorias"'));
const visible = (html) => html.replaceAll("&#x2F;", "/");

/** Cuerpo (con llaves equilibradas) de cada `@media <consulta> { … }`, concatenados. */
function bloquesMedia(consulta) {
  let salida = "";
  let desde = 0;
  for (;;) {
    const i = css.indexOf(`@media ${consulta}`, desde);
    if (i < 0) break;
    const abre = css.indexOf("{", i);
    let nivel = 1;
    let j = abre + 1;
    while (nivel > 0 && j < css.length) {
      if (css[j] === "{") nivel += 1;
      else if (css[j] === "}") nivel -= 1;
      j += 1;
    }
    salida += css.slice(abre + 1, j - 1);
    desde = j;
  }
  assert.ok(salida, `falta @media ${consulta}`);
  return salida;
}
/** Cuerpos de las reglas de `texto` cuyo selector (lista por comas) es exactamente `selector`. */
function reglaEn(texto, selector) {
  const cuerpos = [];
  for (const m of texto.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return resolverVarsCss(cuerpos.join(" "));
}
const regla = (selector) => reglaEn(css, selector);
const movil = () => bloquesMedia("(max-width: 575.98px)");

// ---------- Cuentas y roles ----------

test("1: los títulos de las tarjetas de Cuentas usan .panel-subtitulo (17 px, 700) y no el .h5 de Bootstrap", () => {
  for (const titulo of ["Cuentas y personal", "Nueva cuenta del personal", "Qué puede hacer cada rol"]) {
    assert.match(seccionCuentas, new RegExp(`<h3[^>]*class="panel-subtitulo"[^>]*>${titulo}</h3>`), titulo);
  }
  assert.doesNotMatch(seccionCuentas, /class="h5"/);
  assert.match(regla(".panel-subtitulo"), /font-size:\s*17px/);
  assert.match(regla(".panel-subtitulo"), /font-weight:\s*700/);
});

test("2: bajo el <h1> de Cuentas va la frase de apoyo con el estilo de subtítulo de los Inicios", () => {
  const html = renderizarEncabezadoCuentas("Cuentas y roles");
  assert.match(html, /<h1 class="panel-titulo">Cuentas y roles<\/h1>\s*<p class="panel-apoyo">Crea cuentas del personal y cambia su rol\. Cada cambio queda en la auditoría\.<\/p>/);
});

test("3: «Actualizar cuentas» es un botón secundario del panel de 44 px (48 px en celular)", () => {
  assert.match(seccionCuentas, /<button id="recargar-cuentas-admin" class="panel-boton panel-boton-secundario" type="button">Actualizar cuentas<\/button>/);
  assert.match(regla("#recargar-cuentas-admin"), /min-height:\s*44px/);
  assert.match(reglaEn(movil(), "#recargar-cuentas-admin"), /min-height:\s*48px/);
});

test("4: «Crear cuenta» usa el botón primario del panel (#0a58ca), no .btn-primary", () => {
  assert.match(seccionCuentas, /<button class="panel-boton panel-boton-principal w-100" type="submit">Crear cuenta<\/button>/);
  assert.doesNotMatch(seccionCuentas, /btn-primary/);
  assert.match(css, /--retail-blue-dark|#0a58ca/);
  assert.match(css, /\.panel-boton-principal[\s\S]*?background:\s*var\(--retail-blue-dark\)/);
});

test("5: «Desactivar» deshabilitado lleva borde #e2e8f0 y texto #64748b, sin atenuar el rojo", () => {
  const r = regla(".cuenta-desactivar:disabled");
  assert.match(r, /border-color:\s*#e2e8f0/i);
  assert.match(r, /color:\s*#64748b/i);
  assert.doesNotMatch(r, /opacity/);
});

test("6: las descripciones de los roles empiezan con mayúscula", () => {
  for (const texto of [
    "Todo el panel: cuentas, categorías, reportes, incidencias y auditoría.",
    "Productos, consultas de clientes y pedidos pendientes.",
    "Pedidos por atender, despachos e inventario.",
    "Reclamos, devoluciones y consulta de pedidos.",
    "Solo la tienda: compras y su atención.",
  ]) {
    assert.ok(seccionCuentas.includes(`<dd>${texto}</dd>`), texto);
  }
});

test("7: la lista se ordena por rol (Administrador, Vendedor, Almacén, Soporte, Cliente) y, dentro de cada rol, por nombre", () => {
  const c = (idUsuario, nombre, rol) => ({ idUsuario, nombre, rol, correo: `${idUsuario}@x.pe` });
  const lista = [
    c(1, "Zoe Cliente", "CLIENTE"), c(2, "Óscar Soporte", "SOPORTE"), c(3, "ana soporte", "SOPORTE"),
    c(4, "Beto Admin", "ADMIN"), c(5, "Carla Almacén", "ALMACEN"), c(6, "Ángel Admin", "ADMIN"),
    c(7, "Vera Vendedor", "VENDEDOR"), c(8, "Otro", "DESCONOCIDO"),
  ];
  const copia = structuredClone(lista);
  assert.deepEqual(ordenarCuentas(lista).map((x) => x.idUsuario), [6, 4, 7, 5, 3, 2, 1, 8]);
  assert.deepEqual(lista, copia, "no modifica la lista original");
  assert.deepEqual(ordenarCuentas([]), []);
});

test("8: la opción por defecto de «Rol inicial» es «Selecciona un rol»", () => {
  assert.match(seccionCuentas, /<option value="">Selecciona un rol<\/option>/);
  assert.doesNotMatch(seccionCuentas, /<option value="">Selecciona<\/option>/);
});

// ---------- Inicio del administrador ----------

const resumen = {
  ventasNetas: 1625, pedidosVendidos: 15, escalados: 2, valorInventario: 1000, unidadesEnStock: 10, productosActivos: 3,
  pedidosPorEstado: { PENDIENTE: 1 },
};

test("9: «Reclamos escalados» en alerta separa el texto «Esperan al administrador» del enlace «Atender»", () => {
  assert.equal(indicadoresAdmin(resumen)[2].detalle, "Esperan al administrador");
  const html = visible(renderizarIndicadoresAdmin(indicadoresAdmin(resumen)));
  assert.match(html, /<p class="panel-kpi-detalle">Esperan al administrador<\/p>\s*<a class="panel-kpi-enlace" href="#\/incidencias">Atender<\/a>/);
  assert.match(regla(".panel-kpi-enlace"), /font-weight:\s*600/);
  assert.match(regla(".panel-kpi-enlace"), /text-decoration:\s*none/);
  assert.match(regla(".panel-kpi-enlace:hover"), /text-decoration:\s*underline/);
  assert.match(regla(".panel-kpi-enlace:focus-visible"), /text-decoration:\s*underline/);
});

test("10: por debajo de 576 px se ocultan los cuadros de icono de los cuatro indicadores", () => {
  const m = movil();
  assert.match(reglaEn(m, ".panel-kpi > .panel-icono-cuadro"), /display:\s*none/);
  assert.match(reglaEn(m, ".panel-kpi .panel-kpi-etiqueta"), /padding-right:\s*0/);
});

test("11: por debajo de 576 px cada fila de atención apila icono y texto arriba y el botón debajo (ancho completo, 48 px)", () => {
  const m = movil();
  assert.match(reglaEn(m, ".panel-atencion:not(.panel-atencion-fallo)"), /display:\s*grid/);
  const boton = reglaEn(m, ".panel-inicio .panel-atencion .panel-boton");
  assert.match(boton, /min-height:\s*48px/);
  assert.match(boton, /width:\s*100%/);
  assert.match(boton, /grid-column:\s*1\s*\/\s*-1/);
});

test("12: en los atajos, desde 992 px, icono de 28 px y relleno horizontal de 10 px", () => {
  const m = bloquesMedia("(min-width: 992px)");
  assert.match(reglaEn(m, ".panel-atajo"), /padding:\s*8px 10px/);
  const icono = reglaEn(m, ".panel-atajo .panel-icono-cuadro");
  assert.match(icono, /width:\s*28px/);
  assert.match(icono, /height:\s*28px/);
  const html = renderizarInicioAdmin({ hoy: new Date(2026, 10, 25) });
  assert.match(html, /class="panel-atajo"/);
});

test("12b: la columna derecha del Inicio mide al menos 380 px para que los atajos quepan en una línea", () => {
  assert.match(css, /\.panel-inicio-rejilla-admin\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(380px, 36%\)/);
});
