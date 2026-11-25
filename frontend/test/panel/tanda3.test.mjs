// Panel del personal, tanda 3: retoques finales de fidelidad (columna derecha de Almacén,
// espaciado de cabeceras de tarjeta, indicadores en celular, actividad, barra y pie del cajón).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderizarActividad } from "../../src/panel/inicio/admin-inicio.js";
import { actividadReciente } from "../../src/panel/inicio/admin-logica.js";

const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf8");
/** Cuerpos de todas las reglas cuyo selector (lista separada por comas) es exactamente el dado. */
const regla = (selector) => {
  const cuerpos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return cuerpos.join(" ");
};

// ---------- 1. Almacén ----------

test("1: en escritorio ancho (donde hay dos columnas) la columna derecha de Almacén mide al menos 340 px y las columnas de la cola se alinean arriba", () => {
  assert.match(css, /@media \(min-width: 1200px\)\s*\{\s*\.panel-inicio-rejilla-cola\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(340px,/);
  assert.match(regla(".panel-cola"), /align-items:\s*start/);
});

// ---------- 2. Cabeceras de tarjeta ----------

test("2: la cabecera de tarjeta con enlace ocupa lo mismo que el título solo («Productos con stock bajo»)", () => {
  const titulo = regla(".panel-subtitulo");
  const cabecera = regla(".panel-bloque-cabecera");
  assert.match(titulo, /margin:\s*0 0 16px/);
  assert.match(cabecera, /margin-bottom:\s*16px/, "mismo margen inferior que el título solo");
  assert.match(regla(".panel-bloque-cabecera .panel-subtitulo"), /margin:\s*0/);
  // El enlace conserva su zona de 44 px sin alargar la cabecera (margen negativo).
  assert.match(regla(".panel-bloque-cabecera .panel-enlace"), /margin-block:\s*-12px/);
  assert.doesNotMatch(cabecera, /margin-top|padding-top/);
});

// ---------- 3. Indicadores en celular ----------

test("3: por debajo de 576 px el valor de los indicadores usa clamp() y no se corta", () => {
  assert.match(css, /@media \(max-width: 575\.98px\)\s*\{[^@]*\.panel-kpi-valor\s*\{[^}]*font-size:\s*clamp\(/);
  assert.match(css, /\.panel-kpi-valor\s*\{[^}]*overflow-wrap:\s*normal/);
});

// ---------- 4. Actividad reciente ----------

test("4: el detalle de la actividad va en dos líneas fijas: «{usuario} · {rol}» y la fecha debajo", () => {
  const html = renderizarActividad([{ titulo: "Inicio de sesión", detalle: "Ana · ADMIN · 24/11/26, 10:05 a. m.", actor: "Ana · ADMIN", fecha: "24/11/26, 10:05 a. m." }]).replaceAll("&#x2F;", "/");
  assert.match(html, /<p class="panel-actividad-detalle panel-actividad-actor"[^>]*>Ana · ADMIN<\/p>\s*<p class="panel-actividad-detalle panel-actividad-fecha">24\/11\/26, 10:05 a\. m\.<\/p>/);
  assert.match(regla(".panel-actividad-actor"), /white-space:\s*nowrap/);
  assert.match(regla(".panel-actividad-fecha"), /white-space:\s*nowrap/);
});

test("4: actividadReciente separa usuario y rol de la fecha", () => {
  const [item] = actividadReciente({ items: [{ accion: "X", accionEtiqueta: "Inicio de sesión", fecha: "2026-11-24T15:05:00Z", usuarioNombre: "Ana", usuarioRol: "ADMIN", usuarioCorreo: "ana@example.com" }] });
  assert.ok(item.actor && !item.actor.includes("/"), item.actor);
  assert.ok(item.fecha);
  assert.equal(item.detalle, `${item.actor} · ${item.fecha}`);
});

// ---------- 5. Barra en celular ----------

test("5: por debajo de 576 px la barra muestra «PA» seguido del texto «Panel»", () => {
  const i = css.indexOf("Tanda 3");
  assert.notEqual(i, -1);
  const t3 = css.slice(i);
  assert.match(t3, /@media \(max-width: 575\.98px\)\s*\{[\s\S]*?\.panel-marca-etiqueta\s*\{[^}]*display:\s*inline-block/);
});

// ---------- 6. Pie del cajón ----------

test("6: «Ir a la tienda» y «Cerrar sesión» del pie del cajón comparten el mismo estilo de contorno claro de 44 px", () => {
  const t3 = css.slice(css.indexOf("Tanda 3"));
  const r = t3.match(/\.panel-menu-pie \.panel-enlace-tienda,\s*\.panel-menu-pie \.panel-boton-salir\s*\{([^}]*)\}/)?.[1];
  assert.ok(r, "una sola regla para los dos");
  assert.match(r, /min-height:\s*44px/);
  assert.match(r, /background:\s*transparent/);
  assert.match(r, /border:\s*1px solid rgba\(255, 255, 255, 0\.35\)/);
  assert.match(r, /color:\s*#ffffff/i);
  assert.doesNotMatch(css.slice(css.indexOf("Tanda 2"), css.indexOf("Tanda 3")), /\.panel-menu-pie \.panel-boton-salir\s*\{[^}]*background:\s*#fff/i);
});
