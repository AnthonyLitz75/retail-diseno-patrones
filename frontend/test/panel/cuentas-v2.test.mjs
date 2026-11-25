// Panel del personal: pantalla «Cuentas y roles» rediseñada (encabezado, filtros por rol con
// contador, buscador, tabla de cuentas con cambio de rol sin guardar, alta en columna derecha).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  ORDEN_ROLES, altaCorta, contarPorRol, estadoCambioRol, etiquetaRolCuenta, filtrarCuentas, htmlCambioRol, htmlFilaCuenta, normalizarTexto,
} from "../../src/administracion/cuentas-logica.js";
import { renderizarEncabezadoCuentas } from "../../src/panel/pantallas/administracion.js";
import { ETIQUETAS_COLUMNAS_CUENTAS } from "../../src/administracion/admin-usuarios.js";

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), "utf8");
const plantilla = leer("../../src/layout/plantillas/administracion.html");
const css = leer("../../src/css/panel.css");
const cuenta = (texto, re) => (texto.match(re) ?? []).length;
const regla = (selector) => {
  const cuerpos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return cuerpos.join(" ");
};
const seccionCuentas = plantilla.slice(plantilla.indexOf('<section id="admin-seccion-cuentas"'), plantilla.indexOf('<section id="admin-seccion-categorias"'));

const cuentas = [
  { idUsuario: 1, nombre: "Administrador de prueba", correo: "admin.prueba@example.com", rol: "ADMIN", activo: true, fechaAlta: "2026-11-24T05:00:00Z" },
  { idUsuario: 2, nombre: "Vendedor de prueba", correo: "vendedor.prueba@example.com", rol: "VENDEDOR", activo: true, fechaAlta: "2026-11-24T05:00:00Z" },
  { idUsuario: 3, nombre: "Soporte Dos", correo: "soporte.dos@example.com", rol: "SOPORTE", activo: false, fechaAlta: "2026-11-25T05:00:00Z" },
  { idUsuario: 4, nombre: "Ángela Núñez", correo: "angela@example.com", rol: "SOPORTE", activo: true, fechaAlta: null },
  { idUsuario: 5, nombre: "Cliente de prueba", correo: "registro.web@example.com", rol: "CLIENTE", activo: true, fechaAlta: "2026-11-24T05:00:00Z" },
];

// ---------- Lógica pura ----------

test("roles legibles y orden de los filtros: Administrador, Vendedor, Almacén, Soporte, Cliente", () => {
  assert.deepEqual([...ORDEN_ROLES], ["ADMIN", "VENDEDOR", "ALMACEN", "SOPORTE", "CLIENTE"]);
  assert.deepEqual(ORDEN_ROLES.map(etiquetaRolCuenta), ["Administrador", "Vendedor", "Almacén", "Soporte", "Cliente"]);
  assert.equal(etiquetaRolCuenta("OTRO"), "OTRO");
});

test("normalizarTexto ignora mayúsculas y tildes", () => {
  assert.equal(normalizarTexto("  ÁNGELA Núñez "), "angela nunez");
  assert.equal(normalizarTexto(null), "");
});

test("el contador por rol se calcula sobre la lista completa (Todos primero)", () => {
  assert.deepEqual(contarPorRol(cuentas), { "": 5, ADMIN: 1, VENDEDOR: 1, ALMACEN: 0, SOPORTE: 2, CLIENTE: 1 });
  assert.deepEqual(contarPorRol([]), { "": 0, ADMIN: 0, VENDEDOR: 0, ALMACEN: 0, SOPORTE: 0, CLIENTE: 0 });
});

test("el buscador filtra por nombre o correo sin distinguir mayúsculas ni tildes y se combina con el rol", () => {
  assert.deepEqual(filtrarCuentas(cuentas, { texto: "angela" }).map((c) => c.idUsuario), [4]);
  assert.deepEqual(filtrarCuentas(cuentas, { texto: "NUÑEZ" }).map((c) => c.idUsuario), [4]);
  assert.deepEqual(filtrarCuentas(cuentas, { texto: "example.com" }).length, 5);
  assert.deepEqual(filtrarCuentas(cuentas, { texto: "prueba" }).map((c) => c.idUsuario), [1, 2, 5]);
  assert.deepEqual(filtrarCuentas(cuentas, { rol: "SOPORTE" }).map((c) => c.idUsuario), [3, 4]);
  assert.deepEqual(filtrarCuentas(cuentas, { rol: "SOPORTE", texto: "dos" }).map((c) => c.idUsuario), [3]);
  assert.deepEqual(filtrarCuentas(cuentas, { rol: "ADMIN", texto: "vendedor" }), []);
  assert.equal(filtrarCuentas(cuentas, {}).length, 5);
});

test("fecha de alta corta dd/mm/aa; sin fecha, «—»", () => {
  assert.match(altaCorta("2026-11-24T15:00:00Z"), /^24\/11\/26$/);
  assert.equal(altaCorta(null), "—");
  assert.equal(altaCorta("no-es-fecha"), "—");
});

test("cambio de rol sin guardar: solo si el elegido difiere del guardado", () => {
  assert.deepEqual(estadoCambioRol({ rol: "VENDEDOR" }, "ALMACEN"), { cambiado: true, antes: "Vendedor" });
  assert.deepEqual(estadoCambioRol({ rol: "VENDEDOR" }, "VENDEDOR"), { cambiado: false, antes: "Vendedor" });
  assert.deepEqual(estadoCambioRol({ rol: "VENDEDOR" }, ""), { cambiado: false, antes: "Vendedor" });
});

// ---------- Marcado de la fila ----------

test("fila: Cuenta (th scope=row) con iniciales por rol, nombre, «(tú)», correo y alta; rol con selector legible; estado; acciones", () => {
  const html = htmlFilaCuenta(cuentas[0], { idActual: 1 });
  assert.match(html, /^<tr>/);
  assert.match(html, /<th scope="row">[\s\S]*<span class="panel-avatar-rol panel-rol-admin" aria-hidden="true">AP<\/span>/);
  assert.match(html, /<span class="cuenta-nombre">Administrador de prueba<\/span>\s*<span class="cuenta-tu">\(tú\)<\/span>/);
  assert.match(html, /<span class="cuenta-correo">admin\.prueba@example\.com<\/span>/);
  assert.match(html.replaceAll("&#x2F;", "/"), /<span class="cuenta-alta">Alta \d{2}\/\d{2}\/\d{2}<\/span>/);
  assert.match(html, /<select class="form-select form-select-sm" aria-label="Rol de Administrador de prueba">/);
  for (const [valor, texto] of [["ADMIN", "Administrador"], ["VENDEDOR", "Vendedor"], ["ALMACEN", "Almacén"], ["SOPORTE", "Soporte"], ["CLIENTE", "Cliente"]]) {
    assert.match(html, new RegExp(`<option value="${valor}"[^>]*>${texto}</option>`), valor);
  }
  assert.match(html, /<option value="ADMIN" selected>/);
  assert.match(html, /<span class="cuenta-estado cuenta-estado-activa"><span class="cuenta-estado-punto" aria-hidden="true"><\/span>Activa<\/span>/);
  assert.doesNotMatch(htmlFilaCuenta(cuentas[1], { idActual: 1 }), /\(tú\)/);
  assert.equal(cuenta(html, /<th /g), 1);
  assert.equal(cuenta(html, /<td/g), 3, "Rol, Estado y Acciones");
});

test("fila: «Desactivar» con contorno rojo; deshabilitado en la propia cuenta (con title) y en las desactivadas", () => {
  const propia = htmlFilaCuenta(cuentas[0], { idActual: 1 });
  assert.match(propia, /<button type="button" class="cuenta-desactivar"[^>]*data-accion="desactivar"[^>]*disabled[^>]*title="No puedes desactivar tu propia cuenta"[^>]*>Desactivar<\/button>/);
  const otra = htmlFilaCuenta(cuentas[1], { idActual: 1 });
  assert.match(otra, /<button type="button" class="cuenta-desactivar" data-accion="desactivar" data-usuario-id="2" data-usuario-nombre="Vendedor de prueba">Desactivar<\/button>/);
  const inactiva = htmlFilaCuenta(cuentas[2], { idActual: 1 });
  assert.match(inactiva, /cuenta-desactivar[^>]*disabled/);
  assert.match(inactiva, /<span class="cuenta-estado cuenta-estado-inactiva">[\s\S]*Desactivada<\/span>/);
  assert.match(regla(".cuenta-desactivar"), /border:\s*1px solid #fca5a5/i);
  assert.match(regla(".cuenta-desactivar"), /color:\s*#b91c1c/i);
});

test("fila: sin cambios no hay botón de guardar; con un rol distinto sale «Antes: …», «Guardar» y la fila en ámbar", () => {
  const sin = htmlFilaCuenta(cuentas[1], { idActual: 1 });
  assert.doesNotMatch(sin, /guardar-rol/);
  assert.doesNotMatch(sin, /Antes:/);
  assert.doesNotMatch(sin, /cuenta-modificada/);
  const con = htmlFilaCuenta(cuentas[1], { idActual: 1, rolElegido: "ALMACEN" });
  assert.match(con, /^<tr class="cuenta-modificada">/);
  assert.match(con, /<option value="ALMACEN" selected>/);
  assert.match(con, /<select class="form-select form-select-sm cuenta-rol-cambiado"/);
  assert.match(con, /<p class="cuenta-antes">Antes: Vendedor<\/p>\s*<button type="button" class="cuenta-guardar" data-accion="guardar-rol" data-usuario-id="2" data-usuario-nombre="Vendedor de prueba">Guardar<\/button>/);
  assert.equal(htmlCambioRol(cuentas[1], "VENDEDOR"), "", "si se vuelve al original, el bloque desaparece");
  assert.match(htmlCambioRol(cuentas[1], "SOPORTE"), /Antes: Vendedor/);
  assert.match(regla(".cuenta-modificada"), /background:\s*#fffbeb/i);
  assert.match(regla(".cuenta-rol-cambiado"), /border-color:\s*#d97706/i);
});

test("fila: los textos de los usuarios se escapan", () => {
  const html = htmlFilaCuenta({ ...cuentas[1], nombre: '<img src=x onerror="a()">' }, { idActual: 9 });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

// ---------- Plantilla ----------

test("encabezado de la pantalla: «Nueva cuenta» (primario, con «+»), id propio", () => {
  const html = renderizarEncabezadoCuentas("Cuentas y roles");
  assert.match(html, /<h1 class="panel-titulo">Cuentas y roles<\/h1>/);
  assert.match(html, /<button type="button" id="cuentas-nueva" class="panel-boton panel-boton-principal"><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*<span>Nueva cuenta<\/span><\/button>/);
});

test("filtro por rol: grupo de botones con aria-pressed, Todos primero y los roles legibles", () => {
  assert.match(seccionCuentas, /<div id="filtro-rol-cuentas" class="cuentas-filtros" role="group" aria-label="Filtrar por rol">/);
  const botones = [...seccionCuentas.matchAll(/<button type="button" class="cuentas-filtro"[^>]*data-rol="([A-Z]*)"[^>]*aria-pressed="(true|false)"[^>]*>([^<]*)</g)];
  assert.deepEqual(botones.map((b) => [b[1], b[2], b[3]]), [
    ["", "true", "Todos"], ["ADMIN", "false", "Administrador"], ["VENDEDOR", "false", "Vendedor"],
    ["ALMACEN", "false", "Almacén"], ["SOPORTE", "false", "Soporte"], ["CLIENTE", "false", "Cliente"],
  ]);
  assert.doesNotMatch(seccionCuentas, /<select id="filtro-rol-cuentas"/);
  assert.match(regla(".cuentas-filtros"), /background:\s*#e9edf3/i);
  assert.match(regla(".cuentas-filtros"), /border-radius:\s*12px/);
  assert.match(regla('.cuentas-filtro[aria-pressed="true"]'), /background:\s*#ffffff/i);
  assert.match(regla('.cuentas-filtro[aria-pressed="true"]'), /box-shadow:/);
});

test("buscador con etiqueta propia y botón «Actualizar cuentas» secundario", () => {
  assert.match(seccionCuentas, /<label class="visually-hidden" for="buscar-cuentas-admin">Buscar cuenta por nombre o correo<\/label>\s*<input id="buscar-cuentas-admin" class="form-control" type="search"/);
  assert.match(seccionCuentas, /<button id="recargar-cuentas-admin" class="panel-boton panel-boton-secundario" type="button">Actualizar cuentas<\/button>/);
});

test("tabla: columnas Cuenta, Rol, Estado y Acciones", () => {
  assert.deepEqual(ETIQUETAS_COLUMNAS_CUENTAS, ["Cuenta", "Rol", "Estado", "Acciones"]);
  const cabecera = seccionCuentas.slice(seccionCuentas.indexOf("<thead>"), seccionCuentas.indexOf("</thead>"));
  assert.deepEqual([...cabecera.matchAll(/<th scope="col">([^<]*)<\/th>/g)].map((m) => m[1]), ["Cuenta", "Rol", "Estado", "Acciones"]);
  assert.match(seccionCuentas, /<tbody id="tabla-cuentas-admin"><\/tbody>/);
});

test("columna derecha: alta en vertical con los mismos ids, ayuda visible con aria-describedby y «Crear cuenta» a todo el ancho", () => {
  for (const id of ["form-personal-admin", "personal-nombre", "personal-correo", "personal-clave", "personal-rol", "estado-alta-personal", "ayuda-personal-clave"]) {
    assert.match(seccionCuentas, new RegExp(`id="${id}"`), id);
  }
  assert.match(seccionCuentas, /<h3[^>]*>Nueva cuenta del personal<\/h3>/);
  assert.match(seccionCuentas, /id="personal-clave"[^>]*aria-describedby="ayuda-personal-clave"/);
  assert.match(seccionCuentas, /<p id="ayuda-personal-clave" class="form-text">8 a 72 caracteres, con al menos una mayúscula y un número\.<\/p>/);
  assert.doesNotMatch(seccionCuentas, /visually-hidden">8 a 72/);
  assert.match(seccionCuentas, /<button class="panel-boton panel-boton-principal w-100" type="submit">Crear cuenta<\/button>/);
  const rol = seccionCuentas.slice(seccionCuentas.indexOf('id="personal-rol"'), seccionCuentas.indexOf("</select>", seccionCuentas.indexOf('id="personal-rol"')));
  for (const [valor, texto] of [["ADMIN", "Administrador"], ["VENDEDOR", "Vendedor"], ["ALMACEN", "Almacén"], ["SOPORTE", "Soporte"], ["CLIENTE", "Cliente"]]) {
    assert.match(rol, new RegExp(`<option value="${valor}">${texto}</option>`), valor);
  }
  assert.match(css, /\.cuentas-rejilla\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 340px/);
});

test("tarjeta «Qué puede hacer cada rol»: una línea por rol", () => {
  assert.match(seccionCuentas, /<h3[^>]*>Qué puede hacer cada rol<\/h3>/);
  for (const [rol, texto] of [
    ["Administrador", "Todo el panel: cuentas, categorías, reportes, incidencias y auditoría."],
    ["Vendedor", "Productos, consultas de clientes y pedidos pendientes."],
    ["Almacén", "Pedidos por atender, despachos e inventario."],
    ["Soporte", "Reclamos, devoluciones y consulta de pedidos."],
    ["Cliente", "Solo la tienda: compras y su atención."],
  ]) {
    assert.match(seccionCuentas, new RegExp(`<dt>${rol}</dt>\\s*<dd>${texto.replace(/[.:]/g, "\\$&")}</dd>`), rol);
  }
});

// ---------- Celular ----------

test("celular: cada cuenta es una tarjeta con el selector y los botones a todo el ancho (48 px) y los filtros se desplazan", () => {
  const m = css.slice(css.indexOf("Tanda 4"));
  assert.match(m, /@media \(max-width: 575\.98px\)/);
  assert.match(m, /#tabla-cuentas-admin tr\s*\{[^}]*display:\s*grid/);
  assert.match(m, /#tabla-cuentas-admin \.cuenta-desactivar,\s*#tabla-cuentas-admin \.cuenta-guardar\s*\{[^}]*width:\s*100%[^}]*min-height:\s*48px|#tabla-cuentas-admin \.cuenta-desactivar,\s*#tabla-cuentas-admin \.cuenta-guardar\s*\{[^}]*min-height:\s*48px[^}]*width:\s*100%/);
  assert.match(m, /\.cuentas-filtros\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(m, /\.cuentas-rejilla\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});
