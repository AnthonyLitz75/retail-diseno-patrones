// Panel del personal, rediseño del marco (v4): logotipo real, barra oscura unida al menú,
// menú con acento celeste, área clara con esquina redondeada y barra de celular en una fila.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leerCssPanel, resolverVarsCss } from "./util-css.mjs";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import { ICONOS } from "../../src/panel/iconos.js";

const css = leerCssPanel();
const variables = readFileSync(new URL("../../src/css/variables.css", import.meta.url), "utf8");
const cuenta = (texto, re) => (texto.match(re) ?? []).length;

/** Cuerpos de todas las reglas cuyo selector (lista separada por comas) es exactamente el dado. */
const regla = (selector, resolver = false) => {
  const cuerpos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  const texto = cuerpos.join(" ");
  return resolver ? resolverVarsCss(texto) : texto;
};
/** Texto del primer @media con esa consulta (llaves equilibradas). */
const media = (consulta) => {
  const i = css.indexOf(`@media ${consulta}`);
  assert.notEqual(i, -1, `falta @media ${consulta}`);
  let nivel = 0;
  for (let k = css.indexOf("{", i); k < css.length; k += 1) {
    if (css[k] === "{") nivel += 1;
    if (css[k] === "}" && --nivel === 0) return css.slice(i, k + 1);
  }
  return css.slice(i);
};

// ---------- 1. Logotipo ----------

test("1: la marca es un enlace a #/inicio con el isotipo real de la tienda y dos líneas de texto", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana López", rol: "ADMIN" });
  assert.match(barra, /<a class="panel-marca" href="#\/inicio" aria-label="Píxel Andino, inicio del panel">/);
  assert.match(barra, /<svg [^>]*width="40" height="40"[^>]*class="panel-marca-logo"[^>]*aria-hidden="true"/);
  assert.match(barra, /id="panel-squircle-bg"/, "usa renderizarLogoSvg con prefijo «panel»");
  assert.doesNotMatch(barra, />PA</, "desaparece el cuadro «PA»");
  assert.match(barra, /<span class="panel-marca-nombre">PÍXEL <span class="panel-marca-nombre-acento">ANDINO<\/span><\/span>/);
  assert.match(barra, /<span class="panel-marca-etiqueta">Panel<span class="panel-marca-etiqueta-resto"> del personal<\/span><\/span>/);
});

test("1: estilos de la marca: 16 px/800/0.04em blanco con «ANDINO» celeste; etiqueta 11 px/600/0.12em #94a3b8", () => {
  const n = regla(".panel-marca-nombre");
  assert.match(n, /font-size:\s*16px/);
  assert.match(n, /font-weight:\s*800/);
  assert.match(n, /letter-spacing:\s*0\.04em/);
  assert.match(resolverVarsCss(n), /color:\s*#ffffff/i);
  assert.match(regla(".panel-marca-nombre-acento"), /color:\s*var\(--panel-acento-cielo\)/);
  assert.match(variables + css, /--panel-acento-cielo:\s*#38bdf8/i);
  const e = regla(".panel-marca-etiqueta");
  assert.match(e, /font-size:\s*11px/);
  assert.match(e, /font-weight:\s*600/);
  assert.match(e, /letter-spacing:\s*0\.12em/);
  assert.match(e, /color:\s*var\(--panel-menu-etiqueta\)/);
  assert.match(css, /--panel-menu-etiqueta:\s*#94a3b8/i);
  assert.match(regla(".panel-marca-logo"), /width:\s*40px[^}]*height:\s*40px|height:\s*40px[^}]*width:\s*40px/);
});

// ---------- 2. Barra superior ----------

test("2: la barra usa el mismo token que el menú (sin duplicar #0b192c), borde sutil y relleno 12px 24px", () => {
  const b = regla(".panel-cabecera");
  assert.match(b, /background:\s*var\(--retail-navy\)/);
  assert.match(b, /border-bottom:\s*1px solid var\(--panel-marco-borde\)/);
  assert.match(b, /padding:\s*12px 24px/);
  assert.match(css, /--panel-marco-borde:\s*rgba\(148, 163, 184, 0\.16\)/);
  assert.match(regla(".panel-menu"), /background:\s*var\(--retail-navy\)/);
  assert.doesNotMatch(css, /#0b192c/i, "el color vive solo en el token --retail-navy");
  assert.doesNotMatch(css, /--panel-cabecera-fondo/, "token del marco anterior eliminado");
});

test("2: sin línea entre la barra y el menú: el menú cubre el borde de la barra", () => {
  assert.match(media("(min-width: 992px)"), /\.panel-menu\s*\{[^}]*margin-top:\s*-1px/);
});

test("2: «Ir a la tienda» con icono de tienda en trazo; texto #cbd5e1, 14 px, 600, 44 px", () => {
  assert.ok(Object.hasOwn(ICONOS, "tienda"));
  const barra = renderizarBarraSuperior({ nombre: "Ana", rol: "ALMACEN" });
  assert.match(barra, /<a class="panel-enlace-tienda" href="\/">\s*<svg[^>]*stroke="currentColor"[^>]*>[\s\S]*?<\/svg>\s*<span>Ir a la tienda<\/span>/);
  const r = regla(".panel-enlace-tienda");
  assert.match(resolverVarsCss(r), /color:\s*#cbd5e1/i);
  assert.match(r, /font-size:\s*14px/);
  assert.match(r, /font-weight:\s*600/);
  assert.match(r, /min-height:\s*44px/);
});

test("2: chip del usuario: pastilla translúcida, avatar #0d6efd de 36 px, nombre blanco y rol #94a3b8; sin insignia azul", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana López", rol: "ADMIN" });
  assert.doesNotMatch(barra, /panel-insignia/, "la insignia azul deja de usarse en la barra");
  assert.match(barra, /<span class="panel-chip-nombre">Ana López<\/span>\s*<span class="panel-chip-rol">Administrador<\/span>/);
  assert.match(barra, /<span class="panel-chip-rol-corto" aria-hidden="true">Admin<\/span>/);
  assert.match(regla(".panel-chip-usuario"), /background:\s*rgba\(148, 163, 184, 0\.12\)/);
  const av = regla(".panel-avatar");
  assert.match(av, /width:\s*36px/);
  assert.match(av, /background:\s*var\(--retail-blue\)/);
  assert.match(variables, /--retail-blue:\s*#0d6efd/i);
  const nom = regla(".panel-chip-nombre");
  assert.match(resolverVarsCss(nom), /color:\s*#ffffff/i);
  assert.match(nom, /font-size:\s*14px/);
  assert.match(nom, /font-weight:\s*600/);
  const rol = regla(".panel-chip-rol");
  assert.match(rol, /color:\s*var\(--panel-menu-etiqueta\)/);
  assert.match(rol, /font-size:\s*12px/);
});

test("2: «Cerrar sesión»: borde rgba(203,213,225,0.35), fondo transparente, texto #e2e8f0, 44 px", () => {
  const r = regla(".panel-boton-salir");
  assert.match(r, /border:\s*1px solid rgba\(203, 213, 225, 0\.35\)/);
  assert.match(r, /background:\s*transparent/);
  assert.match(resolverVarsCss(r), /color:\s*#e2e8f0/i);
  assert.match(r, /min-height:\s*44px/);
});

// ---------- 3. Menú lateral ----------

test("3: títulos de grupo #94a3b8 11 px/700/0.1em; entradas #cbd5e1 14 px/500; activa celeste con icono #38bdf8", () => {
  const t = regla(".panel-menu-etiqueta");
  assert.match(t, /font-size:\s*11px/);
  assert.match(t, /font-weight:\s*700/);
  assert.match(t, /letter-spacing:\s*0\.1em/);
  assert.match(t, /color:\s*var\(--panel-menu-etiqueta\)/);
  const e = regla(".panel-menu-enlace");
  assert.match(e, /color:\s*var\(--panel-menu-texto\)/);
  assert.match(e, /font-size:\s*14px/);
  assert.match(e, /font-weight:\s*500/);
  assert.match(css, /--panel-menu-texto:\s*#cbd5e1/i);
  const a = regla('.panel-menu-enlace[aria-current="page"]');
  assert.match(a, /background:\s*var\(--panel-menu-activo-fondo\)/);
  assert.match(resolverVarsCss(a), /color:\s*#ffffff/i);
  assert.match(a, /font-weight:\s*600/);
  assert.match(css, /--panel-menu-activo-fondo:\s*rgba\(56, 189, 248, 0\.16\)/);
  assert.match(regla('.panel-menu-enlace[aria-current="page"] svg'), /color:\s*var\(--panel-acento-cielo\)/);
  assert.match(resolverVarsCss(css), /\.panel-pagina \.panel-menu :focus-visible\s*\{[^}]*outline-color:\s*#ffffff/i, "el foco sigue siendo blanco");
});

// ---------- 4. Área de contenido ----------

test("4: el área es #f3f5f9; desde 992 px redondea la esquina superior izquierda a 20 px; relleno 32px 36px 40px", () => {
  assert.match(css, /--panel-area-fondo:\s*#f3f5f9/i);
  const a = regla(".panel-area");
  assert.match(a, /background:\s*var\(--panel-area-fondo\)/);
  assert.match(a, /padding:\s*32px 36px 40px/);
  assert.match(media("(min-width: 992px)"), /\.panel-area\s*\{[^}]*border-top-left-radius:\s*20px/);
  assert.match(regla(".panel-cuerpo"), /background:\s*var\(--retail-navy\)/, "el marco oscuro asoma tras la esquina redondeada");
});

// ---------- 5. Celular ----------

test("5: por debajo de 576 px: barra en una fila, isotipo de 34 px, nombre 13 px y «Panel» 10 px, menú con borde claro", () => {
  const m = media("(max-width: 575.98px)");
  assert.match(m, /\.panel-cabecera\s*\{[^}]*flex-wrap:\s*nowrap/);
  assert.match(m, /\.panel-marca-logo\s*\{[^}]*width:\s*34px[^}]*height:\s*34px/);
  assert.match(m, /\.panel-marca-nombre\s*\{[^}]*font-size:\s*13px/);
  assert.match(m, /\.panel-marca-etiqueta\s*\{[^}]*font-size:\s*10px/);
  assert.match(m, /\.panel-marca-etiqueta-resto\s*\{[^}]*display:\s*none/);
  assert.match(m, /\.panel-cabecera \.panel-enlace-tienda,\s*\.panel-cabecera \.panel-boton-salir\s*\{[^}]*display:\s*none/);
  const b = regla(".panel-boton-menu");
  assert.match(b, /border:\s*1px solid rgba\(203, 213, 225, 0\.3\)/);
  assert.match(b, /width:\s*var\(--panel-alto-pulsable\)/);
});

test("5: por debajo de 992 px el contenido tiene las esquinas superiores redondeadas a 20 px", () => {
  assert.match(media("(max-width: 991.98px)"), /\.panel-area\s*\{[^}]*border-radius:\s*20px 20px 0 0/);
});

test("5: en celular, avatar con el rol corto; el nombre y el rol largo quedan solo para lectores", () => {
  const m = media("(max-width: 991.98px)");
  assert.match(m, /\.panel-chip-rol-corto\s*\{[^}]*display:\s*inline/);
  assert.match(m, /\.panel-chip-nombre,\s*\.panel-chip-rol\s*\{[^}]*clip-path:\s*inset\(50%\)/);
});

test("5: el cajón conserva su pie con «Ir a la tienda» y «Cerrar sesión» (contorno claro, 44 px, sin relleno)", () => {
  const menu = renderizarMenuLateral("SOPORTE", "#/inicio");
  assert.match(menu, /<div class="panel-menu-pie">[\s\S]*Ir a la tienda[\s\S]*data-cerrar-sesion>Cerrar sesión<\/button>/);
  const m = media("(max-width: 575.98px)");
  const r = m.match(/\.panel-menu-pie \.panel-enlace-tienda,\s*\.panel-menu-pie \.panel-boton-salir\s*\{([^}]*)\}/)?.[1];
  assert.ok(r, "una sola regla para los dos");
  assert.match(r, /min-height:\s*44px/);
  assert.match(r, /background:\s*transparent/);
  assert.match(r, /border:\s*1px solid rgba\(255, 255, 255, 0\.35\)/);
});

// ---------- 6. Estilo de los contadores ----------

test("6: pastilla de 12 px/700, relleno 2px 8px, a la derecha; ámbar #fbbf24 con texto #0b192c e Incidencias en rojo #dc2626", () => {
  const c = regla(".panel-contador");
  assert.match(c, /font-size:\s*12px/);
  assert.match(c, /font-weight:\s*700/);
  assert.match(c, /padding:\s*2px 8px/);
  assert.match(c, /margin-left:\s*auto/);
  assert.match(c, /background:\s*var\(--panel-contador-ambar\)/);
  assert.match(c, /color:\s*var\(--retail-navy\)/);
  assert.match(css, /--panel-contador-ambar:\s*#fbbf24/i);
  assert.match(css, /--panel-contador-rojo:\s*#dc2626/i);
  assert.match(regla(".panel-contador-rojo"), /background:\s*var\(--panel-contador-rojo\)/);
  assert.match(regla(".panel-contador-rojo", true), /color:\s*#ffffff/i);
});

// ---------- 9. Limpieza ----------

test("9: sin reglas del marco anterior (cuadro «PA», insignia en la barra, relleno blanco de la barra)", () => {
  assert.doesNotMatch(css, /\.panel-marca-logo\s*\{[^}]*place-items/);
  assert.doesNotMatch(css, /panel-cabecera \.panel-insignia|\.panel-chip-usuario \.panel-insignia/);
  assert.equal(cuenta(css, /\.panel-chip-texto\s*\{/g), 1, "una sola definición");
});
