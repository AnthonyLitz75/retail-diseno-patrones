// Panel del personal (spec 19, T09): marcado del Inicio del Administrador (spec 17).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  renderizarInicioAdmin,
  renderizarIndicadoresAdmin,
  renderizarAtencion,
  renderizarPedidosPorEstado,
  renderizarActividad,
} from "../../src/panel/inicio/admin-inicio.js";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import {
  renderizarVistaProductos,
  renderizarVistaPedidos,
  renderizarVistaInventario,
  renderizarVistaAdministracion,
} from "../../src/layout/vistas-personal.js";

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
/** El escapado convierte «/» en &#x2F; (el navegador lo muestra igual); se compara el texto visible. */
const visible = (html) => html.replaceAll("&#x2F;", "/");
const contar = (html, patron) => (html.match(patron) || []).length;

// ---------- Estructura ----------

test("encabezado: <h1> Inicio, apoyo, «Descargar reporte (CSV)» y «Crear cuenta del personal»", () => {
  const html = renderizarInicioAdmin();
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /Resumen de la tienda y lo que necesita tu atención\./);
  assert.match(html, /<button [^>]*type="button"[^>]*id="inicio-descargar-csv"[^>]*>Descargar reporte \(CSV\)<\/button>/);
  assert.match(html, /<a [^>]*class="panel-boton panel-boton-principal"[^>]*href="#\/cuentas\?alta=1"[^>]*>Crear cuenta del personal<\/a>/);
});

test("bloques: requiere tu atención, pedidos por estado y actividad reciente", () => {
  const html = renderizarInicioAdmin();
  assert.match(html, /<h2[^>]*>Requiere tu atención<\/h2>/);
  assert.match(html, /<h2[^>]*>Pedidos por estado<\/h2>/);
  assert.match(html, /<h2[^>]*>Actividad reciente<\/h2>/);
  assert.match(html, /<a [^>]*href="#\/auditoria"[^>]*>Ver toda la auditoría<\/a>/);
  assert.doesNotMatch(html, /Ejemplo/);
});

test("ids con prefijo inicio- y sin repetidos en el DOM del panel del Administrador", () => {
  for (const id of idsDe(renderizarInicioAdmin())) assert.ok(id.startsWith("inicio-"), id);
  const modales = readFileSync(new URL("../../src/layout/plantillas/modales.html", import.meta.url), "utf-8");
  const plantillaAdmin = readFileSync(new URL("../../src/layout/plantillas/administracion.html", import.meta.url), "utf-8");
  const dom = [
    renderizarBarraSuperior({ nombre: "Ada", rol: "ADMIN" }),
    renderizarMenuLateral("ADMIN"),
    renderizarInicioAdmin(),
    renderizarVistaProductos(),
    renderizarVistaPedidos(),
    renderizarVistaInventario(),
    renderizarVistaAdministracion(),
    plantillaAdmin,
    modales,
  ].join("\n");
  const ids = idsDe(dom);
  assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), []);
});

// ---------- Indicadores ----------

test("indicadores con datos y con el resumen caído («—» y «No se pudo cargar»)", () => {
  const con = renderizarIndicadoresAdmin([
    { etiqueta: "Ventas netas", valor: "S/ 1,625.00", detalle: "Sin pedidos cancelados" },
    { etiqueta: "Pedidos vendidos", valor: "12", detalle: "No incluye cancelados" },
    { etiqueta: "Reclamos escalados", valor: "0", detalle: "Ninguno abierto" },
    { etiqueta: "Valor del inventario", valor: "S/ 9.00", detalle: "1 unidades · 1 productos" },
  ]);
  assert.equal(contar(con, /class="panel-kpi"/g), 4);
  assert.match(visible(con), /Ventas netas[\s\S]*?>S\/ 1,625\.00</);
  const sin = renderizarIndicadoresAdmin(null);
  assert.equal(contar(sin, />—</g), 4);
  assert.equal(contar(sin, /No se pudo cargar/g), 4);
  for (const etiqueta of ["Ventas netas", "Pedidos vendidos", "Reclamos escalados", "Valor del inventario"]) {
    assert.match(sin, new RegExp(etiqueta));
  }
});

// ---------- Requiere tu atención ----------

const fila = (texto, ruta) => ({ texto, detalle: "d", enlace: `Ver ${texto}`, ruta });

test("atención: filas con texto, detalle y enlace de acción", () => {
  const html = renderizarAtencion({ filas: [fila("2 reclamos escalados", "#/incidencias")], fallos: [] });
  assert.match(html, /2 reclamos escalados/);
  assert.match(html, /<a [^>]*class="panel-boton panel-boton-secundario"[^>]*href="#\/incidencias"[^>]*>Ver 2 reclamos escalados<\/a>/);
  assert.doesNotMatch(html, /Nada pendiente/);
});

test("atención: «Nada pendiente por ahora.» solo si no hay filas ni fallos", () => {
  assert.match(renderizarAtencion({ filas: [], fallos: [] }), /Nada pendiente por ahora\./);
  const conFallo = renderizarAtencion({ filas: [], fallos: [{ texto: "No se pudo comprobar stock.", fuente: "gestion" }] });
  assert.doesNotMatch(conFallo, /Nada pendiente/);
  assert.match(conFallo, /No se pudo comprobar stock\.[\s\S]*?<button [^>]*data-reintentar="gestion"[^>]*>Reintentar<\/button>/);
});

test("atención: las líneas de fallo van después de las filas", () => {
  const html = renderizarAtencion({
    filas: [fila("2 pedidos en preparación", "#/pedidos")],
    fallos: [{ texto: "No se pudo comprobar stock.", fuente: "gestion" }],
  });
  assert.ok(html.indexOf("2 pedidos en preparación") < html.indexOf("No se pudo comprobar stock."));
});

// ---------- Pedidos por estado ----------

test("pedidos por estado: una barra por estado con texto y número; parte visual oculta a lectores", () => {
  const html = renderizarPedidosPorEstado({
    total: 4,
    barras: [
      { codigo: "PENDIENTE", nombre: "Pendiente", cantidad: 1, porcentaje: 25, color: "pendiente" },
      { codigo: "ENTREGADO", nombre: "Entregado", cantidad: 3, porcentaje: 75, color: "entregado" },
    ],
  });
  assert.match(html, />Pendiente</);
  assert.match(html, /panel-estado-numero">1</);
  assert.match(html, /<div class="panel-barra" aria-hidden="true"><div class="panel-barra-relleno panel-estado-entregado" style="width: 75%"><\/div><\/div>/);
  assert.equal(contar(html, /aria-hidden="true"/g), 2);
});

test("pedidos por estado sin pedidos: «Aún no hay pedidos.»", () => {
  assert.match(renderizarPedidosPorEstado({ total: 0, barras: [] }), /Aún no hay pedidos\./);
});

// ---------- Actividad reciente ----------

test("actividad: título y detalle escapados; vacía con su texto", () => {
  const html = renderizarActividad([{ titulo: "<b>Cambio</b>", detalle: "Ana · ADMIN · 24/11/26 10:30" }]);
  assert.doesNotMatch(html, /<b>Cambio/);
  assert.match(html, /&lt;b&gt;Cambio/);
  assert.match(visible(html), /Ana · ADMIN · 24\/11\/26 10:30/);
  assert.match(renderizarActividad([]), /Aún no hay actividad registrada\./);
});
