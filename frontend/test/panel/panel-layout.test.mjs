// Panel del personal (spec 19, T03): marco del panel (barra superior, chip y menú lateral)
// e íconos. Funciones puras que devuelven marcado; el arranque solo las pinta.
import test from "node:test";
import assert from "node:assert/strict";
import {
  ETIQUETA_ROL,
  etiquetaRol,
  renderizarBarraSuperior,
  renderizarMenuLateral,
} from "../../src/panel/panel-layout.js";
import { ICONOS, icono } from "../../src/panel/iconos.js";
import { iniciales } from "../../src/panel/utilidades-panel.js";
import { entradasDeRol } from "../../src/panel/menu-por-rol.js";

const PERSONAL = ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE"];
const contar = (texto, patron) => (texto.match(patron) || []).length;

test("los nombres de rol se definen en un solo lugar, para los cuatro roles", () => {
  assert.deepEqual({ ...ETIQUETA_ROL }, {
    ADMIN: "Administrador",
    VENDEDOR: "Vendedor",
    ALMACEN: "Almacén",
    SOPORTE: "Soporte",
  });
  assert.ok(Object.isFrozen(ETIQUETA_ROL));
  for (const rol of PERSONAL) assert.equal(etiquetaRol(rol), ETIQUETA_ROL[rol]);
  assert.equal(etiquetaRol("CLIENTE"), "");
  assert.equal(etiquetaRol(null), "");
});

test("iniciales: primera letra de las dos primeras palabras, en mayúsculas", () => {
  assert.equal(iniciales("Ana María López"), "AM");
  assert.equal(iniciales("  carlos   ruiz "), "CR");
  assert.equal(iniciales("ángel"), "Á");
  assert.equal(iniciales("Ñusta Quispe"), "ÑQ");
  for (const vacio of ["", "   ", null, undefined, 42]) {
    assert.equal(iniciales(vacio), "?", String(vacio));
  }
});

test("hay un ícono por entrada del menú y uno para cerrar sesión (spec 11)", () => {
  const esperados = [
    "inicio", "pedidos", "productos", "inventario", "categorias", "cuentas", "reportes",
    "auditoria", "incidencias", "consultas", "reclamos", "devoluciones", "consulta-pedido", "tienda", "descarga", "mas", "cerrar-sesion",
    "reloj", "verificacion", "pagado", "preparacion", "despacho", "entrega", "cancelar",
  ];
  assert.deepEqual(Object.keys(ICONOS).sort(), [...esperados].sort());
  for (const nombre of esperados) {
    const svg = icono(nombre);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 24 24"/, nombre);
    assert.match(svg, /stroke="currentColor"/, nombre);
    assert.match(svg, /stroke-width="1\.8"/, nombre);
    assert.match(svg, /aria-hidden="true"/, nombre);
    assert.match(svg, /focusable="false"/, nombre);
  }
  for (const rol of PERSONAL) {
    for (const entrada of entradasDeRol(rol)) assert.ok(Object.hasOwn(ICONOS, entrada.icono), entrada.icono);
  }
  assert.equal(icono("no-existe"), "");
});

test("la barra superior tiene marca, enlace a la tienda, chip del usuario y cerrar sesión", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana López", rol: "ADMIN" });
  assert.match(barra, /^<header/);
  assert.match(barra, /PÍXEL <span class="panel-marca-nombre-acento">ANDINO/, "marca en texto, sin el cuadro «PA»");
  assert.match(barra, /Píxel Andino/);
  assert.match(barra.replace(/<[^>]+>/g, ""), /Panel del personal/, "el texto completo sigue ahí (en celular solo se ve «Panel»)");
  assert.match(barra, /<a [^>]*href="\/"[^>]*>[\s\S]*?Ir a la tienda/);
  assert.match(barra, />AL</);
  assert.match(barra, />Ana López</);
  assert.match(barra, />Administrador</);
  assert.match(barra, /<button [^>]*type="button"[^>]*id="panel-cerrar-sesion"/);
  assert.match(barra, /Cerrar sesión/);
  assert.equal(contar(barra, /<svg/g), 3, "isotipo, ícono de la tienda e ícono de cerrar sesión");
});

test("la barra superior no trae nada de la tienda", () => {
  const barra = renderizarBarraSuperior({ nombre: "Ana", rol: "VENDEDOR" });
  for (const ajeno of [/whatsapp/i, /footer/i, /carrito/i, /notificaciones/i, /redes/i, /campana/i]) {
    assert.doesNotMatch(barra, ajeno);
  }
});

test("la barra superior escapa el nombre del usuario", () => {
  const barra = renderizarBarraSuperior({ nombre: '<img src=x onerror="alert(1)">', rol: "SOPORTE" });
  assert.doesNotMatch(barra, /<img/);
  assert.match(barra, /&lt;img/);
});

test("el menú lateral pinta los grupos y entradas del rol con su ícono", () => {
  for (const rol of PERSONAL) {
    const menu = renderizarMenuLateral(rol);
    const entradas = entradasDeRol(rol);
    assert.match(menu, new RegExp(`^<nav [^>]*aria-label="Menú de ${ETIQUETA_ROL[rol]}"`), rol);
    // El cajón trae además «Ir a la tienda» y «Cerrar sesión» en su pie (tanda 2, punto 8).
    assert.equal(contar(menu, /class="panel-menu-enlace"/g), entradas.length, rol);
    assert.equal(contar(menu, /<svg[^>]*aria-hidden="true"/g), entradas.length, rol);
    for (const { ruta, etiqueta } of entradas) {
      assert.match(menu, new RegExp(`href="${ruta}"[^>]*>[\\s\\S]*?${etiqueta}`), `${rol} ${ruta}`);
    }
  }
  const admin = renderizarMenuLateral("ADMIN");
  assert.ok(admin.indexOf("Operación") < admin.indexOf("Administración"));
});

test("el menú marca con aria-current solo la ruta activa", () => {
  const menu = renderizarMenuLateral("ALMACEN", "#/pedidos");
  assert.equal(contar(menu, /aria-current="page"/g), 1);
  assert.match(menu, /href="#\/pedidos"[^>]*aria-current="page"/);
  assert.equal(contar(renderizarMenuLateral("ALMACEN"), /aria-current/g), 0);
});

test("CLIENTE o un rol desconocido no tienen menú lateral", () => {
  for (const rol of ["CLIENTE", null, "", "SUPERADMIN"]) {
    assert.equal(renderizarMenuLateral(rol), "", String(rol));
  }
});
