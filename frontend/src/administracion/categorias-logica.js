/**
 * @file categorias-logica.js
 * Lógica pura de jerarquía (2 niveles, patrón Composite), filtrado, validación y resúmenes
 * para el panel de administración de categorías.
 */

const compararNombre = (a, b) => a.nombre.localeCompare(b.nombre, "es");

export const ESTADOS_FILTRO_CATEGORIA = Object.freeze({
  TODAS: "todas",
  ACTIVAS: "activas",
  INACTIVAS: "inactivas",
});

/**
 * Normaliza texto para búsqueda insensible a tildes y mayúsculas.
 * @param {string} texto
 */
export function normalizarTextoBusqueda(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

/**
 * Organiza categorías planas en raíces seguidas inmediatamente por sus subcategorías ordenadas.
 * @param {Array<{idCategoria: number, nombre: string, activa?: boolean, categoriaPadreId?: number | null, totalProductos?: number}>} categorias
 */
export function construirJerarquiaCategorias(categorias) {
  const lista = Array.isArray(categorias) ? [...categorias] : [];
  const porId = new Map(lista.map((c) => [c.idCategoria, c]));
  const raices = [];
  const hijasPorPadre = new Map();

  for (const cat of lista) {
    const padre = cat.categoriaPadreId != null ? porId.get(cat.categoriaPadreId) : null;
    if (!padre) {
      raices.push(cat);
    } else {
      if (!hijasPorPadre.has(padre.idCategoria)) {
        hijasPorPadre.set(padre.idCategoria, []);
      }
      hijasPorPadre.get(padre.idCategoria).push(cat);
    }
  }

  raices.sort(compararNombre);
  for (const hijas of hijasPorPadre.values()) {
    hijas.sort(compararNombre);
  }

  const filas = [];
  for (const raiz of raices) {
    const hijas = hijasPorPadre.get(raiz.idCategoria) ?? [];
    filas.push({
      categoria: raiz,
      esSubcategoria: false,
      padreNombre: null,
      totalSubcategorias: hijas.length,
    });
    for (const hija of hijas) {
      filas.push({
        categoria: hija,
        esSubcategoria: true,
        padreNombre: raiz.nombre,
        totalSubcategorias: 0,
      });
    }
  }

  return { raices, hijasPorPadre, filas };
}

/**
 * Devuelve las categorías principales elegibles como padre (excluyendo la propia categoría editada).
 * @param {Array<{idCategoria: number, nombre: string, categoriaPadreId?: number | null}>} raices
 * @param {number | null} [excluirId]
 */
export function principalesDisponiblesPara(raices, excluirId = null) {
  return (Array.isArray(raices) ? raices : [])
    .filter((c) => c && c.categoriaPadreId == null && c.idCategoria !== excluirId);
}

/**
 * Filtra el árbol de categorías por estado (`todas`/`activas`/`inactivas`) y texto,
 * preservando el grupo padre cuando alguna subcategoría coincide.
 * @param {Array<Object>} categorias
 * @param {{ estado?: string, texto?: string }} [criterios]
 */
export function filtrarArbolCategorias(categorias, { estado = ESTADOS_FILTRO_CATEGORIA.TODAS, texto = "" } = {}) {
  const lista = Array.isArray(categorias) ? categorias : [];
  const { raices, hijasPorPadre } = construirJerarquiaCategorias(lista);
  const estadoNormalizado = Object.values(ESTADOS_FILTRO_CATEGORIA).includes(estado)
    ? estado
    : ESTADOS_FILTRO_CATEGORIA.TODAS;
  const termino = normalizarTextoBusqueda(texto);
  const hayFiltrosActivos = estadoNormalizado !== ESTADOS_FILTRO_CATEGORIA.TODAS || termino.length > 0;

  const coincideEstado = (categoria) => {
    if (estadoNormalizado === ESTADOS_FILTRO_CATEGORIA.ACTIVAS) return Boolean(categoria.activa);
    if (estadoNormalizado === ESTADOS_FILTRO_CATEGORIA.INACTIVAS) return !categoria.activa;
    return true;
  };
  const coincideTexto = (categoria) => !termino || normalizarTextoBusqueda(categoria.nombre).includes(termino);

  const grupos = [];
  const idsVisibles = [];
  let filasVisibles = 0;

  for (const raiz of raices) {
    const hijas = hijasPorPadre.get(raiz.idCategoria) ?? [];
    const raizCoincideTexto = coincideTexto(raiz);
    const raizCoincide = coincideEstado(raiz) && raizCoincideTexto;
    const hijasVisibles = hijas.filter((hija) => coincideEstado(hija) && (raizCoincideTexto || coincideTexto(hija)));

    if (!raizCoincide && hijasVisibles.length === 0) continue;

    if (raizCoincide) idsVisibles.push(raiz.idCategoria);
    for (const hija of hijasVisibles) idsVisibles.push(hija.idCategoria);
    filasVisibles += 1 + hijasVisibles.length;

    const totalProductosRama = Number(raiz.totalProductos ?? 0) +
      hijas.reduce((acumulado, hija) => acumulado + Number(hija.totalProductos ?? 0), 0);

    grupos.push({
      raiz,
      hijas: hijasVisibles,
      totalSubcategorias: hijas.length,
      totalProductosRama,
      raizCoincide,
    });
  }

  return {
    grupos,
    idsVisibles,
    filasVisibles,
    totalPrincipales: raices.length,
    totalSubcategorias: Math.max(0, lista.length - raices.length),
    hayFiltrosActivos,
  };
}

/**
 * Valida el nombre de una categoría antes de enviarlo al servidor.
 * @param {string} valor
 * @returns {string} Mensaje de error o cadena vacía si es válido.
 */
export function validarNombreCategoria(valor) {
  const limpio = String(valor ?? "").trim();
  if (!limpio) return "Ingresa un nombre para la categoría.";
  if (limpio.length > 80) return "El nombre no puede superar los 80 caracteres.";
  return "";
}

/**
 * Construye las opciones de confirmación al desactivar categorías con subcategorías o productos.
 * Devuelve null si no hay impacto dependiente que requiera confirmación.
 * @param {Array<Object>} objetivos
 * @param {Array<Object>} todasLasCategorias
 */
export function construirConfirmacionDesactivacion(objetivos, todasLasCategorias) {
  const listaObjetivos = Array.isArray(objetivos) ? objetivos : [];
  if (listaObjetivos.length === 0) return null;

  const { hijasPorPadre } = construirJerarquiaCategorias(todasLasCategorias);
  const idsObjetivos = new Set(listaObjetivos.map((c) => c.idCategoria));
  const idsContabilizados = new Set();
  let subcategorias = 0;
  let productos = 0;

  for (const cat of listaObjetivos) {
    if (!idsContabilizados.has(cat.idCategoria)) {
      idsContabilizados.add(cat.idCategoria);
      productos += Number(cat.totalProductos ?? 0);
    }
    const hijas = hijasPorPadre.get(cat.idCategoria) ?? [];
    subcategorias += hijas.length;
    for (const hija of hijas) {
      if (!idsContabilizados.has(hija.idCategoria) && !idsObjetivos.has(hija.idCategoria)) {
        idsContabilizados.add(hija.idCategoria);
        productos += Number(hija.totalProductos ?? 0);
      }
    }
  }

  if (subcategorias === 0 && productos === 0) return null;

  const partes = [];
  if (subcategorias > 0) partes.push(formatearContadorSubcategorias(subcategorias));
  if (productos > 0) partes.push(productos === 1 ? "1 producto activo" : `${productos} productos activos`);

  const esUnica = listaObjetivos.length === 1;
  return {
    titulo: esUnica ? "Desactivar categoría" : "Desactivar categorías",
    mensaje: esUnica
      ? `La categoría "${listaObjetivos[0].nombre}" tiene ${partes.join(" y ")}. Si la desactivas, dejará de mostrarse en el catálogo público. ¿Deseas continuar?`
      : `Vas a desactivar ${listaObjetivos.length} categorías con ${partes.join(" y ")}. Dejarán de mostrarse en el catálogo público. ¿Deseas continuar?`,
    textoBoton: "Desactivar",
    claseBoton: "btn-danger",
  };
}

export function formatearContadorSubcategorias(total) {
  const n = Number(total ?? 0);
  return n === 1 ? "1 subcategoría" : `${n} subcategorías`;
}

export function formatearContadorProductos(total) {
  const n = Number(total ?? 0);
  return n === 1 ? "1 producto" : `${n} productos`;
}
