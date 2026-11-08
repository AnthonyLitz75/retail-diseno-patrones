/**
 * @file catalogo-controlador.js
 * Orquestador principal del catálogo de productos, filtros avanzados, paginación y vitrinas.
 */

import {
  aplicarFiltrosYOrden,
  CRITERIOS_ORDEN,
  paginarProductos,
  PRODUCTOS_POR_PAGINA,
} from "./filtros-catalogo.js";
import {
  poblarVitrinaInicio as poblarVitrinaInicioVista,
  mostrarProductos,
  renderizarPaginacion,
  renderizarChipsFiltrosActivos as renderizarChipsFiltrosActivosVista,
} from "./catalogo-vista.js";
import { generarSkeletonCards } from "./skeleton-loader.js";

/**
 * Configura los flujos y eventos del catálogo.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarControladorCatalogo({
  apiRequest,
  estado,
  elementos = {},
  acciones = {},
}) {
  const {
    contenedor,
    estadoCatalogo,
    contenedorPaginacion,
    listaPaginacion,
    gridDestacados,
    gridComponentes,
    campoBusqueda,
    campoBusquedaPrincipal,
    formularioBusquedaRapida,
    filtroCategoria,
    precioMinimo,
    precioMaximo,
    selectorOrden,
    switchSoloStock,
    botonLimpiarFiltros,
    formulario,
    categoriaProducto,
    resultadoFormulario,
  } = elementos;

  const {
    obtenerCallbacksTarjeta,
    mostrarToast,
  } = acciones;

  let temporizadorBusqueda;
  let solicitudCatalogo = 0;

  function sincronizarCategoriaDestacada() {
    if (typeof document === "undefined") return;
    document.querySelectorAll(".category-pill").forEach((boton) => {
      const activo = boton.dataset.category === (filtroCategoria ? filtroCategoria.value : "");
      boton.classList.toggle("is-active", activo);
      boton.setAttribute("aria-pressed", String(activo));
    });
  }

  function mostrarCategoriasDestacadas(categorias) {
    if (typeof document === "undefined") return;
    const contenedorPastillas = document.querySelector("#categorias-destacadas");
    if (!contenedorPastillas) return;
    contenedorPastillas.replaceChildren();

    const crearBoton = (nombre, valor) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "category-pill";
      const icono = document.createElement("span");
      icono.className = "category-icon";
      icono.setAttribute("aria-hidden", "true");
      icono.innerHTML = !valor
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`
        : valor.toLowerCase().includes("perif")
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8"></path></svg>`
          : valor.toLowerCase().includes("acces")
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
      const etiqueta = document.createElement("span");
      etiqueta.textContent = nombre;
      boton.append(icono, etiqueta);

      boton.dataset.category = valor;
      const activo = (filtroCategoria ? filtroCategoria.value : "") === valor;
      boton.classList.toggle("is-active", activo);
      boton.setAttribute("aria-pressed", String(activo));

      boton.addEventListener("click", () => {
        if (filtroCategoria) filtroCategoria.value = valor;
        contenedorPastillas.querySelectorAll(".category-pill").forEach((elemento) => {
          const seleccionado = elemento === boton;
          elemento.classList.toggle("is-active", seleccionado);
          elemento.setAttribute("aria-pressed", String(seleccionado));
        });
        void cargarProductos();
      });
      return boton;
    };

    contenedorPastillas.append(crearBoton("Todas", ""));
    const categoriasPrincipales = (categorias || []).filter((c) => !c.categoriaPadreId);
    const listaMostrar = categoriasPrincipales.length > 0 ? categoriasPrincipales : categorias;
    for (const categoria of listaMostrar) {
      contenedorPastillas.append(crearBoton(categoria.nombre, categoria.nombre));
    }
  }

  function quitarFiltro(tipo) {
    switch (tipo) {
      case "busqueda":
        if (campoBusquedaPrincipal) campoBusquedaPrincipal.value = "";
        if (campoBusqueda) campoBusqueda.value = "";
        void cargarProductos();
        break;
      case "categoria":
        if (filtroCategoria) filtroCategoria.value = "";
        sincronizarCategoriaDestacada();
        void cargarProductos();
        break;
      case "precioMin":
        if (precioMinimo) precioMinimo.value = "";
        void cargarProductos();
        break;
      case "precioMax":
        if (precioMaximo) precioMaximo.value = "";
        void cargarProductos();
        break;
      case "soloEnStock":
        if (switchSoloStock) switchSoloStock.checked = false;
        actualizarVistaCatalogo();
        break;
    }
  }

  function renderizarChipsFiltrosActivos() {
    if (typeof document === "undefined") return;
    renderizarChipsFiltrosActivosVista({
      filtros: {
        busqueda: campoBusquedaPrincipal ? campoBusquedaPrincipal.value : "",
        categoria: filtroCategoria ? filtroCategoria.value : "",
        precioMin: precioMinimo ? precioMinimo.value : "",
        precioMax: precioMaximo ? precioMaximo.value : "",
        soloEnStock: switchSoloStock ? switchSoloStock.checked : false,
      },
      contenedorChips: document.querySelector("#chips-filtros-activos"),
      onQuitarFiltro: quitarFiltro,
    });
  }

  function cambiarPaginaCatalogo(nuevaPagina) {
    estado.paginaActualCatalogo = nuevaPagina;
    actualizarVistaCatalogo();
    if (typeof document !== "undefined") {
      document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function reiniciarFiltrosCatalogo() {
    estado.paginaActualCatalogo = 1;
    if (campoBusqueda) campoBusqueda.value = "";
    if (campoBusquedaPrincipal) campoBusquedaPrincipal.value = "";
    if (filtroCategoria) filtroCategoria.value = "";
    sincronizarCategoriaDestacada();
    if (precioMinimo) precioMinimo.value = "";
    if (precioMaximo) precioMaximo.value = "";
    if (selectorOrden) selectorOrden.value = CRITERIOS_ORDEN.DEFECTO;
    if (switchSoloStock) switchSoloStock.checked = false;
    void cargarProductos();
  }

  function poblarVitrinaInicio(productos) {
    if (typeof document === "undefined") return;
    poblarVitrinaInicioVista(productos, {
      gridDestacados,
      trackNuevos: document.querySelector("#carrusel-nuevos-track"),
      trackOfertas: document.querySelector("#carrusel-ofertas-track"),
      gridComponentes,
      usuarioSesion: estado.usuarioSesion,
      callbacks: typeof obtenerCallbacksTarjeta === "function" ? obtenerCallbacksTarjeta() : {},
    });
  }

  function actualizarVistaCatalogo({ resetearPagina = false } = {}) {
    if (resetearPagina) {
      estado.paginaActualCatalogo = 1;
    }
    renderizarChipsFiltrosActivos();
    const criterioOrden = selectorOrden ? selectorOrden.value : CRITERIOS_ORDEN.DEFECTO;
    const soloEnStock = switchSoloStock ? switchSoloStock.checked : false;

    const productosFiltrados = aplicarFiltrosYOrden(estado.productosDisponibles, {
      criterioOrden,
      soloEnStock,
    });

    const resultadoPaginacion = paginarProductos(
      productosFiltrados,
      estado.paginaActualCatalogo,
      PRODUCTOS_POR_PAGINA,
    );
    estado.paginaActualCatalogo = resultadoPaginacion.paginaActual;

    mostrarProductos(resultadoPaginacion.items, resultadoPaginacion, {
      contenedor,
      estadoCatalogo,
      contenedorPaginacion,
      onResetFiltros: reiniciarFiltrosCatalogo,
      usuarioSesion: estado.usuarioSesion,
      callbacks: typeof obtenerCallbacksTarjeta === "function" ? obtenerCallbacksTarjeta() : {},
    });

    renderizarPaginacion(resultadoPaginacion, {
      contenedorPaginacion,
      listaPaginacion,
      onCambiarPagina: cambiarPaginaCatalogo,
    });
  }

  async function cargarCategorias() {
    const respuesta = await apiRequest("/api/categorias");
    const categorias = await respuesta.json();
    mostrarCategoriasDestacadas(categorias);

    if (filtroCategoria) {
      filtroCategoria.replaceChildren(new Option("Todas las categorías", ""));
    }
    if (categoriaProducto) {
      categoriaProducto.replaceChildren(new Option("Selecciona una categoría", ""));
    }

    for (const categoria of categorias) {
      if (filtroCategoria) {
        const opcionFiltro = document.createElement("option");
        opcionFiltro.value = categoria.nombre;
        opcionFiltro.textContent = categoria.nombre;
        filtroCategoria.append(opcionFiltro);
      }

      if (categoriaProducto) {
        const opcionProducto = document.createElement("option");
        opcionProducto.value = categoria.nombre;
        opcionProducto.textContent = categoria.nombre;
        categoriaProducto.append(opcionProducto);
      }
    }
  }

  async function cargarProductos() {
    const solicitudActual = ++solicitudCatalogo;
    const min = (!precioMinimo || precioMinimo.value === "") ? null : Number(precioMinimo.value);
    const max = (!precioMaximo || precioMaximo.value === "") ? null : Number(precioMaximo.value);

    if (min !== null && max !== null && min > max) {
      if (estadoCatalogo) {
        estadoCatalogo.className = "text-danger";
        estadoCatalogo.textContent = "El precio mínimo no puede superar al precio máximo.";
      }
      if (contenedor) contenedor.replaceChildren();
      return;
    }

    const parametros = new URLSearchParams();
    if (campoBusqueda && campoBusqueda.value.trim()) {
      parametros.set("nombre", campoBusqueda.value.trim());
    }
    if (filtroCategoria && filtroCategoria.value) {
      parametros.set("categoria", filtroCategoria.value);
    }
    if (min !== null) parametros.set("precioMin", String(min));
    if (max !== null) parametros.set("precioMax", String(max));

    const consulta = parametros.size > 0 ? `?${parametros.toString()}` : "";
    if (estadoCatalogo) {
      estadoCatalogo.className = "text-secondary catalog-status";
      estadoCatalogo.textContent = "Actualizando catálogo…";
    }

    if (contenedor) {
      contenedor.setAttribute("aria-busy", "true");
      contenedor.innerHTML = generarSkeletonCards(8);
    }

    if (typeof document !== "undefined") {
      const trackNuevos = document.querySelector("#carrusel-nuevos-track");
      const trackOfertas = document.querySelector("#carrusel-ofertas-track");
      if (gridDestacados && gridDestacados.children.length === 0) {
        gridDestacados.innerHTML = generarSkeletonCards(4);
      }
      if (trackNuevos && trackNuevos.children.length === 0) {
        trackNuevos.innerHTML = generarSkeletonCards(4);
      }
      if (trackOfertas && trackOfertas.children.length === 0) {
        trackOfertas.innerHTML = generarSkeletonCards(4);
      }
      if (gridComponentes && gridComponentes.children.length === 0) {
        gridComponentes.innerHTML = generarSkeletonCards(4);
      }
    }

    try {
      const respuesta = await apiRequest(`/api/productos${consulta}`);
      const productos = await respuesta.json();
      if (solicitudActual !== solicitudCatalogo) return;

      estado.productosDisponibles = productos;
      actualizarVistaCatalogo({ resetearPagina: true });
      poblarVitrinaInicio(productos);
    } catch {
      if (solicitudActual !== solicitudCatalogo) return;
      if (contenedor) contenedor.removeAttribute("aria-busy");
      if (estadoCatalogo) {
        estadoCatalogo.className = "alert alert-danger my-3 py-2 px-3 small";
        estadoCatalogo.innerHTML = `
          <div class="d-flex align-items-center justify-content-between gap-2">
            <span>No se pudo conectar con el catálogo. Comprueba que el backend de Spring Boot esté activo en el puerto 8081.</span>
            <button id="btn-reintentar-catalogo" class="btn btn-sm btn-outline-danger" type="button">Reintentar</button>
          </div>
        `;
        if (typeof document !== "undefined") {
          document
            .querySelector("#btn-reintentar-catalogo")
            ?.addEventListener("click", () => cargarProductos());
        }
      }
    }
  }

  async function cargarPreguntasCliente() {
    if (estado.usuarioSesion?.rol !== "CLIENTE") {
      estado.preguntasCliente = [];
      return;
    }
    try {
      const respuesta = await apiRequest("/api/preguntas/mis-preguntas");
      estado.preguntasCliente = await respuesta.json();
      actualizarVistaCatalogo();
    } catch {
      estado.preguntasCliente = [];
    }
  }

  // Escuchadores de eventos de búsqueda y filtros
  if (campoBusquedaPrincipal) {
    campoBusquedaPrincipal.addEventListener("input", () => {
      if (campoBusqueda) campoBusqueda.value = campoBusquedaPrincipal.value;
      if (typeof window !== "undefined") {
        window.clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = window.setTimeout(cargarProductos, 180);
      }
    });
  }

  if (formularioBusquedaRapida) {
    formularioBusquedaRapida.addEventListener("submit", (evento) => {
      evento.preventDefault();
      const valor = campoBusquedaPrincipal ? campoBusquedaPrincipal.value.trim() : "";
      if (typeof window !== "undefined") {
        if (valor) {
          window.location.hash = `#/buscar?q=${encodeURIComponent(valor)}`;
        } else {
          window.location.hash = "#/catalogo";
        }
      }
    });
  }

  if (campoBusqueda) {
    campoBusqueda.addEventListener("input", () => {
      if (campoBusquedaPrincipal) campoBusquedaPrincipal.value = campoBusqueda.value;
      if (typeof window !== "undefined") {
        window.clearTimeout(temporizadorBusqueda);
        temporizadorBusqueda = window.setTimeout(cargarProductos, 180);
      }
    });
  }

  for (const filtro of [filtroCategoria, precioMinimo, precioMaximo]) {
    if (filtro) {
      filtro.addEventListener("change", cargarProductos);
    }
  }

  if (filtroCategoria) {
    filtroCategoria.addEventListener("change", sincronizarCategoriaDestacada);
  }

  if (selectorOrden) {
    selectorOrden.addEventListener("change", () =>
      actualizarVistaCatalogo({ resetearPagina: true }),
    );
  }

  if (switchSoloStock) {
    switchSoloStock.addEventListener("change", () =>
      actualizarVistaCatalogo({ resetearPagina: true }),
    );
  }

  if (botonLimpiarFiltros) {
    botonLimpiarFiltros.addEventListener("click", reiniciarFiltrosCatalogo);
  }

  // Formulario de agregar producto para staff/admin
  if (formulario) {
    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();

      const boton = formulario.querySelector('button[type="submit"]');
      if (boton) boton.disabled = true;

      if (resultadoFormulario) {
        resultadoFormulario.className = "mt-3 mb-0 text-secondary";
        resultadoFormulario.textContent = "Guardando producto...";
      }

      const inputNombre = document.querySelector("#nombre-producto");
      const inputPrecio = document.querySelector("#precio-producto");
      const inputStock = document.querySelector("#stock-producto");

      const nuevoProducto = {
        nombre: inputNombre ? inputNombre.value.trim() : "",
        categoria: categoriaProducto ? categoriaProducto.value : "",
        precio: inputPrecio ? Number(inputPrecio.value) : 0,
        stock: inputStock ? Number(inputStock.value) : 0,
      };

      try {
        await apiRequest("/api/productos", {
          method: "POST",
          json: nuevoProducto,
        });

        if (resultadoFormulario) {
          resultadoFormulario.className = "mt-3 mb-0 text-success";
          resultadoFormulario.textContent = "Producto agregado correctamente.";
        }
        if (typeof mostrarToast === "function") {
          mostrarToast(`Producto "${nuevoProducto.nombre}" agregado al catálogo.`, "exito");
        }

        formulario.reset();
        if (campoBusqueda) campoBusqueda.value = "";
        await cargarProductos();
      } catch (error) {
        if (resultadoFormulario) {
          resultadoFormulario.className = "mt-3 mb-0 text-danger";
          resultadoFormulario.textContent = `No se pudo agregar el producto. ${error.message}`;
        }
        if (typeof mostrarToast === "function") {
          mostrarToast(`No se pudo agregar el producto: ${error.message}`, "error");
        }
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  return {
    cargarProductos,
    cargarCategorias,
    actualizarVistaCatalogo,
    cambiarPaginaCatalogo,
    reiniciarFiltrosCatalogo,
    sincronizarCategoriaDestacada,
    poblarVitrinaInicio,
    cargarPreguntasCliente,
  };
}
