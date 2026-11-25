// Panel del personal: Inicio del administrador rediseñado (fecha, indicadores con icono y alerta,
// atención por gravedad, pedidos por estado segmentados, atajos y actividad con iniciales).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  actividadReciente, estadosPedidos, fechaDeHoy, filasAtencion, indicadoresAdmin, resumenAtencion, resumenPedidos,
} from "../../src/panel/inicio/admin-logica.js";
import {
  renderizarActividad, renderizarAtencion, renderizarIndicadoresAdmin, renderizarInicioAdmin, renderizarPedidosPorEstado,
} from "../../src/panel/inicio/admin-inicio.js";
import { ROL_LEGIBLE, claseRol, htmlAvatarRol } from "../../src/panel/roles-visual.js";
import { ICONOS } from "../../src/panel/iconos.js";
import { resolverRuta } from "../../src/panel/panel-router.js";
import { pideAlta, selectorAltaDeRuta } from "../../src/panel/pantallas/administracion.js";

const css = readFileSync(new URL("../../src/css/panel.css", import.meta.url), "utf8");
const visible = (html) => html.replaceAll("&#x2F;", "/");
const cuenta = (texto, re) => (texto.match(re) ?? []).length;
/** Cuerpos de todas las reglas cuyo selector (lista separada por comas) es exactamente el dado. */
const regla = (selector) => {
  const cuerpos = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((x) => x.trim().split(/\n/).pop().trim() === selector)) cuerpos.push(m[2]);
  }
  assert.ok(cuerpos.length, `falta la regla ${selector}`);
  return cuerpos.join(" ");
};

const resumen = {
  pedidosVendidos: 12, ventasNetas: 1625, productosActivos: 32, unidadesEnStock: 410, valorInventario: 9876.5,
  pedidosPorEstado: { ENTREGADO: 6, EN_PREPARACION: 2, CANCELADO: 1, PENDIENTE: 3 }, escalados: 2,
};

// ---------- A1. Fecha de hoy ----------

test("A1: fechaDeHoy en es-PE con la primera letra en mayúscula", () => {
  assert.equal(fechaDeHoy(new Date(2026, 10, 25)), "Miércoles 25 de noviembre");
  assert.equal(fechaDeHoy(new Date(2026, 0, 1)), "Jueves 1 de enero");
  assert.equal(fechaDeHoy(new Date(2026, 11, 6)), "Domingo 6 de diciembre");
});

test("A1: la fecha va encima del <h1> (13 px, 600, #475569) y los dos botones llevan icono (descarga y «+»)", () => {
  const html = renderizarInicioAdmin({ hoy: new Date(2026, 10, 25) });
  assert.match(html, /<p class="panel-fecha">Miércoles 25 de noviembre<\/p>\s*<h1 class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /id="inicio-descargar-csv"[^>]*><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*<span>Descargar reporte \(CSV\)<\/span><\/button>/);
  assert.match(html, /href="#\/cuentas\?alta=1"[^>]*><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>\s*<span>Crear cuenta del personal<\/span><\/a>/);
  assert.ok(Object.hasOwn(ICONOS, "descarga") && Object.hasOwn(ICONOS, "mas"));
  const f = regla(".panel-fecha");
  assert.match(f, /font-size:\s*13px/);
  assert.match(f, /font-weight:\s*600/);
  assert.match(f, /color:\s*#475569/i);
});

// ---------- A2. Indicadores ----------

test("A2: cada indicador trae su clave; «Reclamos escalados» > 0 es alerta con enlace «Atender» a #/incidencias", () => {
  const [ventas, vendidos, escalados, inventario] = indicadoresAdmin(resumen);
  assert.deepEqual([ventas.clave, vendidos.clave, escalados.clave, inventario.clave], ["ventas", "vendidos", "escalados", "inventario"]);
  assert.equal(escalados.alerta, true);
  assert.equal(escalados.detalle, "Esperan al administrador");
  assert.equal(escalados.enlace, "#/incidencias");
  const cero = indicadoresAdmin({ ...resumen, escalados: 0 })[2];
  assert.equal(cero.alerta, false);
  assert.equal(cero.detalle, "Ninguno abierto");
  assert.equal(cero.enlace, undefined);
});

test("A2: tarjetas con cuadro de icono; la alerta usa su estado propio y su detalle es un enlace", () => {
  const html = renderizarIndicadoresAdmin(indicadoresAdmin(resumen));
  assert.equal(cuenta(html, /class="panel-icono-cuadro panel-icono-/g), 4);
  assert.match(html, /<article class="panel-kpi panel-kpi-alerta">[\s\S]*?panel-icono-cuadro panel-icono-alerta[\s\S]*?Reclamos escalados/);
  assert.match(visible(html), /<p class="panel-kpi-detalle">Esperan al administrador<\/p>\s*<a class="panel-kpi-enlace" href="#\/incidencias">Atender<\/a>/);
  const normal = renderizarIndicadoresAdmin(indicadoresAdmin({ ...resumen, escalados: 0 }));
  assert.doesNotMatch(normal, /panel-kpi-alerta/);
  assert.match(normal, /<p class="panel-kpi-detalle">Ninguno abierto<\/p>/);
  assert.match(html, /panel-icono-azul[\s\S]*?Ventas netas/);
  assert.match(html, /panel-icono-verde[\s\S]*?Pedidos vendidos/);
  assert.match(html, /panel-icono-cielo[\s\S]*?Valor del inventario/);
});

test("A2: estilos de los indicadores: icono de 34 px con radio 10 px, colores de la decisión, valor 28 px/800 y alerta ámbar", () => {
  const ic = regla(".panel-icono-cuadro");
  assert.match(ic, /width:\s*34px/);
  assert.match(ic, /height:\s*34px/);
  assert.match(ic, /border-radius:\s*10px/);
  assert.match(css, /--panel-tono-azul-fondo:\s*#e7f0ff/i);
  assert.match(css, /--panel-tono-azul-texto:\s*#0a58ca/i);
  assert.match(css, /--panel-tono-verde-fondo:\s*#e6f6ec/i);
  assert.match(css, /--panel-tono-verde-texto:\s*#157f3b/i);
  assert.match(css, /--panel-tono-cielo-fondo:\s*#e0f2fe/i);
  assert.match(css, /--panel-tono-cielo-texto:\s*#0369a1/i);
  assert.match(css, /--panel-alerta-fondo:\s*#fffbeb/i);
  assert.match(css, /--panel-alerta-borde:\s*#fcd34d/i);
  assert.match(css, /--panel-alerta-texto:\s*#78350f/i);
  assert.match(css, /--panel-alerta-icono-fondo:\s*#fde68a/i);
  const a = regla(".panel-kpi-alerta");
  assert.match(a, /background:\s*var\(--panel-alerta-fondo\)/);
  assert.match(a, /border-color:\s*var\(--panel-alerta-borde\)/);
  const v = regla(".panel-kpi-valor");
  assert.match(v, /font-size:\s*28px/);
  assert.match(v, /font-weight:\s*800/);
});

// ---------- A3. Requiere tu atención ----------

test("A3: filas por gravedad (escalados, stock bajo, preparación) con su clave y tono; cabecera «{n} pendientes»", () => {
  const productos = [{ id: 1, stock: 2, activo: true }, { id: 2, stock: 0, activo: true }];
  const { filas } = filasAtencion({ resumen, productos });
  assert.deepEqual(filas.map((f) => [f.clave, f.tono, f.ruta]), [
    ["escalados", "rojo", "#/incidencias"], ["stock", "ambar", "#/inventario"], ["preparacion", "azul", "#/pedidos"],
  ]);
  assert.equal(resumenAtencion(filas), "3 pendientes");
  assert.equal(resumenAtencion(filas.slice(0, 1)), "1 pendiente");
  assert.equal(resumenAtencion([]), "");
});

test("A3: cada fila lleva un icono de 40 px; solo la primera tiene el botón relleno; las de fallo se mantienen", () => {
  const filas = [
    { clave: "escalados", tono: "rojo", texto: "1 reclamo escalado", detalle: "d", enlace: "Ver incidencias", ruta: "#/incidencias" },
    { clave: "stock", tono: "ambar", texto: "2 productos con stock bajo", detalle: "d", enlace: "Ver inventario", ruta: "#/inventario" },
    { clave: "preparacion", tono: "azul", texto: "2 pedidos en preparación", detalle: "d", enlace: "Ver pedidos", ruta: "#/pedidos" },
  ];
  const html = renderizarAtencion({ filas, fallos: [{ texto: "No se pudo comprobar stock.", fuente: "gestion" }] });
  assert.equal(cuenta(html, /class="panel-icono-cuadro panel-icono-atencion panel-icono-(rojo|ambar|azul)"/g), 3);
  assert.equal(cuenta(html, /panel-boton panel-boton-principal/g), 1);
  assert.equal(cuenta(html, /panel-boton panel-boton-secundario/g), 3, "dos filas de contorno y el «Reintentar»");
  assert.ok(html.indexOf("panel-boton-principal") < html.indexOf("2 productos con stock bajo"), "el relleno está en la primera fila");
  assert.match(html, /data-reintentar="gestion"/);
  assert.match(regla(".panel-icono-atencion"), /width:\s*40px/);
  assert.match(renderizarInicioAdmin(), /id="inicio-atencion-resumen"/);
});

// ---------- A4. Pedidos por estado ----------

test("A4: «{n} pedidos en total» (singular con 1)", () => {
  assert.equal(resumenPedidos(12), "12 pedidos en total");
  assert.equal(resumenPedidos(1), "1 pedido en total");
  assert.match(renderizarInicioAdmin(), /id="inicio-estados-resumen"/);
});

test("A4: barra segmentada oculta a lectores y una casilla por estado con cuadrado, nombre y número", () => {
  const html = renderizarPedidosPorEstado(estadosPedidos(resumen.pedidosPorEstado));
  assert.match(html, /<div class="panel-segmentos" aria-hidden="true">/);
  assert.equal(cuenta(html, /<span class="panel-segmento panel-estado-/g), 4);
  assert.match(html, /<span class="panel-segmento panel-estado-pendiente" style="flex-grow: 3"><\/span>/);
  assert.equal(cuenta(html, /<li class="panel-estado-casilla">/g), 4);
  assert.match(html, /<li class="panel-estado-casilla"><span class="panel-estado-cuadro panel-estado-pendiente" aria-hidden="true"><\/span><span class="panel-estado-nombre">Pendiente<\/span><span class="panel-estado-numero">3<\/span><\/li>/);
  assert.match(renderizarPedidosPorEstado({ total: 0, barras: [] }), /Aún no hay pedidos\./);
});

test("A4: estilos: barra de 14 px con segmentos separados 3 px; casillas #f8fafc de 12 px; cuadrado 10 px; número 22 px/800", () => {
  const s = regla(".panel-segmentos");
  assert.match(s, /height:\s*14px/);
  assert.match(s, /gap:\s*3px/);
  assert.match(regla(".panel-segmento"), /border-radius:\s*999px/);
  const c = regla(".panel-estado-casilla");
  assert.match(c, /background:\s*#f8fafc/i);
  assert.match(c, /border-radius:\s*12px/);
  const q = regla(".panel-estado-cuadro");
  assert.match(q, /width:\s*10px/);
  assert.match(q, /height:\s*10px/);
  const n = regla(".panel-estado-numero");
  assert.match(n, /font-size:\s*22px/);
  assert.match(n, /font-weight:\s*800/);
  assert.match(css, /--panel-estado-pendiente:\s*#d97706/i);
});

// ---------- A5. Columna derecha ----------

test("A5: columna derecha con «Atajos» en 2 × 2 y, debajo, «Actividad reciente»", () => {
  const html = visible(renderizarInicioAdmin());
  assert.match(html, /<h2[^>]*>Atajos<\/h2>/);
  for (const [ruta, texto] of [["#/productos?nuevo=1", "Nuevo producto"], ["#/categorias?alta=1", "Nueva categoría"], ["#/reportes", "Ver reportes"], ["#/auditoria", "Auditoría"]]) {
    assert.match(html, new RegExp(`<a class="panel-atajo" href="${ruta.replace(/[?]/g, "\\?")}"><span class="panel-icono-cuadro[^"]*"[^>]*>[\\s\\S]*?</span><span>${texto}</span></a>`), texto);
  }
  assert.ok(html.indexOf(">Atajos<") < html.indexOf(">Actividad reciente<"));
  assert.match(css, /\.panel-inicio-rejilla-admin\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) minmax\(380px, /);
  assert.match(regla(".panel-atajo"), /min-height:\s*52px/);
  assert.match(css, /@media \(max-width: 575\.98px\)[\s\S]*?\.panel-atajo\s*\{[^}]*min-height:\s*48px/);
  assert.match(regla(".panel-atajos"), /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("A5: #/categorias?alta=1 lleva el foco a #nombre-categoria-admin y reescribe el hash (mismo patrón que cuentas)", () => {
  assert.deepEqual(resolverRuta("#/categorias?alta=1", "ADMIN").parametros, { alta: "1" });
  assert.equal(resolverRuta("#/categorias?alta=1", "ADMIN").redireccion, undefined);
  assert.equal(pideAlta({ alta: "1" }), true);
  assert.equal(selectorAltaDeRuta("#/categorias"), "#form-categoria-admin #nombre-categoria-admin");
  assert.equal(selectorAltaDeRuta("#/cuentas"), "#form-personal-admin #personal-nombre");
  assert.equal(selectorAltaDeRuta("#/reportes"), null);
});

// ---------- A5. Actividad ----------

test("A5: la actividad trae usuario, rol legible e iniciales además del detalle", () => {
  const [a, b, c] = actividadReciente({
    items: [
      { id: 1, fecha: "2026-11-24T15:30:00Z", usuarioNombre: "Ana López", rol: "ADMIN", accion: "X" },
      { id: 2, fecha: "2026-11-24T15:00:00Z", usuarioCorreo: "x@y.pe", rol: "VENDEDOR", accion: "X" },
      { id: 3, fecha: "2026-11-24T14:00:00Z", accion: "INICIO_SESION_FALLIDO" },
    ],
  });
  assert.deepEqual([a.usuario, a.rol, a.rolLegible, a.iniciales], ["Ana López", "ADMIN", "Administrador", "AL"]);
  assert.deepEqual([b.usuario, b.rolLegible, b.iniciales], ["x@y.pe", "Vendedor", "X"]);
  assert.deepEqual([c.usuario, c.rol, c.rolLegible, c.iniciales], ["Sin sesión", null, "", "?"]);
  assert.equal(a.actor, "Ana López · Administrador");
  assert.equal(c.actor, "Sin sesión");
});

test("A5: cada registro lleva un círculo con iniciales coloreado por rol, el título, «{usuario} · {rol}» y la fecha debajo", () => {
  const html = visible(renderizarActividad([{ titulo: "Inicio de sesión", detalle: "x", actor: "Ana · Administrador", fecha: "24/11/26, 10:05 a. m.", rol: "ADMIN", iniciales: "AL" }]));
  assert.match(html, /<span class="panel-avatar-rol panel-rol-admin" aria-hidden="true">AL<\/span>/);
  assert.match(html, /<p class="panel-actividad-titulo">Inicio de sesión<\/p>/);
  assert.match(html, /<p class="panel-actividad-detalle panel-actividad-actor" title="Ana · Administrador">Ana · Administrador<\/p>\s*<p class="panel-actividad-detalle panel-actividad-fecha">24\/11\/26, 10:05 a\. m\.<\/p>/);
  assert.equal(claseRol("SOPORTE"), "panel-rol-soporte");
  assert.equal(claseRol(null), "panel-rol-cliente");
  assert.equal(ROL_LEGIBLE.CLIENTE, "Cliente");
  assert.match(htmlAvatarRol("Ana López", "ALMACEN"), /panel-rol-almacen" aria-hidden="true">AL</);
});

test("A5: colores de los círculos por rol y tamaño de 32 px en la actividad", () => {
  for (const [rol, fondo, texto] of [["admin", "#e7f0ff", "#0a58ca"], ["vendedor", "#e6f6ec", "#157f3b"], ["almacen", "#e0f2fe", "#0369a1"], ["soporte", "#fef3c7", "#92400e"], ["cliente", "#f1f5f9", "#475569"]]) {
    const r = regla(`.panel-rol-${rol}`);
    assert.match(r, /background:\s*var\(--panel-(tono|insignia)-[a-z]+-fondo\)/, rol);
    assert.match(css, new RegExp(`--panel-(tono|insignia)-[a-z]+-fondo:\\s*${fondo}`, "i"), `${rol} fondo`);
    assert.match(css, new RegExp(`--panel-(tono|insignia)-[a-z]+-texto:\\s*${texto}`, "i"), `${rol} texto`);
  }
  const av = regla(".panel-actividad .panel-avatar-rol");
  assert.match(av, /width:\s*32px/);
  assert.match(av, /height:\s*32px/);
});

// ---------- A6. Celular ----------

test("A6: celular: indicadores en 2 × 2 y bloques apilados", () => {
  assert.match(css, /@media \(max-width: 991\.98px\)\s*\{[^@]*\.panel-kpis\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /@media \(max-width: 1199\.98px\)\s*\{\s*\.panel-inicio-rejilla\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
});
