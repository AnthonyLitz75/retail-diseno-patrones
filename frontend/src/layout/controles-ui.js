/**
 * @file controles-ui.js
 * Manejador de interacciones de interfaz: menú flyout de categorías, carruseles horizontales, atajos de teclado y docks.
 */

import { generarSlug } from "../router/parser-rutas.js";
import { esFavorito } from "../catalogo/componentes/favoritos.js";
import { enlacesCategorias, pintarChipsCategorias } from "../catalogo/vistas/explorar.js";

/**
 * Configura los controles interactivos complementarios de la interfaz.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarControlesUI({
  apiRequest,
  estado,
  elementos = {},
  acciones = {},
}) {
  const {
    btnToggleCategoriasMenu,
    menuCategoriasDropdown,
    menuNotificaciones,
    btnNotificaciones,
    campoBusquedaPrincipal,
    vistaTienda,
    bloqueVitrinaInicio,
    bloqueCatalogoCompleto,
    vistaDetalleProducto,
    vista404,
    estadoCatalogo,
  } = elementos;

  const {
    mostrarProductos,
    mostrarToast,
    manejarRutaHash,
  } = acciones;

  async function cargarArbolCategorias() {
    if (!menuCategoriasDropdown) return;
    try {
      const respuesta = await apiRequest("/api/categorias/arbol");
      const categoriasArbol = await respuesta.json();
      estado.categoriasArbol = categoriasArbol;
      menuCategoriasDropdown.replaceChildren();

      categoriasArbol.forEach((cat) => {
        const li = document.createElement("li");
        li.className = "category-dropdown-item";

        const catSlug = generarSlug(cat.nombre);
        const a = document.createElement("a");
        a.className = "category-dropdown-link";
        a.href = `#/categoria/${catSlug}`;

        if (
          cat.compuesta &&
          Array.isArray(cat.subcategorias) &&
          cat.subcategorias.length > 0
        ) {
          const etiquetaCat = document.createElement("span");
          etiquetaCat.textContent = cat.nombre;
          const flecha = document.createElement("span");
          flecha.className = "arrow-flyout";
          flecha.setAttribute("aria-hidden", "true");
          flecha.textContent = "›";
          a.append(etiquetaCat, " ", flecha);
          a.addEventListener("click", () => {
            menuCategoriasDropdown.classList.remove("show");
            btnToggleCategoriasMenu?.setAttribute("aria-expanded", "false");
          });

          const subUl = document.createElement("ul");
          subUl.className = "category-submenu";
          cat.subcategorias.forEach((sub) => {
            const subLi = document.createElement("li");
            const subSlug = generarSlug(sub.nombre);
            const subA = document.createElement("a");
            subA.className = "category-dropdown-link";
            subA.href = `#/categoria/${catSlug}/${subSlug}`;
            subA.textContent = sub.nombre;
            subA.addEventListener("click", () => {
              menuCategoriasDropdown.classList.remove("show");
              btnToggleCategoriasMenu?.setAttribute("aria-expanded", "false");
            });
            subLi.append(subA);
            subUl.append(subLi);
          });
          li.append(a, subUl);
        } else {
          a.textContent = cat.nombre;
          a.addEventListener("click", () => {
            menuCategoriasDropdown.classList.remove("show");
            btnToggleCategoriasMenu?.setAttribute("aria-expanded", "false");
          });
          li.append(a);
        }

        menuCategoriasDropdown.append(li);
      });
      // Inicio: chips "Compra por categoría" con el mismo árbol del menú.
      pintarChipsCategorias(
        document.querySelector("#chips-categorias-inicio"),
        enlacesCategorias(categoriasArbol),
      );
    } catch (error) {
      console.warn("No se pudo cargar el árbol de categorías:", error);
    }
  }

  function desplazarHaciaOfertas(evento) {
    if (evento) evento.preventDefault();
    if (vistaTienda) vistaTienda.hidden = false;
    if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = false;
    if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = true;
    if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
    if (vista404) vista404.hidden = true;

    if (typeof window !== "undefined") {
      window.location.hash = "#seccion-ofertas";
      window.requestAnimationFrame(() => {
        if (typeof document !== "undefined") {
          document.querySelector("#seccion-ofertas")?.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  }

  // Menú de Categorías (Dropdown)
  if (btnToggleCategoriasMenu && menuCategoriasDropdown) {
    btnToggleCategoriasMenu.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menuNotificaciones) {
        menuNotificaciones.classList.remove("show");
      }
      if (btnNotificaciones) {
        btnNotificaciones.setAttribute("aria-expanded", "false");
      }
      const esVisible = menuCategoriasDropdown.classList.toggle("show");
      btnToggleCategoriasMenu.setAttribute("aria-expanded", String(esVisible));
    });

    if (typeof document !== "undefined") {
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".category-dropdown-wrapper")) {
          menuCategoriasDropdown.classList.remove("show");
          btnToggleCategoriasMenu.setAttribute("aria-expanded", "false");
        }
      });
    }
  }

  // Controles de Carruseles Horizontales
  function conectarCarrusel(btnPrevId, btnNextId, trackId, paso = 280) {
    if (typeof document === "undefined") return;
    const btnPrev = document.querySelector(btnPrevId);
    const btnNext = document.querySelector(btnNextId);
    const track = document.querySelector(trackId);

    if (btnPrev && track) {
      btnPrev.addEventListener("click", () => {
        track.scrollBy({ left: -paso, behavior: "smooth" });
      });
    }
    if (btnNext && track) {
      btnNext.addEventListener("click", () => {
        track.scrollBy({ left: paso, behavior: "smooth" });
      });
    }
  }

  conectarCarrusel("#btn-nuevos-prev", "#btn-nuevos-next", "#carrusel-nuevos-track");
  conectarCarrusel("#btn-ofertas-prev", "#btn-ofertas-next", "#carrusel-ofertas-track");

  // Docks Flotantes
  if (typeof document !== "undefined") {
    const dockBtnTop = document.querySelector("#dock-btn-top");
    if (dockBtnTop) {
      dockBtnTop.addEventListener("click", () => {
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    }

    const dockBtnFavoritos = document.querySelector("#dock-btn-favoritos");
    if (dockBtnFavoritos) {
      dockBtnFavoritos.addEventListener("click", () => {
        const productosFav = (estado.productosDisponibles || []).filter((p) => esFavorito(p.id));
        if (productosFav.length > 0) {
          if (typeof mostrarProductos === "function") {
            mostrarProductos(productosFav);
          }
          if (estadoCatalogo) {
            estadoCatalogo.textContent = `Mostrando ${productosFav.length} producto(s) en tus favoritos`;
          }
          document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
        } else {
          if (typeof mostrarToast === "function") {
            mostrarToast(
              "Aún no tienes productos guardados en favoritos. Haz clic en el corazón de cualquier tarjeta.",
              "info",
            );
          }
        }
      });
    }

    // Botones Hero y Promocionales
    const btnHeroOfertas = document.querySelector("#btn-hero-ofertas");
    if (btnHeroOfertas) {
      btnHeroOfertas.addEventListener("click", desplazarHaciaOfertas);
    }
    const btnPromoOfertas = document.querySelector("#btn-promo-ofertas");
    if (btnPromoOfertas) {
      btnPromoOfertas.addEventListener("click", desplazarHaciaOfertas);
    }

    const btnPromoComponentes = document.querySelector("#btn-promo-componentes");
    if (btnPromoComponentes) {
      btnPromoComponentes.addEventListener("click", (evento) => {
        if (typeof window !== "undefined" && window.location.hash === "#/categoria/componentes-para-pc") {
          evento.preventDefault();
          if (typeof manejarRutaHash === "function") manejarRutaHash();
        }
      });
    }
  }

  // Atajo de teclado accesible Ctrl+K
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", (evento) => {
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        if (campoBusquedaPrincipal) {
          campoBusquedaPrincipal.focus();
          campoBusquedaPrincipal.select();
        }
      }
    });
  }

  return {
    cargarArbolCategorias,
    desplazarHaciaOfertas,
  };
}
