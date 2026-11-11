/**
 * @file router.js
 * Enrutador SPA basado en Location Hash para Píxel Andino Tech Store.
 * Maneja rutas como #/, #/catalogo, #/categoria/:slug, #/producto/:sku, #/buscar?q=..., #/pedidos.
 */

import {
  parsearRuta,
  buscarCategoriaPorSlug,
  construirBreadcrumbs,
} from "./enrutador.js";
import { renderizarVistaDetalleProducto } from "../catalogo/detalle-producto.js";
import { resolverImagenProducto } from "../catalogo/imagen-producto.js";
import { esFavorito, alternarFavorito } from "../catalogo/favoritos.js";
import { esRutaProtegida, evaluarAcceso } from "./guardas.js";
import { rutaLoginConRetorno } from "../utilidades/errores-globales.js";

/**
 * Renderiza la lista de migas de pan (Breadcrumbs) en el contenedor del DOM.
 * @param {Array<Object>} crumbs
 * @param {Object} elementos
 */
export function renderizarBreadcrumbsEnDOM(
  crumbs,
  { contenedorBreadcrumbs, listaBreadcrumbs } = {},
) {
  if (!contenedorBreadcrumbs || !listaBreadcrumbs) return;

  if (!crumbs || crumbs.length <= 1) {
    contenedorBreadcrumbs.hidden = true;
    listaBreadcrumbs.replaceChildren();
    return;
  }

  listaBreadcrumbs.replaceChildren();
  crumbs.forEach((crumb) => {
    const li = document.createElement("li");
    const esActivo = Boolean(crumb.esActivo || crumb.activo);
    li.className = `breadcrumb-item ${esActivo ? "active" : ""}`;
    if (esActivo) {
      li.setAttribute("aria-current", "page");
      li.textContent = crumb.etiqueta;
    } else {
      const a = document.createElement("a");
      a.href = crumb.url;
      a.textContent = crumb.etiqueta;
      li.append(a);
    }
    listaBreadcrumbs.append(li);
  });
  contenedorBreadcrumbs.hidden = false;
}

/**
 * Configura el enrutador SPA por hash.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarEnrutadorSPA({
  estado,
  elementos = {},
  acciones = {},
}) {
  const {
    contenedorBreadcrumbs,
    listaBreadcrumbs,
    vistaTienda,
    bloqueVitrinaInicio,
    bloqueCatalogoCompleto,
    vistaDetalleProducto,
    vista404,
    filtroCategoria,
    campoBusqueda,
  } = elementos;

  const {
    cargarProductos,
    cargarArbolCategorias,
    sincronizarCategoriaDestacada,
    cambiarVista,
    agregarProductoAlCarrito,
    abrirModalPreguntas,
    mostrarToast,
    esperarSesion,
    redirigir = (ruta) => {
      if (typeof window !== "undefined") window.location.href = ruta;
    },
  } = acciones;

  function renderizarCrumbs(crumbs) {
    renderizarBreadcrumbsEnDOM(crumbs, {
      contenedorBreadcrumbs,
      listaBreadcrumbs,
    });
  }

  async function manejarRutaHash() {
    const hash =
      typeof window !== "undefined" && window.location.hash
        ? window.location.hash
        : "#/";
    const rutaInfo = parsearRuta(hash);

    // Guarda de cliente (spec 007, T003): en rutas protegidas se espera a conocer la sesión
    // para no mandar al login a alguien que sí la tiene y recién está cargando.
    if (esRutaProtegida(rutaInfo.tipo)) {
      if (typeof esperarSesion === "function") await esperarSesion();
      const acceso = evaluarAcceso(rutaInfo.tipo, estado.usuarioSesion?.rol ?? null);
      if (!acceso.permitido) {
        if (typeof mostrarToast === "function") mostrarToast(acceso.mensaje, "advertencia");
        if (acceso.destino === "login") {
          if (typeof redirigir === "function") redirigir(rutaLoginConRetorno(hash));
        } else if (typeof window !== "undefined") {
          window.location.hash = "#/";
        }
        return;
      }
    }

    if (vista404) vista404.hidden = true;
    if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;

    if (rutaInfo.tipo === "inicio") {
      if (vistaTienda) vistaTienda.hidden = false;
      if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = false;
      if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = true;
      if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
      if (filtroCategoria && filtroCategoria.value !== "") {
        filtroCategoria.value = "";
        if (typeof sincronizarCategoriaDestacada === "function")
          sincronizarCategoriaDestacada();
        if (typeof cargarProductos === "function") await cargarProductos();
      }
      return;
    }

    if (rutaInfo.tipo === "catalogo") {
      if (vistaTienda) vistaTienda.hidden = false;
      if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
      if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
      const crumbs = construirBreadcrumbs(rutaInfo, estado.categoriasArbol);
      renderizarCrumbs(crumbs);
      if (filtroCategoria && filtroCategoria.value !== "") {
        filtroCategoria.value = "";
        if (typeof sincronizarCategoriaDestacada === "function")
          sincronizarCategoriaDestacada();
        if (typeof cargarProductos === "function") await cargarProductos();
      }
      if (typeof document !== "undefined") {
        document
          .querySelector("#productos")
          ?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (rutaInfo.tipo === "categoria" || rutaInfo.tipo === "subcategoria") {
      const slug = rutaInfo.params.slug;
      let hallazgo = buscarCategoriaPorSlug(estado.categoriasArbol, slug);
      if (
        !hallazgo &&
        (!estado.categoriasArbol || estado.categoriasArbol.length === 0)
      ) {
        if (typeof cargarArbolCategorias === "function") {
          await cargarArbolCategorias();
        }
        hallazgo = buscarCategoriaPorSlug(estado.categoriasArbol, slug);
      }

      if (hallazgo && hallazgo.categoria) {
        if (vistaTienda) vistaTienda.hidden = false;
        if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
        if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
        const crumbs = construirBreadcrumbs(rutaInfo, estado.categoriasArbol);
        renderizarCrumbs(crumbs);
        if (filtroCategoria) {
          filtroCategoria.value = hallazgo.categoria.nombre;
          if (typeof sincronizarCategoriaDestacada === "function")
            sincronizarCategoriaDestacada();
          if (typeof cargarProductos === "function") await cargarProductos();
        }
        if (typeof document !== "undefined") {
          document
            .querySelector("#productos")
            ?.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        if (vistaTienda) vistaTienda.hidden = true;
        if (vista404) vista404.hidden = false;
        if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
      }
      return;
    }

    if (rutaInfo.tipo === "buscar") {
      if (vistaTienda) vistaTienda.hidden = false;
      if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
      if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
      const crumbs = construirBreadcrumbs(rutaInfo, estado.categoriasArbol);
      renderizarCrumbs(crumbs);
      const q = rutaInfo.query?.q || "";
      if (campoBusqueda) {
        campoBusqueda.value = q;
        if (typeof cargarProductos === "function") await cargarProductos();
      }
      if (typeof document !== "undefined") {
        document
          .querySelector("#productos")
          ?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    if (rutaInfo.tipo === "producto") {
      const skuParam = rutaInfo.params.sku;
      if (
        !estado.productosDisponibles ||
        estado.productosDisponibles.length === 0
      ) {
        if (typeof cargarProductos === "function") await cargarProductos();
      }

      const producto = (estado.productosDisponibles || []).find((p) => {
        const pSku = (
          p.sku || `PA-${String(p.id).padStart(4, "0")}`
        ).toUpperCase();
        return pSku === skuParam.toUpperCase() || String(p.id) === skuParam;
      });

      if (producto) {
        if (vistaTienda) vistaTienda.hidden = true;
        if (vista404) vista404.hidden = true;

        const crumbs = construirBreadcrumbs(
          rutaInfo,
          estado.categoriasArbol,
          producto,
        );
        renderizarCrumbs(crumbs);

        if (vistaDetalleProducto) {
          vistaDetalleProducto.replaceChildren();
          const detalleDOM = renderizarVistaDetalleProducto(producto, {
            imagenUrl: resolverImagenProducto(producto),
            esFavorito: esFavorito(producto.id),
            onAgregarAlCarrito: (cantidad) => {
              if (typeof agregarProductoAlCarrito === "function") {
                agregarProductoAlCarrito(producto.id, producto, cantidad);
              }
            },
            onAbrirPreguntas: () => {
              if (typeof abrirModalPreguntas === "function") {
                abrirModalPreguntas(producto);
              }
            },
            onAlternarFavorito: () => {
              const res = alternarFavorito(producto.id);
              if (typeof mostrarToast === "function") {
                mostrarToast(
                  res.activo
                    ? `¡Añadido a favoritos! ${producto.nombre}`
                    : "Removido de favoritos",
                  res.activo ? "exito" : "info",
                );
              }
            },
          });
          vistaDetalleProducto.append(detalleDOM);
          vistaDetalleProducto.hidden = false;
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }
      } else {
        if (vistaTienda) vistaTienda.hidden = true;
        if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
        if (vista404) vista404.hidden = false;
        if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
      }
      return;
    }

    if (rutaInfo.tipo === "pedidos") {
      if (vistaTienda) vistaTienda.hidden = true;
      if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
      if (vista404) vista404.hidden = true;
      if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
      if (typeof cambiarVista === "function") {
        cambiarVista("pedidos");
      }
      if (typeof document !== "undefined") {
        document
          .querySelector("#seccion-pedidos")
          ?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // Secciones o anclas (#seccion-... o #productos)
    if (hash.startsWith("#seccion-") || hash === "#productos") {
      if (vistaTienda) vistaTienda.hidden = false;
      if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
      if (vista404) vista404.hidden = true;
      if (hash === "#productos") {
        if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
        if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
      } else {
        if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = false;
        if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = true;
      }
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        window.requestAnimationFrame(() => {
          document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
        });
      }
      return;
    }

    // Ruta desconocida (404)
    if (vistaTienda) vistaTienda.hidden = true;
    if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
    if (vista404) vista404.hidden = false;
    if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
  }

  // Escuchar cambios de hash en la ventana
  if (typeof window !== "undefined") {
    window.addEventListener("hashchange", () => {
      void manejarRutaHash();
    });
  }

  // Enlaces rápidos por categoría en la barra de navegación y banners promocionales
  if (typeof document !== "undefined") {
    document.querySelectorAll("[data-categoria-link]").forEach((enlace) => {
      enlace.addEventListener("click", (e) => {
        const href = enlace.getAttribute("href");
        if (
          href &&
          href.startsWith("#") &&
          typeof window !== "undefined" &&
          window.location.hash === href
        ) {
          e.preventDefault();
          void manejarRutaHash();
        }
      });
    });
  }

  return {
    manejarRutaHash,
  };
}
