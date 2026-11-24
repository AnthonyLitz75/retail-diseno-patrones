// Panel del personal (spec 19, T06a): lógica pura del Inicio de Almacén (spec 14 y P4).
import test from "node:test";
import assert from "node:assert/strict";
import {
  agruparPedidosPorEstado,
  calcularIndicadoresAlmacen,
  stockCritico,
  etiquetaStock,
  resumenArticulos,
  validarEntrada,
  MENSAJES_ENTRADA,
  MAX_STOCK_CRITICO,
} from "../../src/panel/inicio/almacen-logica.js";
import { UMBRAL_STOCK_BAJO } from "../../src/catalogo/gestion/panel-productos.js";

const pedido = (idPedido, estado, creadoEn, productos = []) => ({ idPedido, estado, creadoEn, productos });

// ---------- Agrupación de pedidos ----------

test("agrupa en Pendientes, En preparación y Despachados, del más antiguo al más nuevo", () => {
  const grupos = agruparPedidosPorEstado([
    pedido(7, "PENDIENTE", "2026-11-20T10:00:00Z"),
    pedido(3, "EN_PREPARACION", "2026-11-19T09:00:00Z"),
    pedido(5, "PENDIENTE", "2026-11-18T08:00:00Z"),
    pedido(9, "DESPACHADO", "2026-11-21T08:00:00Z"),
    pedido(4, "PENDIENTE", "2026-11-18T08:00:00Z"),
  ]);
  assert.deepEqual(Object.keys(grupos), ["PENDIENTE", "EN_PREPARACION", "DESPACHADO"]);
  assert.deepEqual(grupos.PENDIENTE.map((p) => p.idPedido), [4, 5, 7], "misma fecha: desempata el id");
  assert.deepEqual(grupos.EN_PREPARACION.map((p) => p.idPedido), [3]);
  assert.deepEqual(grupos.DESPACHADO.map((p) => p.idPedido), [9]);
});

test("ignora estados que no son de la cola y tolera listas vacías o inválidas", () => {
  const grupos = agruparPedidosPorEstado([pedido(1, "ENTREGADO", "x"), pedido(2, "CANCELADO", "x")]);
  assert.deepEqual(grupos, { PENDIENTE: [], EN_PREPARACION: [], DESPACHADO: [] });
  assert.deepEqual(agruparPedidosPorEstado(null), { PENDIENTE: [], EN_PREPARACION: [], DESPACHADO: [] });
});

test("no modifica la lista recibida", () => {
  const lista = [pedido(2, "PENDIENTE", "2026-11-20T00:00:00Z"), pedido(1, "PENDIENTE", "2026-11-19T00:00:00Z")];
  agruparPedidosPorEstado(lista);
  assert.deepEqual(lista.map((p) => p.idPedido), [2, 1]);
});

// ---------- Indicadores (decisión P4) ----------

const productos = [
  { id: 1, nombre: "Teclado", stock: 22, activo: true },
  { id: 2, nombre: "Mouse", stock: 0, activo: true },
  { id: 3, nombre: "Webcam", stock: 5, activo: true },
  { id: 4, nombre: "Cargador", stock: 6, activo: true },
  { id: 5, nombre: "Antiguo", stock: 1, activo: false },
];

test("indicadores: por preparar = pendientes + en preparación; despachados; stock bajo; unidades", () => {
  const pedidos = [
    pedido(1, "PENDIENTE", "a"), pedido(2, "PENDIENTE", "b"), pedido(3, "EN_PREPARACION", "c"),
    pedido(4, "DESPACHADO", "d"), pedido(5, "ENTREGADO", "e"),
  ];
  assert.deepEqual(calcularIndicadoresAlmacen(pedidos, productos), {
    porPreparar: 3,
    pendientes: 2,
    enPreparacion: 1,
    despachados: 1,
    stockBajo: 2,
    unidades: 33,
    productosActivos: 4,
  });
});

test("indicadores sin datos: todo en cero", () => {
  assert.deepEqual(calcularIndicadoresAlmacen([], []), {
    porPreparar: 0, pendientes: 0, enPreparacion: 0, despachados: 0, stockBajo: 0, unidades: 0, productosActivos: 0,
  });
});

test("un producto sin campo activo cuenta como activo (GET /api/productos solo devuelve activos)", () => {
  const r = calcularIndicadoresAlmacen([], [{ id: 1, nombre: "X", stock: 2 }]);
  assert.equal(r.productosActivos, 1);
  assert.equal(r.stockBajo, 1);
});

// ---------- Stock crítico ----------

test("stock crítico: activos con stock ≤ umbral, de menor a mayor, como máximo 5", () => {
  assert.equal(UMBRAL_STOCK_BAJO, 5);
  assert.equal(MAX_STOCK_CRITICO, 5);
  assert.deepEqual(stockCritico(productos).map((p) => p.id), [2, 3]);
  const muchos = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, nombre: `P${i + 1}`, stock: 5 - (i % 6), activo: true }));
  const lista = stockCritico(muchos);
  assert.equal(lista.length, 5);
  assert.ok(lista.every((p, i) => i === 0 || lista[i - 1].stock <= p.stock));
});

test("stock crítico: con el mismo stock ordena por nombre", () => {
  const lista = stockCritico([
    { id: 1, nombre: "Zeta", stock: 1, activo: true },
    { id: 2, nombre: "Alfa", stock: 1, activo: true },
  ]);
  assert.deepEqual(lista.map((p) => p.nombre), ["Alfa", "Zeta"]);
});

test("etiqueta de stock: Agotado (rojo), 1 unidad o {n} unidades (ámbar)", () => {
  assert.deepEqual(etiquetaStock(0), { texto: "Agotado", variante: "rojo" });
  assert.deepEqual(etiquetaStock(1), { texto: "1 unidad", variante: "ambar" });
  assert.deepEqual(etiquetaStock(4), { texto: "4 unidades", variante: "ambar" });
});

// ---------- Resumen de artículos ----------

test("resumen: una línea = «Nombre × cantidad»; varias = suma de unidades", () => {
  assert.equal(resumenArticulos({ productos: [{ nombreProducto: "Teclado inalámbrico K380", cantidad: 3 }] }),
    "Teclado inalámbrico K380 × 3");
  assert.equal(resumenArticulos({ productos: [
    { nombreProducto: "Teclado", cantidad: 2 }, { nombreProducto: "Mouse", cantidad: 3 },
  ] }), "5 artículos");
  assert.equal(resumenArticulos({ productos: [] }), "0 artículos");
  assert.equal(resumenArticulos({}), "0 artículos");
});

// ---------- Validación del formulario de entrada ----------

test("mensajes de validación", () => {
  assert.deepEqual({ ...MENSAJES_ENTRADA }, {
    producto: "Selecciona un producto.",
    cantidad: "La cantidad debe ser un número entero mayor que 0.",
    motivo: "Escribe el motivo de la entrada.",
    motivoLargo: "El motivo no puede superar 250 caracteres.",
  });
});

test("entrada válida: devuelve el cuerpo de POST /api/inventario/entradas con el motivo recortado", () => {
  assert.deepEqual(validarEntrada({ productoId: "12", cantidad: "3", motivo: "  Reposición  " }), {
    valido: true,
    cuerpo: { motivo: "Reposición", productos: [{ productoId: 12, cantidad: 3 }] },
  });
});

test("cantidad 0, vacía, decimal, negativa o no numérica: mismo mensaje y no se envía", () => {
  for (const cantidad of ["0", "", "  ", "1.5", "2,5", "-1", "abc", "1e2", undefined, null]) {
    const r = validarEntrada({ productoId: "1", cantidad, motivo: "Reposición" });
    assert.equal(r.valido, false, String(cantidad));
    assert.deepEqual(r.errores, { cantidad: MENSAJES_ENTRADA.cantidad }, String(cantidad));
  }
});

test("producto obligatorio", () => {
  for (const productoId of ["", undefined, "0", "abc"]) {
    const r = validarEntrada({ productoId, cantidad: "1", motivo: "Reposición" });
    assert.deepEqual(r.errores, { producto: MENSAJES_ENTRADA.producto }, String(productoId));
  }
});

test("motivo obligatorio (se recorta antes de validar) y de hasta 250 caracteres", () => {
  for (const motivo of ["", "   ", undefined]) {
    assert.deepEqual(validarEntrada({ productoId: "1", cantidad: "1", motivo }).errores,
      { motivo: MENSAJES_ENTRADA.motivo }, String(motivo));
  }
  assert.equal(validarEntrada({ productoId: "1", cantidad: "1", motivo: ` ${"a".repeat(250)} ` }).valido, true);
  assert.deepEqual(validarEntrada({ productoId: "1", cantidad: "1", motivo: "a".repeat(251) }).errores,
    { motivo: MENSAJES_ENTRADA.motivoLargo });
});

test("con varios errores los devuelve todos", () => {
  assert.deepEqual(validarEntrada({ productoId: "", cantidad: "0", motivo: "" }).errores, {
    producto: MENSAJES_ENTRADA.producto,
    cantidad: MENSAJES_ENTRADA.cantidad,
    motivo: MENSAJES_ENTRADA.motivo,
  });
});
