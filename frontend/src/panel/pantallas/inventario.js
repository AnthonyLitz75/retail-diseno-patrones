/**
 * @file inventario.js
 * Panel del personal (T06c): #/inventario monta el módulo de inventario y kardex existente
 * (configurarPanelInventario) sobre el mismo HTML que la tienda (vistas-personal.js). En lugar
 * de recargar el catálogo de la tienda tras una entrada, usa una carga propia de productos.
 */

import { renderizarVistaInventario } from "../../layout/vistas-personal.js";
import { configurarPanelInventario } from "../../inventario/inventario-vista.js";

/** Ids que el módulo necesita, en el orden de sus `elementos` (los mismos que en main.js). */
const ELEMENTOS = Object.freeze({
  seccionInventario: "seccion-inventario",
  seccionEntradaInventario: "seccion-entrada-inventario",
  formularioEntradaInventario: "form-entrada-inventario",
  selectorProductoEntrada: "producto-entrada",
  cantidadEntrada: "cantidad-entrada",
  motivoEntrada: "motivo-entrada",
  estadoEntradaInventario: "estado-entrada-inventario",
  formularioFiltrosMovimientos: "filtros-movimientos",
  selectorProductoMovimientos: "filtro-producto-movimientos",
  movimientosDesde: "movimientos-desde",
  movimientosHasta: "movimientos-hasta",
  estadoMovimientos: "estado-movimientos",
  listaMovimientos: "lista-movimientos",
  paginacionMovimientos: "paginacion-movimientos",
});

export const IDS_INVENTARIO = Object.freeze(Object.values(ELEMENTOS));

/**
 * Carga propia de productos del panel: deja GET /api/productos en el estado compartido. Si
 * falla, lo vacía para que el módulo vuelva a pedirlos la próxima vez.
 */
export function crearCargaProductos({ apiRequest, estado }) {
  return async () => {
    try {
      const respuesta = await apiRequest("/api/productos");
      estado.productosInventario = await respuesta.json();
    } catch {
      estado.productosInventario = [];
    }
  };
}

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function, estado: object, mostrarToast: Function } }} contexto
 */
export function montar(contenedor, { servicios }) {
  const { apiRequest, estado, mostrarToast } = servicios;
  contenedor.innerHTML = renderizarVistaInventario();
  contenedor.querySelector("#vista-inventario").hidden = false;
  const elementos = Object.fromEntries(
    Object.entries(ELEMENTOS).map(([clave, id]) => [clave, contenedor.querySelector(`#${id}`)]),
  );

  const controlador = configurarPanelInventario({
    apiRequest,
    obtenerEstado: () => estado,
    mostrarToast,
    cargarProductosCatalogo: crearCargaProductos({ apiRequest, estado }),
    elementos,
  });

  return { alMostrar: () => controlador.iniciarPanelInventario() };
}
