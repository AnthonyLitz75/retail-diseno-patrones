import { apiRequest } from '../api/api.js'

/**
 * Spec 005 (RF08): deshacer la última acción del carrito. El servidor guarda el historial
 * en la sesión (patrón Command) y valida la revisión del carrito.
 */

/**
 * Llama a POST /api/carrito/deshacer y devuelve el carrito restaurado.
 * @param {Function} [request=apiRequest]
 * @returns {Promise<Object>}
 */
export async function deshacerUltimaAccion(request = apiRequest) {
  const respuesta = await request('/api/carrito/deshacer', { method: 'POST' })
  if (respuesta && typeof respuesta.json === 'function') {
    return await respuesta.json()
  }
  return respuesta
}

/**
 * Traduce el error del servidor a un mensaje para el cliente.
 * 400: no hay acciones; 409: el carrito cambió o el producto ya no está disponible.
 * @param {{ status?: number, message?: string } | null} error
 * @returns {string}
 */
export function mensajeErrorDeshacer(error) {
  if (error?.status === 400) return 'No hay acciones para deshacer.'
  if (error?.status === 409) {
    return error.message || 'El carrito cambió en otra pestaña o dispositivo; se actualizó la vista.'
  }
  return 'No se pudo deshacer la acción.'
}

/**
 * Muestra un mensaje de éxito con un botón "Deshacer" en el estado del carrito.
 * @param {HTMLElement|null} contenedor
 * @param {string} mensaje
 * @param {Function} alDeshacer
 * @param {Document} [doc=document]
 */
export function pintarEstadoConDeshacer(contenedor, mensaje, alDeshacer, doc = globalThis.document) {
  if (!contenedor || !doc) return

  const texto = doc.createElement('span')
  texto.textContent = mensaje

  const boton = doc.createElement('button')
  boton.type = 'button'
  boton.className = 'btn btn-link btn-sm p-0 ms-2 align-baseline fw-semibold'
  boton.textContent = 'Deshacer'
  boton.setAttribute('aria-label', 'Deshacer la última acción del carrito')
  boton.addEventListener('click', () => alDeshacer())

  contenedor.className = 'alert alert-success py-2 small mb-2'
  contenedor.replaceChildren(texto, boton)
}
