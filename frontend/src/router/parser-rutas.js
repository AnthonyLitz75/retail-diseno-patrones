/**
 * @file parser-rutas.js
 * Módulo puro de enrutamiento SPA para Píxel Andino Tech Store (RF-02)
 * Proporciona generación de slugs, parseo de URLs basadas en Hash,
 * construcción de migas de pan (breadcrumbs) y resolución de categorías.
 */

/**
 * Normaliza un texto para generar un slug canónico:
 * minúsculas, sin tildes, caracteres alfanuméricos y espacios convertidos a guiones.
 * Ejemplo: "Cargadores y cables" -> "cargadores-y-cables"
 *
 * @param {string} texto
 * @returns {string}
 */
export function generarSlug(texto) {
  if (!texto || typeof texto !== "string") return "";
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos/tildes
    .replace(/[^a-z0-9\s-]/g, "") // Eliminar caracteres no alfanuméricos
    .trim()
    .replace(/\s+/g, "-") // Espacios a guiones
    .replace(/-+/g, "-"); // Eliminar guiones consecutivos
}

/**
 * Analiza un hash de URL del navegador y devuelve la información de la ruta.
 *
 * Rutas canónicas soportadas:
 * - "" o "#" o "#/"                  -> tipo: 'inicio'
 * - "#/catalogo"                     -> tipo: 'catalogo'
 * - "#/categoria/:slug"              -> tipo: 'categoria', params: { slug }
 * - "#/categoria/:slugPadre/:slug"   -> tipo: 'subcategoria', params: { slugPadre, slug }
 * - "#/producto/:sku"                -> tipo: 'producto', params: { sku }
 * - "#/buscar?q=:texto"              -> tipo: 'buscar', query: { q }
 * - Cualquier otra                   -> tipo: '404'
 *
 * @param {string} hash - window.location.hash o string similar
 * @returns {{ tipo: string, params: Record<string, string>, query: Record<string, string>, path: string }}
 */
export function parsearRuta(hash) {
  const hashLimpio = (hash || "").replace(/^#/, "").trim();

  if (!hashLimpio || hashLimpio === "/") {
    return { tipo: "inicio", params: {}, query: {}, path: "/" };
  }

  const [rutaCompleta, queryString] = hashLimpio.split("?");
  const query = {};
  if (queryString) {
    const urlParams = new URLSearchParams(queryString);
    for (const [clave, valor] of urlParams.entries()) {
      query[clave] = valor;
    }
  }

  // Segmentar ruta (limpiando barras iniciales/finales)
  const segmentos = rutaCompleta
    .split("/")
    .filter(Boolean);

  if (segmentos.length === 0) {
    return { tipo: "inicio", params: {}, query, path: "/" };
  }

  // /catalogo
  if (segmentos.length === 1 && segmentos[0] === "catalogo") {
    return { tipo: "catalogo", params: {}, query, path: "/catalogo" };
  }

  // /pedidos o /compras
  if (
    segmentos.length === 1 &&
    ["pedidos", "compras", "mis-pedidos", "mis-compras", "seccion-pedidos"].includes(
      segmentos[0].toLowerCase(),
    )
  ) {
    return {
      tipo: "pedidos",
      params: {},
      query,
      path: `/${segmentos[0].toLowerCase()}`,
    };
  }

  // /buscar
  if (segmentos.length === 1 && segmentos[0] === "buscar") {
    return { tipo: "buscar", params: {}, query, path: "/buscar" };
  }

  // /producto/:sku
  if (segmentos.length === 2 && segmentos[0] === "producto") {
    return {
      tipo: "producto",
      params: { sku: segmentos[1].toUpperCase() },
      query,
      path: `/producto/${segmentos[1]}`,
    };
  }

  // /categoria/:slug
  if (segmentos.length === 2 && segmentos[0] === "categoria") {
    return {
      tipo: "categoria",
      params: { slug: segmentos[1].toLowerCase() },
      query,
      path: `/categoria/${segmentos[1]}`,
    };
  }

  // /categoria/:slugPadre/:slugHija
  if (segmentos.length === 3 && segmentos[0] === "categoria") {
    return {
      tipo: "subcategoria",
      params: {
        slugPadre: segmentos[1].toLowerCase(),
        slug: segmentos[2].toLowerCase(),
      },
      query,
      path: `/categoria/${segmentos[1]}/${segmentos[2]}`,
    };
  }

  // Ruta desconocida -> 404
  return { tipo: "404", params: {}, query, path: rutaCompleta };
}

/**
 * Busca una categoría o subcategoría en el árbol Composite mediante su slug.
 *
 * @param {Array<object>} arbolCategorias
 * @param {string} slugBuscado
 * @returns {{ categoria: object, padre: object|null }|null}
 */
export function buscarCategoriaPorSlug(arbolCategorias, slugBuscado) {
  if (!Array.isArray(arbolCategorias) || !slugBuscado) return null;

  for (const cat of arbolCategorias) {
    const slugCat = generarSlug(cat.nombre);
    if (slugCat === slugBuscado) {
      return { categoria: cat, padre: null };
    }

    if (Array.isArray(cat.subcategorias)) {
      for (const sub of cat.subcategorias) {
        if (generarSlug(sub.nombre) === slugBuscado) {
          return { categoria: sub, padre: cat };
        }
      }
    }
  }

  return null;
}

/**
 * Genera el array de migas de pan (breadcrumbs) para la ruta activa.
 * Cada elemento tiene formato: { etiqueta: string, url: string, esActivo: boolean }
 *
 * @param {object} rutaInfo - Objeto retornado por parsearRuta
 * @param {Array<object>} [arbolCategorias=[]]
 * @param {object|null} [producto=null]
 * @returns {Array<{ etiqueta: string, url: string, esActivo: boolean }>}
 */
export function construirBreadcrumbs(rutaInfo, arbolCategorias = [], producto = null) {
  const crumbs = [{ etiqueta: "Inicio", url: "#/", esActivo: false }];

  if (!rutaInfo || rutaInfo.tipo === "inicio") {
    crumbs[0].esActivo = true;
    return crumbs;
  }

  if (rutaInfo.tipo === "catalogo") {
    crumbs.push({ etiqueta: "Catálogo", url: "#/catalogo", esActivo: true });
    return crumbs;
  }

  if (rutaInfo.tipo === "buscar") {
    crumbs.push({ etiqueta: "Catálogo", url: "#/catalogo", esActivo: false });
    const termino = rutaInfo.query?.q ? `"${rutaInfo.query.q}"` : "General";
    crumbs.push({
      etiqueta: `Búsqueda: ${termino}`,
      url: `#/buscar?q=${encodeURIComponent(rutaInfo.query?.q || "")}`,
      esActivo: true,
    });
    return crumbs;
  }

  if (rutaInfo.tipo === "categoria") {
    crumbs.push({ etiqueta: "Catálogo", url: "#/catalogo", esActivo: false });
    const hallazgo = buscarCategoriaPorSlug(arbolCategorias, rutaInfo.params.slug);
    const nombre = hallazgo ? hallazgo.categoria.nombre : rutaInfo.params.slug;
    crumbs.push({
      etiqueta: nombre,
      url: `#/categoria/${rutaInfo.params.slug}`,
      esActivo: true,
    });
    return crumbs;
  }

  if (rutaInfo.tipo === "subcategoria") {
    crumbs.push({ etiqueta: "Catálogo", url: "#/catalogo", esActivo: false });
    const hallazgo = buscarCategoriaPorSlug(arbolCategorias, rutaInfo.params.slug);
    const nombrePadre = hallazgo?.padre?.nombre || rutaInfo.params.slugPadre;
    const nombreHija = hallazgo?.categoria?.nombre || rutaInfo.params.slug;

    crumbs.push({
      etiqueta: nombrePadre,
      url: `#/categoria/${rutaInfo.params.slugPadre}`,
      esActivo: false,
    });
    crumbs.push({
      etiqueta: nombreHija,
      url: `#/categoria/${rutaInfo.params.slugPadre}/${rutaInfo.params.slug}`,
      esActivo: true,
    });
    return crumbs;
  }

  if (rutaInfo.tipo === "producto") {
    crumbs.push({ etiqueta: "Catálogo", url: "#/catalogo", esActivo: false });
    if (producto?.categoria) {
      const slugCat = generarSlug(producto.categoria);
      crumbs.push({
        etiqueta: producto.categoria,
        url: `#/categoria/${slugCat}`,
        esActivo: false,
      });
    }
    crumbs.push({
      etiqueta: producto?.nombre || rutaInfo.params.sku || "Producto",
      url: `#/producto/${rutaInfo.params.sku}`,
      esActivo: true,
    });
    return crumbs;
  }

  if (rutaInfo.tipo === "404") {
    crumbs.push({
      etiqueta: "Página no encontrada",
      url: "",
      esActivo: true,
    });
    return crumbs;
  }

  return crumbs;
}
