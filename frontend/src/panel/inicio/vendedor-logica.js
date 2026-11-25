/**
 * @file vendedor-logica.js
 * Panel del personal (spec 15 y decisiones de T07): cálculos del Inicio del Vendedor.
 * Funciones puras, sin DOM ni red. Los conteos de productos reutilizan contarPestanas de
 * panel-productos.js (su «stock bajo» ya es: activos con stock ≤ UMBRAL_STOCK_BAJO).
 */

import { contarPestanas, UMBRAL_STOCK_BAJO } from "../../catalogo/gestion/panel-productos.js";

export const MAX_FILAS_STOCK_BAJO = 5;
export const MAX_PREGUNTAS_INICIO = 3;
export const MAX_TEXTO_PREGUNTA = 80;
const PUNTOS_SUSPENSIVOS = "…";
const PORCENTAJE_TOTAL = 100;

const comoLista = (valor) => (Array.isArray(valor) ? valor : []);
const esActivo = (producto) => producto?.activo !== false;

/** Activos, desactivados y stock bajo con la definición ya probada de panel-productos.js. */
export function indicadoresProductos(productos) {
  const conteo = contarPestanas(comoLista(productos));
  return { activos: conteo.activos, desactivados: conteo.desactivados, stockBajo: conteo["stock-bajo"] };
}

/**
 * Todos los activos con stock ≤ UMBRAL_STOCK_BAJO, de menor a mayor stock (empate: por nombre).
 * Devuelve los mismos objetos de gestión (los que recibe el modal de stock).
 */
export function productosStockBajo(productos) {
  return comoLista(productos)
    .filter((p) => esActivo(p) && Number(p.stock) <= UMBRAL_STOCK_BAJO)
    .sort((a, b) => Number(a.stock) - Number(b.stock) || String(a.nombre).localeCompare(String(b.nombre), "es"));
}

/** Insignia de la fila: «Agotado» (rojo) si 0; «Stock bajo» (ámbar) si no. */
export function estadoStockBajo(stock) {
  return Number(stock) <= 0 ? { texto: "Agotado", variante: "rojo" } : { texto: "Stock bajo", variante: "ambar" };
}

function compararAntiguedad(a, b) {
  const fechaA = Date.parse(a?.creadaEn);
  const fechaB = Date.parse(b?.creadaEn);
  if (!Number.isNaN(fechaA) && !Number.isNaN(fechaB) && fechaA !== fechaB) return fechaA - fechaB;
  return Number(a?.idConsulta) - Number(b?.idConsulta);
}

/** Las preguntas más antiguas (fecha ascendente; sin fecha, por id ascendente). */
export function preguntasMasAntiguas(preguntas, cantidad = MAX_PREGUNTAS_INICIO) {
  return [...comoLista(preguntas)].sort(compararAntiguedad).slice(0, cantidad);
}

/** Texto de hasta MAX_TEXTO_PREGUNTA caracteres; si se corta, termina en «…». */
export function resumirTexto(texto, maximo = MAX_TEXTO_PREGUNTA) {
  const limpio = String(texto ?? "").trim();
  if (limpio.length <= maximo) return limpio;
  return `${limpio.slice(0, maximo - PUNTOS_SUSPENSIVOS.length).trimEnd()}${PUNTOS_SUSPENSIVOS}`;
}

/** Nombre del producto de una pregunta: del DTO, de la lista de gestión o «Producto #{id}». */
export function nombreProductoPregunta(pregunta, productos) {
  if (pregunta?.nombreProducto) return pregunta.nombreProducto;
  const producto = comoLista(productos).find((p) => Number(p.id) === Number(pregunta?.productoId));
  return producto?.nombre ?? `Producto #${pregunta?.productoId}`;
}

/** Texto del enlace bajo «Productos con stock bajo»: «Ver el producto» o «Ver los {n}». */
export function textoVerStockBajo(total) {
  return total === 1 ? "Ver el producto" : `Ver los ${total}`;
}

export function detallePreguntas(pendientes) {
  return pendientes === 0 ? "Todo respondido" : "Esperan tu respuesta";
}

/** Barras del catálogo: ancho = cantidad / total × 100 %; con total 0, ambas al 0 %. */
export function barrasCatalogo({ activos = 0, desactivados = 0 } = {}) {
  const total = activos + desactivados;
  const porcentaje = (cantidad) => (total === 0 ? 0 : (cantidad / total) * PORCENTAJE_TOTAL);
  return {
    total,
    activos: { cantidad: activos, porcentaje: porcentaje(activos) },
    desactivados: { cantidad: desactivados, porcentaje: porcentaje(desactivados) },
  };
}
