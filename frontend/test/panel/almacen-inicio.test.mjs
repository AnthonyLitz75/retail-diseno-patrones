// Panel del personal (spec 19, T06b): marcado del Inicio de Almacén (spec 14 y P4) e ids
// únicos en el DOM del panel. El pintado se prueba como texto; el arranque solo lo inserta.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  renderizarInicioAlmacen,
  renderizarIndicadores,
  renderizarTarjetaPedido,
  renderizarColumna,
  renderizarStockCritico,
  renderizarErrorBloque,
  renderizarCargando,
  ACCION_POR_ESTADO,
} from "../../src/panel/inicio/almacen-inicio.js";
import { renderizarBarraSuperior, renderizarMenuLateral } from "../../src/panel/panel-layout.js";
import { renderizarVistaPedidos, renderizarVistaInventario } from "../../src/layout/vistas-personal.js";
import { formatoPrecio } from "../../src/utilidades/formato.js";

const idsDe = (html) => [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
const contar = (html, patron) => (html.match(patron) || []).length;

// ---------- Estructura ----------

test("encabezado con <h1> «Inicio» y el texto de apoyo", () => {
  const html = renderizarInicioAlmacen();
  assert.match(html, /<h1[^>]*class="panel-titulo"[^>]*>Inicio<\/h1>/);
  assert.match(html, /Pedidos por preparar y mercadería que necesita reposición\./);
});

test("los tres bloques: cola de pedidos, stock crítico y entrada rápida", () => {
  const html = renderizarInicioAlmacen();
  assert.match(html, /<h2[^>]*>Cola de pedidos<\/h2>/);
  assert.match(html, /<h2[^>]*>Stock crítico<\/h2>/);
  assert.match(html, /<h2[^>]*>Entrada rápida de mercadería<\/h2>/);
  assert.match(html, /<a [^>]*href="#\/pedidos"[^>]*>Ver todos<\/a>/);
  for (const titulo of ["Pendientes", "En preparación", "Despachados"]) {
    assert.match(html, new RegExp(`>${titulo}<`), titulo);
  }
});

test("el formulario de entrada tiene sus tres campos con <label for> y las reglas de la spec", () => {
  const html = renderizarInicioAlmacen();
  for (const id of ["inicio-producto-entrada", "inicio-cantidad-entrada", "inicio-motivo-entrada"]) {
    assert.match(html, new RegExp(`<label [^>]*for="${id}"`), id);
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /<select [^>]*id="inicio-producto-entrada"/);
  assert.match(html, /<input [^>]*id="inicio-cantidad-entrada"[^>]*type="number"[^>]*min="1"[^>]*step="1"/);
  assert.match(html, /<input [^>]*id="inicio-motivo-entrada"[^>]*type="text"/);
  assert.doesNotMatch(html, /id="inicio-motivo-entrada"[^>]*value=/, "sin motivo por defecto");
  assert.match(html, /<button [^>]*type="submit"[^>]*>Registrar entrada<\/button>/);
  assert.match(html, /Queda registrada en el kardex con tu usuario y la fecha\./);
  assert.match(html, /role="alert"/);
});

test("todos los ids del Inicio llevan el prefijo inicio-", () => {
  for (const id of idsDe(renderizarInicioAlmacen())) assert.ok(id.startsWith("inicio-"), id);
});

test("accesos rápidos para celular: Inicio, Pedidos y Kardex", () => {
  const html = renderizarInicioAlmacen();
  assert.match(html, /<nav [^>]*aria-label="Accesos rápidos"/);
  for (const [ruta, texto] of [["#/inicio", "Inicio"], ["#/pedidos", "Pedidos"], ["#/inventario", "Kardex"]]) {
    assert.match(html, new RegExp(`href="${ruta}"[^>]*>${texto}<`), texto);
  }
});

test("no hay ids repetidos en el DOM del panel de Almacén (marco, Inicio, vistas y modales)", () => {
  const modales = readFileSync(new URL("../../src/layout/plantillas/modales.html", import.meta.url), "utf-8");
  const dom = [
    renderizarBarraSuperior({ nombre: "Ana", rol: "ALMACEN" }),
    renderizarMenuLateral("ALMACEN"),
    renderizarInicioAlmacen(),
    renderizarVistaPedidos(),
    renderizarVistaInventario(),
    modales,
  ].join("\n");
  const ids = idsDe(dom);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(repetidos, []);
});

// ---------- Indicadores ----------

test("indicadores de la decisión P4 con sus detalles", () => {
  const html = renderizarIndicadores({
    pedidos: { porPreparar: 3, pendientes: 2, enPreparacion: 1, despachados: 4 },
    productos: { stockBajo: 2, unidades: 33, productosActivos: 4 },
  });
  assert.equal(contar(html, /class="panel-kpi"/g), 4);
  assert.match(html, /Por preparar[\s\S]*>3<[\s\S]*2 pendientes · 1 en preparación/);
  assert.match(html, /Despachados[\s\S]*>4<[\s\S]*En camino al cliente/);
  assert.match(html, /Stock bajo[\s\S]*>2<[\s\S]*Por debajo del mínimo/);
  assert.match(html, /Unidades en almacén[\s\S]*>33<[\s\S]*4 productos activos/);
  assert.doesNotMatch(html, /Despachados hoy/);
});

test("si falta una fuente, sus indicadores muestran «—» en lugar de un número", () => {
  const html = renderizarIndicadores({ pedidos: null, productos: { stockBajo: 1, unidades: 9, productosActivos: 2 } });
  assert.match(html, /Por preparar[\s\S]*?>—</);
  assert.match(html, /Despachados[\s\S]*?>—</);
  assert.match(html, /Stock bajo[\s\S]*?>1</);
});

// ---------- Tarjetas de pedido ----------

test("tarjeta: número, resumen, monto y el botón de su estado", () => {
  assert.deepEqual({ ...ACCION_POR_ESTADO }, {
    PENDIENTE: { accion: "preparar", texto: "Empezar a preparar" },
    EN_PREPARACION: { accion: "despachar", texto: "Marcar como despachado" },
    DESPACHADO: { accion: "entregar", texto: "Marcar como entregado" },
  });
  const p = { idPedido: 5, estado: "PENDIENTE", total: 447, productos: [{ nombreProducto: "Teclado K380", cantidad: 3 }] };
  const html = renderizarTarjetaPedido(p);
  assert.match(html, />Pedido #5</);
  assert.match(html, /Teclado K380 × 3/);
  assert.ok(html.includes(formatoPrecio(447)));
  assert.match(html, /<button [^>]*type="button"[^>]*data-accion="preparar"[^>]*data-pedido="5"[^>]*>Empezar a preparar<\/button>/);
  assert.match(renderizarTarjetaPedido({ ...p, estado: "EN_PREPARACION" }), /data-accion="despachar"[^>]*>Marcar como despachado</);
  assert.match(renderizarTarjetaPedido({ ...p, estado: "DESPACHADO" }), /data-accion="entregar"[^>]*>Marcar como entregado</);
});

test("tarjeta: escapa los nombres de producto", () => {
  const html = renderizarTarjetaPedido({ idPedido: 1, estado: "PENDIENTE", total: 1,
    productos: [{ nombreProducto: "<img src=x>", cantidad: 1 }] });
  assert.doesNotMatch(html, /<img/);
});

test("columna: título con contador en insignia y «Sin pedidos» si está vacía", () => {
  const vacia = renderizarColumna("PENDIENTE", []);
  assert.match(vacia, /Pendientes/);
  assert.match(vacia, /panel-insignia-ambar[^>]*>0</);
  assert.match(vacia, /Sin pedidos/);
  const llena = renderizarColumna("EN_PREPARACION", [{ idPedido: 2, estado: "EN_PREPARACION", total: 1, productos: [] }]);
  assert.match(llena, /panel-insignia-azul[^>]*>1</);
  assert.match(llena, /Pedido #2/);
  assert.match(renderizarColumna("DESPACHADO", []), /panel-insignia-verde/);
});

// ---------- Stock crítico ----------

test("stock crítico: nombre e insignia; texto propio si no hay ninguno", () => {
  assert.match(renderizarStockCritico([]), /Todo el stock está sobre el mínimo\./);
  const html = renderizarStockCritico([{ id: 1, nombre: "Mouse", stock: 0 }, { id: 2, nombre: "Webcam", stock: 1 }]);
  assert.match(html, /Mouse[\s\S]*panel-insignia-rojo[^>]*>Agotado</);
  assert.match(html, /Webcam[\s\S]*panel-insignia-ambar[^>]*>1 unidad</);
});

// ---------- Estados de carga y error ----------

test("cargando: «Cargando…»; error: «No se pudo cargar.» con «Reintentar»", () => {
  assert.match(renderizarCargando(), /Cargando…/);
  const error = renderizarErrorBloque("pedidos");
  assert.match(error, /No se pudo cargar\./);
  assert.match(error, /<button [^>]*type="button"[^>]*data-reintentar="pedidos"[^>]*>Reintentar<\/button>/);
});
