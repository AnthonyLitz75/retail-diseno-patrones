/**
 * @file busqueda-pedido.js
 * Panel del personal (T08): formulario accesible «Buscar pedido», compartido por el Inicio de
 * Soporte (ids inicio-…) y la pantalla #/consulta-pedido (ids consulta-…). La validación es la
 * de soporte-logica.js; al enviar un número válido solo navega: quien consulta es el router.
 */

import { validarNumeroPedido, rutaConsultaPedido } from "./soporte-logica.js";

const idsDe = (prefijo) => ({
  formulario: `${prefijo}-form-busqueda`,
  campo: `${prefijo}-buscar-pedido`,
  error: `${prefijo}-error-busqueda`,
});

/** Marcado del formulario. `prefijo` da ids propios (inicio, consulta). */
export function renderizarBusquedaPedido(prefijo) {
  const ids = idsDe(prefijo);
  return `<form id="${ids.formulario}" class="panel-busqueda" novalidate>
      <label for="${ids.campo}" class="form-label">Buscar pedido</label>
      <div class="panel-busqueda-fila">
        <input id="${ids.campo}" class="form-control" type="text" inputmode="numeric" placeholder="Número, por ejemplo 3" autocomplete="off">
        <button class="panel-boton panel-boton-principal" type="submit">Buscar</button>
      </div>
      <p id="${ids.error}" class="panel-errores-formulario mb-0" role="alert"></p>
    </form>`;
}

/**
 * Conecta el formulario ya pintado dentro de `raiz`.
 * @param {HTMLElement} raiz
 * @param {string} prefijo
 * @param {(ruta: string) => void} navegar
 * @returns {{ campo: HTMLInputElement, limpiarError: () => void }}
 */
export function conectarBusquedaPedido(raiz, prefijo, navegar) {
  const ids = idsDe(prefijo);
  const formulario = raiz.querySelector(`#${ids.formulario}`);
  const campo = raiz.querySelector(`#${ids.campo}`);
  const error = raiz.querySelector(`#${ids.error}`);

  function limpiarError() {
    error.textContent = "";
    campo.removeAttribute("aria-invalid");
    campo.removeAttribute("aria-describedby");
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const resultado = validarNumeroPedido(campo.value);
    if (!resultado.valido) {
      error.textContent = resultado.mensaje;
      campo.setAttribute("aria-invalid", "true");
      campo.setAttribute("aria-describedby", ids.error);
      return;
    }
    limpiarError();
    navegar(rutaConsultaPedido(resultado.numero));
  });

  return { campo, limpiarError };
}
