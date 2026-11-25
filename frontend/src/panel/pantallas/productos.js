/**
 * @file productos.js
 * Panel del personal (T07): #/productos monta el panel de productos existente
 * (crearPanelProductos) y el formulario de producto nuevo (configurarFormularioProducto,
 * decisión P6) sobre el mismo HTML que la tienda (vistas-personal.js). Los callbacks que en la
 * tienda recargaban el catálogo se sustituyen por recargas del panel y el aviso de cambios.
 * Con #/productos?nuevo=1 abre el formulario y reescribe el hash a #/productos (sin historial).
 */

import { renderizarVistaProductos } from "../../layout/vistas-personal.js";
import { crearPanelProductos } from "../../catalogo/gestion/panel-productos.js";
import { configurarFormularioProducto } from "../../catalogo/gestion/formulario-producto.js";
import { mostrarConfirmacion } from "../../utilidades/notificaciones.js";
import { cargarCategoriasProducto, ID_SELECTOR_CATEGORIA } from "../categorias-producto.js";
import { encabezadoPantalla } from "./titulo-pantalla.js";

export const RUTA_PRODUCTOS = "#/productos";

/** Ids que usan el panel de productos y el formulario de producto nuevo. */
export const IDS_PRODUCTOS = Object.freeze([
  "seccion-gestion-productos",
  "boton-nuevo-producto",
  "panel-nuevo-producto",
  "form-producto",
  "resultado-formulario",
]);

/** ¿La ruta pide abrir el formulario de producto nuevo? */
export function pideNuevoProducto(parametros) {
  return parametros?.nuevo === "1";
}

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: object }} contexto
 */
export function montar(contenedor, { entrada, servicios }) {
  const { apiRequest, estado, mostrarToast, cambiarVista, modalesProducto = {}, cambiosProductos, reemplazarRuta } = servicios;
  contenedor.innerHTML = `${encabezadoPantalla(entrada)}${renderizarVistaProductos()}`;
  contenedor.querySelector("#vista-productos").hidden = false;

  const panelProductos = crearPanelProductos({
    apiRequest,
    obtenerUsuario: () => estado.usuarioSesion,
    obtenerCallbacks: () => ({
      // En la tienda: cambiar a la vista de inventario. En el panel: su ruta.
      onCargarMovimientos: () => cambiarVista("inventario"),
      onAbrirModalStock: (producto) => modalesProducto.abrirModalStock?.(producto),
      onAbrirModalPrecio: (producto) => modalesProducto.abrirModalPrecio?.(producto),
      onAbrirModalEditar: (producto) => modalesProducto.abrirModalEditarProducto?.(producto),
    }),
    confirmar: (opciones) => mostrarConfirmacion(opciones),
    mostrarToast,
    // El panel ya se recargó solo; se avisa al resto (por ejemplo, el Inicio).
    alCambiarEstado: () => cambiosProductos?.avisar("productos"),
  });
  contenedor.querySelector("#seccion-gestion-productos .card-body").append(panelProductos.element);

  configurarFormularioProducto({
    formulario: contenedor.querySelector("#form-producto"),
    resultado: contenedor.querySelector("#resultado-formulario"),
    apiRequest,
    alCrear: async (producto) => {
      mostrarToast?.(`Producto "${producto.nombre}" publicado en el catálogo.`, "exito");
      await panelProductos.cargar();
      cambiosProductos?.avisar("productos");
    },
  });

  // Tras guardar en un modal (stock, precio o ficha), se recarga la tabla si está a la vista.
  cambiosProductos?.suscribir((origen) => {
    if (origen === "modal" && !contenedor.hidden) void panelProductos.cargar();
  });

  /** Abre el formulario con su propio botón (el módulo no expone otra forma de abrirlo). */
  function abrirFormularioNuevo() {
    const panelNuevo = contenedor.querySelector("#panel-nuevo-producto");
    if (panelNuevo?.hidden) contenedor.querySelector("#boton-nuevo-producto")?.click();
  }

  return {
    async alMostrar(parametros) {
      if (pideNuevoProducto(parametros)) {
        abrirFormularioNuevo();
        // Reemplaza el hash para que recargar la página no vuelva a abrir el formulario.
        reemplazarRuta?.(RUTA_PRODUCTOS);
      }
      // F1: el selector «Categoría» del formulario se rellena en cada visita (salen las categorías
      // que el ADMIN acabe de crear). Si falla, avisa y el selector queda con su opción por defecto.
      await Promise.all([
        panelProductos.cargar(),
        cargarCategoriasProducto({
          apiRequest,
          selector: contenedor.querySelector(`#${ID_SELECTOR_CATEGORIA}`),
          mostrarToast,
        }),
      ]);
    },
  };
}
