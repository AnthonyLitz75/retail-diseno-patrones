/**
 * @file almacen-logica.js
 * Panel del personal (spec 14 y decisión P4): cálculos del Inicio de Almacén. Funciones puras,
 * sin DOM ni red; almacen-inicio.js las usa con los datos de GET /api/pedidos/operativos y
 * GET /api/productos.
 */

import { ESTADO_PEDIDO } from "../../utilidades/constantes.js";
import { UMBRAL_STOCK_BAJO } from "../../catalogo/gestion/panel-productos.js";

/** Estados de la cola, en el orden de sus columnas. */
export const ESTADOS_COLA = Object.freeze([
  ESTADO_PEDIDO.PENDIENTE,
  ESTADO_PEDIDO.EN_PREPARACION,
  ESTADO_PEDIDO.DESPACHADO,
]);

export const MAX_STOCK_CRITICO = 5;

export const MAX_MOTIVO_ENTRADA = 250;

export const MENSAJES_ENTRADA = Object.freeze({
  producto: "Selecciona un producto.",
  cantidad: "La cantidad debe ser un número entero mayor que 0.",
  motivo: "Escribe el motivo de la entrada.",
  motivoLargo: `El motivo no puede superar ${MAX_MOTIVO_ENTRADA} caracteres.`,
});

const ENTERO_POSITIVO = /^[1-9]\d*$/;

const comoLista = (valor) => (Array.isArray(valor) ? valor : []);
const stockDe = (producto) => Math.max(0, Number(producto?.stock) || 0);
/** GET /api/productos solo devuelve activos; un producto sin el campo cuenta como activo. */
const esActivo = (producto) => producto?.activo !== false;

function compararAntiguedad(a, b) {
  const diferencia = (Date.parse(a.creadoEn) || 0) - (Date.parse(b.creadoEn) || 0);
  return diferencia !== 0 ? diferencia : Number(a.idPedido) - Number(b.idPedido);
}

/**
 * Pedidos de la cola por estado, del más antiguo al más nuevo. No modifica la lista recibida.
 * @param {Array<object>} pedidos
 * @returns {{ PENDIENTE: object[], EN_PREPARACION: object[], DESPACHADO: object[] }}
 */
export function agruparPedidosPorEstado(pedidos) {
  const grupos = Object.fromEntries(ESTADOS_COLA.map((estado) => [estado, []]));
  for (const pedido of comoLista(pedidos)) {
    if (Object.hasOwn(grupos, pedido?.estado)) grupos[pedido.estado].push(pedido);
  }
  for (const estado of ESTADOS_COLA) grupos[estado].sort(compararAntiguedad);
  return grupos;
}

/**
 * Indicadores del Inicio (decisión P4).
 * @param {Array<object>} pedidos
 * @param {Array<object>} productos
 */
export function calcularIndicadoresAlmacen(pedidos, productos) {
  const grupos = agruparPedidosPorEstado(pedidos);
  const activos = comoLista(productos).filter(esActivo);
  const pendientes = grupos.PENDIENTE.length;
  const enPreparacion = grupos.EN_PREPARACION.length;
  return {
    porPreparar: pendientes + enPreparacion,
    pendientes,
    enPreparacion,
    despachados: grupos.DESPACHADO.length,
    stockBajo: activos.filter((p) => stockDe(p) <= UMBRAL_STOCK_BAJO).length,
    unidades: activos.reduce((total, p) => total + stockDe(p), 0),
    productosActivos: activos.length,
  };
}

/**
 * Hasta MAX_STOCK_CRITICO productos activos con stock ≤ UMBRAL_STOCK_BAJO, de menor a mayor
 * (con el mismo stock, por nombre).
 * @param {Array<object>} productos
 */
export function stockCritico(productos) {
  return comoLista(productos)
    .filter((p) => esActivo(p) && stockDe(p) <= UMBRAL_STOCK_BAJO)
    .sort((a, b) => stockDe(a) - stockDe(b) || String(a.nombre).localeCompare(String(b.nombre), "es"))
    .slice(0, MAX_STOCK_CRITICO)
    .map((p) => ({ id: p.id, nombre: p.nombre, stock: stockDe(p) }));
}

/** Insignia de un producto con stock crítico. */
export function etiquetaStock(stock) {
  const cantidad = Math.max(0, Number(stock) || 0);
  if (cantidad === 0) return { texto: "Agotado", variante: "rojo" };
  return { texto: cantidad === 1 ? "1 unidad" : `${cantidad} unidades`, variante: "ambar" };
}

/** «Nombre × cantidad» con una sola línea; si no, la suma de unidades: «{n} artículos». */
export function resumenArticulos(pedido) {
  const lineas = comoLista(pedido?.productos);
  if (lineas.length === 1) return `${lineas[0].nombreProducto} × ${lineas[0].cantidad}`;
  const unidades = lineas.reduce((total, l) => total + (Number(l.cantidad) || 0), 0);
  return `${unidades} artículos`;
}

/**
 * Valida el formulario de entrada rápida. El motivo se recorta antes de validar.
 * @param {{ productoId?: string, cantidad?: string, motivo?: string }} valores
 * @returns {{ valido: true, cuerpo: object } | { valido: false, errores: Record<string, string> }}
 */
export function validarEntrada({ productoId, cantidad, motivo } = {}) {
  const errores = {};
  const producto = String(productoId ?? "").trim();
  const unidades = String(cantidad ?? "").trim();
  const texto = String(motivo ?? "").trim();

  if (!ENTERO_POSITIVO.test(producto)) errores.producto = MENSAJES_ENTRADA.producto;
  if (!ENTERO_POSITIVO.test(unidades)) errores.cantidad = MENSAJES_ENTRADA.cantidad;
  if (!texto) errores.motivo = MENSAJES_ENTRADA.motivo;
  else if (texto.length > MAX_MOTIVO_ENTRADA) errores.motivo = MENSAJES_ENTRADA.motivoLargo;

  if (Object.keys(errores).length > 0) return { valido: false, errores };
  return {
    valido: true,
    cuerpo: { motivo: texto, productos: [{ productoId: Number(producto), cantidad: Number(unidades) }] },
  };
}
