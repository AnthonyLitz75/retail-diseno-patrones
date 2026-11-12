/**
 * Tablas apilables: en pantallas angostas cada fila se muestra como una tarjeta y
 * cada celda lleva delante el nombre de su columna (CSS `.tabla-apilable`, que lee
 * el atributo `data-etiqueta`). En escritorio la tabla se ve igual que antes.
 */

/**
 * Copia el nombre de cada columna en la celda correspondiente de la fila.
 * Las celdas sobrantes quedan sin etiqueta y las etiquetas vacías no se escriben.
 *
 * @param {HTMLTableRowElement} fila - Fila ya construida
 * @param {string[]} etiquetas - Nombres de columna en el mismo orden que las celdas
 */
export function etiquetarCeldas(fila, etiquetas) {
  const celdas = Array.from(fila.children);
  celdas.forEach((celda, indice) => {
    const etiqueta = etiquetas[indice];
    if (etiqueta) celda.dataset.etiqueta = etiqueta;
  });
}
