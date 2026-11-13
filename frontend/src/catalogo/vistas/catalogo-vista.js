/**
 * Módulo de Vista de Catálogo y Vitrina Comercial para Píxel Andino Tech Store.
 * Gestiona el renderizado de la cuadrícula de productos, vitrina destacada,
 * paginación numérica accesible y chips de filtros activos.
 */

import { distribuirProductosVitrina } from "./vitrina.js";
import { obtenerChipsFiltrosActivos } from "../componentes/filtros-catalogo.js";
import { crearElementoTarjetaProducto } from "../componentes/tarjeta-producto.js";

/**
 * Puebla las secciones de la vitrina comercial de la portada (RF-04).
 *
 * @param {Array<object>} productos - Catálogo completo de productos
 * @param {object} [elementos] - Referencias DOM de los contenedores
 * @param {object} [opciones] - Opciones y callbacks para las tarjetas
 */
export function poblarVitrinaInicio(
  productos,
  {
    gridDestacados = document.querySelector("#grid-destacados"),
    trackNuevos = document.querySelector("#carrusel-nuevos-track"),
    trackOfertas = document.querySelector("#carrusel-ofertas-track"),
    gridComponentes = document.querySelector("#grid-componentes"),
    usuarioSesion = null,
    callbacks = {},
  } = {},
) {
  const vitrina = distribuirProductosVitrina(productos);

  // 1. Destacados
  if (gridDestacados) {
    gridDestacados.replaceChildren();
    vitrina.destacados.forEach((prod) => {
      gridDestacados.append(
        crearElementoTarjetaProducto(prod, {
          esCarousel: false,
          usuarioSesion,
          callbacks,
        }),
      );
    });
  }

  // 2. Nuevos Productos
  if (trackNuevos) {
    trackNuevos.replaceChildren();
    vitrina.nuevos.forEach((prod) => {
      trackNuevos.append(
        crearElementoTarjetaProducto(prod, {
          esCarousel: true,
          usuarioSesion,
          callbacks,
        }),
      );
    });
  }

  // 3. Ofertas Destacadas
  if (trackOfertas) {
    trackOfertas.replaceChildren();
    vitrina.ofertas.forEach((prod) => {
      trackOfertas.append(
        crearElementoTarjetaProducto(prod, {
          esCarousel: true,
          usuarioSesion,
          callbacks,
        }),
      );
    });
  }

  // 4. Componentes para PC
  if (gridComponentes) {
    gridComponentes.replaceChildren();
    vitrina.componentes.forEach((prod) => {
      gridComponentes.append(
        crearElementoTarjetaProducto(prod, {
          esCarousel: false,
          usuarioSesion,
          callbacks,
        }),
      );
    });
  }
}

/**
 * Renderiza la lista paginada de productos o el estado vacío del catálogo.
 *
 * @param {Array<object>} productos - Productos filtrados para la página actual
 * @param {object|null} paginacionInfo - Información de paginación
 * @param {object} opciones - Referencias DOM y eventos
 */
export function mostrarProductos(
  productos,
  paginacionInfo = null,
  {
    contenedor = document.querySelector("#productos"),
    estadoCatalogo = document.querySelector("#estado-catalogo"),
    contenedorPaginacion = document.querySelector("#contenedor-paginacion"),
    onResetFiltros = null,
    usuarioSesion = null,
    callbacks = {},
  } = {},
) {
  if (!contenedor) return;

  contenedor.removeAttribute("aria-busy");
  contenedor.replaceChildren();

  if (!productos || productos.length === 0) {
    if (contenedorPaginacion) contenedorPaginacion.hidden = true;
    if (estadoCatalogo) estadoCatalogo.textContent = "";

    const vacioCol = document.createElement("div");
    vacioCol.className = "w-100";
    vacioCol.style.gridColumn = "1 / -1";
    vacioCol.innerHTML = `
      <div class="catalog-empty-state card border-0 text-center py-5 px-3">
        <div class="empty-state-icon mx-auto mb-3" aria-hidden="true">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h3 class="h5 fw-bold text-dark mb-2">No se encontraron productos</h3>
        <p class="text-secondary small mx-auto mb-3" style="max-width: 420px;">
          No hay artículos que coincidan con los filtros aplicados. Prueba buscando con otros términos o restableciendo los filtros.
        </p>
        <div>
          <button type="button" class="btn btn-outline-primary btn-sm px-3" id="btn-reset-filtros-empty">
            Restablecer filtros
          </button>
        </div>
      </div>
    `;

    const botonReset = vacioCol.querySelector("#btn-reset-filtros-empty");
    if (botonReset && typeof onResetFiltros === "function") {
      botonReset.addEventListener("click", onResetFiltros);
    }
    contenedor.append(vacioCol);
    return;
  }

  if (estadoCatalogo) {
    if (paginacionInfo && paginacionInfo.totalPaginas > 1) {
      estadoCatalogo.textContent = `Mostrando ${paginacionInfo.indiceInicio}-${paginacionInfo.indiceFin} de ${paginacionInfo.totalItems} productos`;
    } else {
      const total = paginacionInfo ? paginacionInfo.totalItems : productos.length;
      estadoCatalogo.textContent =
        total === 1 ? "1 producto encontrado" : `${total} productos encontrados`;
    }
  }

  productos.forEach((producto) => {
    contenedor.append(
      crearElementoTarjetaProducto(producto, {
        esCarousel: false,
        usuarioSesion,
        callbacks,
      }),
    );
  });
}

/**
 * Renderiza los controles de paginación numérica con accesibilidad.
 *
 * @param {object} paginacionInfo - Objeto de resultado de paginarProductos()
 * @param {object} opciones - Referencias DOM y callback de cambio de página
 */
export function renderizarPaginacion(
  paginacionInfo,
  {
    contenedorPaginacion = document.querySelector("#contenedor-paginacion"),
    listaPaginacion = document.querySelector("#lista-paginacion"),
    onCambiarPagina = null,
  } = {},
) {
  if (!contenedorPaginacion || !listaPaginacion) return;

  if (!paginacionInfo || paginacionInfo.totalPaginas <= 1) {
    contenedorPaginacion.hidden = true;
    listaPaginacion.replaceChildren();
    return;
  }

  contenedorPaginacion.hidden = false;
  listaPaginacion.replaceChildren();

  // Botón Anterior
  const liPrev = document.createElement("li");
  liPrev.className = `page-item ${!paginacionInfo.tieneAnterior ? "disabled" : ""}`;
  const aPrev = document.createElement("a");
  aPrev.className = "page-link";
  aPrev.href = "#productos";
  aPrev.setAttribute("aria-label", "Página anterior");
  aPrev.innerHTML = "&laquo; Anterior";
  aPrev.addEventListener("click", (e) => {
    e.preventDefault();
    if (paginacionInfo.tieneAnterior && typeof onCambiarPagina === "function") {
      onCambiarPagina(paginacionInfo.paginaActual - 1);
    }
  });
  liPrev.append(aPrev);
  listaPaginacion.append(liPrev);

  // Botones Numéricos 1..N
  for (let i = 1; i <= paginacionInfo.totalPaginas; i++) {
    const li = document.createElement("li");
    const esActual = i === paginacionInfo.paginaActual;
    li.className = `page-item ${esActual ? "active" : ""}`;
    const a = document.createElement("a");
    a.className = "page-link";
    a.href = "#productos";
    a.textContent = String(i);
    if (esActual) {
      a.setAttribute("aria-current", "page");
    }
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (!esActual && typeof onCambiarPagina === "function") {
        onCambiarPagina(i);
      }
    });
    li.append(a);
    listaPaginacion.append(li);
  }

  // Botón Siguiente
  const liNext = document.createElement("li");
  liNext.className = `page-item ${!paginacionInfo.tieneSiguiente ? "disabled" : ""}`;
  const aNext = document.createElement("a");
  aNext.className = "page-link";
  aNext.href = "#productos";
  aNext.setAttribute("aria-label", "Página siguiente");
  aNext.innerHTML = "Siguiente &raquo;";
  aNext.addEventListener("click", (e) => {
    e.preventDefault();
    if (paginacionInfo.tieneSiguiente && typeof onCambiarPagina === "function") {
      onCambiarPagina(paginacionInfo.paginaActual + 1);
    }
  });
  liNext.append(aNext);
  listaPaginacion.append(liNext);
}

/**
 * Renderiza los chips interactivos de filtros activos en la barra de búsqueda.
 *
 * @param {object} opciones
 * @param {object} opciones.filtros - Estado actual de los filtros
 * @param {HTMLElement} [opciones.contenedorChips] - Contenedor DOM de chips
 * @param {Function} [opciones.onQuitarFiltro] - Callback invocado al cerrar un chip
 */
export function renderizarChipsFiltrosActivos({
  filtros = {},
  contenedorChips = document.querySelector("#chips-filtros-activos"),
  onQuitarFiltro = null,
} = {}) {
  if (!contenedorChips) return;
  contenedorChips.replaceChildren();

  const chips = obtenerChipsFiltrosActivos(filtros);

  chips.forEach((chip) => {
    const chipSpan = document.createElement("span");
    chipSpan.className = "filter-chip";
    // La etiqueta puede incluir texto escrito por el usuario: se asigna como texto, no como HTML.
    const etiqueta = document.createElement("span");
    etiqueta.textContent = chip.label;
    const btnClose = document.createElement("button");
    btnClose.type = "button";
    btnClose.className = "btn-close-chip";
    btnClose.setAttribute("aria-label", `Quitar filtro ${chip.label}`);
    btnClose.textContent = "\u00d7";
    chipSpan.append(etiqueta, " ", btnClose);
    if (typeof onQuitarFiltro === "function") {
      btnClose.addEventListener("click", () => {
        onQuitarFiltro(chip.tipo);
      });
    }
    contenedorChips.append(chipSpan);
  });
}
