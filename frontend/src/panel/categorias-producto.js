/**
 * @file categorias-producto.js
 * Panel del personal (tanda 1, F1): llena el selector «Categoría» del formulario de producto
 * nuevo. En la tienda lo hacía cargarCategorias() del catálogo, que es un cierre que depende
 * de la vista de tienda y no se puede reutilizar aquí; este cargador pequeño rellena el mismo
 * select (mismo id) con el mismo formato de opciones: «Selecciona una categoría» y una opción
 * por categoría con value = nombre.
 */

import { opcionesCategoriasAsignables } from "../catalogo/gestion/gestion-producto.js";

export const ID_SELECTOR_CATEGORIA = "categoria-producto";
export const TEXTO_OPCION_POR_DEFECTO = "Selecciona una categoría";
export const MENSAJE_ERROR_CATEGORIAS = "No se pudieron cargar las categorías. Reintenta al volver a abrir Productos.";

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
    const opciones = opcionesCategoriasAsignables(await respuesta.json());
    selector.replaceChildren(crearOpcion(TEXTO_OPCION_POR_DEFECTO, ""));
    for (const op of opciones) selector.append(crearOpcion(op.etiqueta, op.valor));
    // Se conserva la categoría ya elegida si sigue existiendo (si no, queda «Selecciona…»).
    selector.value = elegida;
  } catch {
    selector.replaceChildren(crearOpcion(TEXTO_OPCION_POR_DEFECTO, ""));
    mostrarToast?.(MENSAJE_ERROR_CATEGORIAS, "error");
  }
}
