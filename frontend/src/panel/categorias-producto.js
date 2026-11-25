/**
 * @file categorias-producto.js
 * Panel del personal (tanda 1, F1): llena el selector «Categoría» del formulario de producto
 * nuevo. En la tienda lo hacía cargarCategorias() del catálogo, que es un cierre que depende
 * de la vista de tienda y no se puede reutilizar aquí; este cargador pequeño rellena el mismo
 * select (mismo id) con el mismo formato de opciones: «Selecciona una categoría» y una opción
 * por categoría con value = nombre.
 */

export const ID_SELECTOR_CATEGORIA = "categoria-producto";
export const TEXTO_OPCION_POR_DEFECTO = "Selecciona una categoría";
export const MENSAJE_ERROR_CATEGORIAS = "No se pudieron cargar las categorías. Reintenta al volver a abrir Productos.";

/**
 * Recarga las opciones del selector con GET /api/categorias. Se llama en cada alMostrar de
 * #/productos para que salgan las categorías que el ADMIN acabe de crear. Si la carga falla,
 * avisa con un toast y deja el selector solo con su opción por defecto.
 *
 * @param {object} opciones
 * @param {Function} opciones.apiRequest
 * @param {{ value: string, replaceChildren: Function, append: Function } | null} opciones.selector
 * @param {(mensaje: string, tipo?: string) => void} [opciones.mostrarToast]
 * @param {(texto: string, valor: string) => unknown} [opciones.crearOpcion] por defecto `new Option`
 */
export async function cargarCategoriasProducto({
  apiRequest,
  selector,
  mostrarToast,
  crearOpcion = (texto, valor) => new Option(texto, valor),
}) {
  if (!selector) return;
  const elegida = selector.value;
  try {
    const respuesta = await apiRequest("/api/categorias");
    const categorias = await respuesta.json();
    selector.replaceChildren(crearOpcion(TEXTO_OPCION_POR_DEFECTO, ""));
    for (const categoria of categorias) selector.append(crearOpcion(categoria.nombre, categoria.nombre));
    // Se conserva la categoría ya elegida si sigue existiendo (si no, queda «Selecciona…»).
    selector.value = elegida;
  } catch {
    selector.replaceChildren(crearOpcion(TEXTO_OPCION_POR_DEFECTO, ""));
    mostrarToast?.(MENSAJE_ERROR_CATEGORIAS, "error");
  }
}
