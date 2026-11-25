// Panel del personal (spec 19, T09): lógica pura del Inicio del Administrador (spec 17).
import test from "node:test";
import assert from "node:assert/strict";
import {
  indicadoresAdmin,
  filasAtencion,
  estadosPedidos,
  actividadReciente,
  ORDEN_ESTADOS_PEDIDO,
  TAMANO_ACTIVIDAD,
} from "../../src/panel/inicio/admin-logica.js";
import { formatoPrecio } from "../../src/utilidades/formato.js";
import { formatearFechaHora as fechaHoraCorta } from "../../src/panel/utilidades-panel.js";

const resumen = {
  pedidosVendidos: 12,
  ventasNetas: 1625,
  productosActivos: 32,
  unidadesEnStock: 410,
  valorInventario: 9876.5,
  pedidosPorEstado: { ENTREGADO: 6, EN_PREPARACION: 2, CANCELADO: 1, PENDIENTE: 3, DESPACHADO: 0 },
  escalados: 2,
};

// ---------- Indicadores ----------

test("indicadores: importes con la utilidad de formato, detalles de la spec, clave y alerta de escalados", () => {
  assert.deepEqual(indicadoresAdmin(resumen), [
    { clave: "ventas", etiqueta: "Ventas netas", valor: formatoPrecio(1625), detalle: "Sin pedidos cancelados" },
    { clave: "vendidos", etiqueta: "Pedidos vendidos", valor: "12", detalle: "No incluye cancelados" },
    { clave: "escalados", etiqueta: "Reclamos escalados", valor: "2", detalle: "Esperan al administrador", alerta: true, enlace: "#/incidencias" },
    { clave: "inventario", etiqueta: "Valor del inventario", valor: formatoPrecio(9876.5), detalle: "410 unidades · 32 productos" },
  ]);
  assert.equal(indicadoresAdmin({ ...resumen, escalados: 0 })[2].detalle, "Ninguno abierto");
});

// ---------- Requiere tu atención ----------

const productos = [
  { id: 1, stock: 2, activo: true },
  { id: 2, stock: 0, activo: true },
  { id: 3, stock: 50, activo: true },
  { id: 4, stock: 1, activo: false },
];

test("atención: filas por gravedad (escalados, stock bajo, pedidos en preparación) con su clave y tono", () => {
  const { filas, fallos } = filasAtencion({ resumen, productos });
  assert.deepEqual(fallos, []);
  assert.deepEqual(filas, [
    { clave: "escalados", tono: "rojo", texto: "2 reclamos escalados", detalle: "Soporte pidió tu intervención", enlace: "Ver incidencias", ruta: "#/incidencias" },
    { clave: "stock", tono: "ambar", texto: "2 productos con stock bajo", detalle: "Revisa el inventario antes de que se agoten", enlace: "Ver inventario", ruta: "#/inventario" },
    { clave: "preparacion", tono: "azul", texto: "2 pedidos en preparación", detalle: "Almacén los está atendiendo", enlace: "Ver pedidos", ruta: "#/pedidos" },
  ]);
});

test("atención: una condición que no aplica no genera fila", () => {
  const sinNada = filasAtencion({
    resumen: { ...resumen, escalados: 0, pedidosPorEstado: { ENTREGADO: 4 } },
    productos: [{ id: 1, stock: 40, activo: true }],
  });
  assert.deepEqual(sinNada, { filas: [], fallos: [] });
});

test("atención: por cada fuente que falló, su línea al final; las filas de la otra siguen", () => {
  const sinGestion = filasAtencion({ resumen, productos: null });
  assert.deepEqual(sinGestion.filas.map((f) => f.ruta), ["#/incidencias", "#/pedidos"]);
  assert.deepEqual(sinGestion.fallos, [{ texto: "No se pudo comprobar stock.", fuente: "gestion" }]);
  const sinResumen = filasAtencion({ resumen: null, productos });
  assert.deepEqual(sinResumen.filas.map((f) => f.ruta), ["#/inventario"]);
  assert.deepEqual(sinResumen.fallos, [{ texto: "No se pudo comprobar pedidos y reclamos.", fuente: "resumen" }]);
  assert.equal(filasAtencion({ resumen: null, productos: null }).fallos.length, 2);
});

// ---------- Pedidos por estado ----------

test("pedidos por estado: solo > 0, en el orden de la spec, ancho sobre el total", () => {
  assert.deepEqual([...ORDEN_ESTADOS_PEDIDO], ["PENDIENTE", "EN_PREPARACION", "DESPACHADO", "ENTREGADO", "CANCELADO"]);
  const { total, barras } = estadosPedidos(resumen.pedidosPorEstado);
  assert.equal(total, 12);
  assert.deepEqual(barras.map((b) => [b.codigo, b.nombre, b.cantidad, b.porcentaje, b.color]), [
    ["PENDIENTE", "Pendiente", 3, 25, "pendiente"],
    ["EN_PREPARACION", "En preparación", 2, (2 / 12) * 100, "en-preparacion"],
    ["ENTREGADO", "Entregado", 6, 50, "entregado"],
    ["CANCELADO", "Cancelado", 1, (1 / 12) * 100, "cancelado"],
  ]);
});

test("pedidos por estado: un código desconocido se muestra tal cual, al final y en neutro", () => {
  const { barras } = estadosPedidos({ PENDIENTE: 1, REEMBOLSADO: 1 });
  assert.deepEqual(barras.at(-1), { codigo: "REEMBOLSADO", nombre: "REEMBOLSADO", cantidad: 1, porcentaje: 50, color: "otro" });
});

test("pedidos por estado vacío o nulo: total 0 y sin barras", () => {
  assert.deepEqual(estadosPedidos({}), { total: 0, barras: [] });
  assert.deepEqual(estadosPedidos(undefined), { total: 0, barras: [] });
});

// ---------- Actividad reciente ----------

test("actividad: 5 registros; título con la etiqueta del backend (o el código) y detalle usuario · rol · fecha", () => {
  assert.equal(TAMANO_ACTIVIDAD, 5);
  const items = actividadReciente({
    items: [
      { id: 1, fecha: "2026-11-24T15:30:00Z", usuarioNombre: "Ana", rol: "ADMIN", accion: "PRECIO_CAMBIADO", accionEtiqueta: "Cambio de precio" },
      { id: 2, fecha: "2026-11-24T15:00:00Z", usuarioCorreo: "x@y.pe", rol: "VENDEDOR", accion: "STOCK_AJUSTADO" },
      { id: 3, fecha: "2026-11-24T14:00:00Z", accion: "INICIO_SESION_FALLIDO" },
    ],
  });
  assert.deepEqual(items.map((i) => i.titulo), ["Cambio de precio", "STOCK_AJUSTADO", "INICIO_SESION_FALLIDO"]);
  assert.equal(items[0].detalle, `Ana · ADMIN · ${fechaHoraCorta("2026-11-24T15:30:00Z")}`);
  assert.equal(items[1].detalle, `x@y.pe · VENDEDOR · ${fechaHoraCorta("2026-11-24T15:00:00Z")}`);
  assert.equal(items[2].detalle, `— · ${fechaHoraCorta("2026-11-24T14:00:00Z")}`);
  assert.deepEqual(actividadReciente(null), []);
  assert.equal(actividadReciente({ items: Array.from({ length: 9 }, (_, i) => ({ id: i, accion: "X" })) }).length, 5);
});

test("la actividad usa formatearFechaHora: fecha y hora cortas, sin «hace X»; una fecha inválida se muestra tal cual", () => {
  const texto = fechaHoraCorta("2026-11-24T15:30:00Z");
  assert.equal(texto, new Date("2026-11-24T15:30:00Z").toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }));
  assert.doesNotMatch(texto, /hace/i);
  assert.equal(fechaHoraCorta("no-es-fecha"), "no-es-fecha");
});
