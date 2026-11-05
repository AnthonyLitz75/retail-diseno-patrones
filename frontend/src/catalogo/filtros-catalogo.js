/**
 * Módulo de filtros avanzados y ordenamiento en cliente para el catálogo de productos.
 */

export const CRITERIOS_ORDEN = {
  DEFECTO: "defecto",
  PRECIO_ASC: "precio_asc",
  PRECIO_DESC: "precio_desc",
  NOMBRE_ASC: "nombre_asc",
  NOMBRE_DESC: "nombre_desc",
};

/**
 * Aplica ordenamiento y filtros en memoria a una colección de productos.
 *
 * @param {Array<object>} productos - Colección de productos
 * @param {object} [opciones={}]
 * @param {string} [opciones.criterioOrden='defecto'] - 'defecto' | 'precio_asc' | 'precio_desc' | 'nombre_asc' | 'nombre_desc'
 * @param {boolean} [opciones.soloEnStock=false] - Si es true, solo incluye productos con stock > 0
 * @returns {Array<object>} Nueva colección ordenada y filtrada
 */
export function aplicarFiltrosYOrden(
  productos,
  { criterioOrden = CRITERIOS_ORDEN.DEFECTO, soloEnStock = false } = {},
) {
  if (!Array.isArray(productos)) {
    return [];
  }

  let resultado = [...productos];

  if (soloEnStock) {
    resultado = resultado.filter((producto) => Number(producto?.stock) > 0);
  }

  switch (criterioOrden) {
    case CRITERIOS_ORDEN.PRECIO_ASC:
      resultado.sort((a, b) => Number(a?.precio ?? 0) - Number(b?.precio ?? 0));
      break;
    case CRITERIOS_ORDEN.PRECIO_DESC:
      resultado.sort((a, b) => Number(b?.precio ?? 0) - Number(a?.precio ?? 0));
      break;
    case CRITERIOS_ORDEN.NOMBRE_ASC:
      resultado.sort((a, b) =>
        String(a?.nombre ?? "").localeCompare(String(b?.nombre ?? ""), "es", {
          sensitivity: "base",
        }),
      );
      break;
    case CRITERIOS_ORDEN.NOMBRE_DESC:
      resultado.sort((a, b) =>
        String(b?.nombre ?? "").localeCompare(String(a?.nombre ?? ""), "es", {
          sensitivity: "base",
        }),
      );
      break;
    case CRITERIOS_ORDEN.DEFECTO:
    default:
      // Conserva el orden original
      break;
  }

  return resultado;
}

/**
 * Genera la lista de chips de filtros activos para visualización en la interfaz.
 *
 * @param {object} filtros
 * @param {string} [filtros.busqueda]
 * @param {string} [filtros.categoria]
 * @param {number|string} [filtros.precioMin]
 * @param {number|string} [filtros.precioMax]
 * @param {boolean} [filtros.soloEnStock]
 * @returns {Array<{ tipo: string, label: string }>}
 */
export function obtenerChipsFiltrosActivos({
  busqueda = "",
  categoria = "",
  precioMin = "",
  precioMax = "",
  soloEnStock = false,
} = {}) {
  const chips = [];

  const busquedaLimpia = String(busqueda ?? "").trim();
  if (busquedaLimpia) {
    chips.push({ tipo: "busqueda", label: `Búsqueda: "${busquedaLimpia}"` });
  }

  const categoriaLimpia = String(categoria ?? "").trim();
  if (categoriaLimpia) {
    chips.push({ tipo: "categoria", label: `Categoría: ${categoriaLimpia}` });
  }

  const pMin = Number(precioMin);
  if (precioMin !== "" && !Number.isNaN(pMin) && pMin > 0) {
    chips.push({ tipo: "precioMin", label: `Precio mín: S/ ${pMin.toFixed(2)}` });
  }

  const pMax = Number(precioMax);
  if (precioMax !== "" && !Number.isNaN(pMax) && pMax > 0) {
    chips.push({ tipo: "precioMax", label: `Precio máx: S/ ${pMax.toFixed(2)}` });
  }

  if (soloEnStock) {
    chips.push({ tipo: "soloEnStock", label: "Solo en stock" });
  }

  return chips;
}

/**
 * Cantidad estándar de productos por página en el catálogo (RF-03).
 */
export const PRODUCTOS_POR_PAGINA = 12;

/**
 * Realiza la partición paginada de una colección de productos.
 *
 * @param {Array<object>} productos - Colección completa o filtrada
 * @param {number} [paginaActual=1] - Número de página (1-indexado)
 * @param {number} [porPagina=12] - Tamaño del lote por página
 * @returns {{
 *   items: Array<object>,
 *   totalItems: number,
 *   totalPaginas: number,
 *   paginaActual: number,
 *   porPagina: number,
 *   tieneAnterior: boolean,
 *   tieneSiguiente: boolean,
 *   indiceInicio: number,
 *   indiceFin: number
 * }}
 */
export function paginarProductos(
  productos,
  paginaActual = 1,
  porPagina = PRODUCTOS_POR_PAGINA,
) {
  if (!Array.isArray(productos)) {
    return {
      items: [],
      totalItems: 0,
      totalPaginas: 0,
      paginaActual: 1,
      porPagina,
      tieneAnterior: false,
      tieneSiguiente: false,
      indiceInicio: 0,
      indiceFin: 0,
    };
  }

  const totalItems = productos.length;
  const tamano = Math.max(1, Number(porPagina) || PRODUCTOS_POR_PAGINA);
  const totalPaginas = Math.ceil(totalItems / tamano);

  let pagina = Math.floor(Number(paginaActual) || 1);
  if (pagina < 1) pagina = 1;
  if (totalPaginas > 0 && pagina > totalPaginas) pagina = totalPaginas;

  const inicio = totalItems === 0 ? 0 : (pagina - 1) * tamano;
  const fin = Math.min(inicio + tamano, totalItems);
  const items = totalItems > 0 ? productos.slice(inicio, fin) : [];

  return {
    items,
    totalItems,
    totalPaginas,
    paginaActual: totalPaginas === 0 ? 1 : pagina,
    porPagina: tamano,
    tieneAnterior: pagina > 1,
    tieneSiguiente: pagina < totalPaginas,
    indiceInicio: totalItems === 0 ? 0 : inicio + 1,
    indiceFin: fin,
  };
}
