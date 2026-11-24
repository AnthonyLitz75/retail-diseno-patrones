/**
 * @file cambios-productos.js
 * Panel del personal (T07): aviso de que los productos cambiaron (stock, precio, ficha,
 * estado o alta). Los modales de producto se configuran una sola vez en el panel; quien
 * muestra productos (Inicio del Vendedor, pantalla Productos) se suscribe y recarga.
 */

/**
 * @returns {{ suscribir: (fn: (origen: string) => void) => () => void, avisar: (origen: string) => void }}
 */
export function crearAvisoCambios() {
  const suscriptores = new Set();
  return {
    suscribir(fn) {
      suscriptores.add(fn);
      return () => suscriptores.delete(fn);
    },
    avisar(origen) {
      for (const fn of suscriptores) {
        try {
          fn(origen);
        } catch {
          // Un suscriptor con fallas no debe impedir que los demás se enteren.
        }
      }
    },
  };
}
