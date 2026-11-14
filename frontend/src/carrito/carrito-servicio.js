/**
 * @file carrito-servicio.js
 * Módulo de servicio para operaciones de red del carrito y checkout de Píxel Andino.
 * Encapsula las llamadas a la API REST de persistencia del carrito y confirmación de pedidos.
 */

/**
 * Obtiene el carrito activo del usuario autenticado desde el backend.
 * @param {Function} apiRequest
 * @returns {Promise<Response>}
 */
export async function obtenerCarritoServicio(apiRequest) {
  return apiRequest('/api/carrito')
}

/**
 * Agrega un producto al carrito del usuario en el servidor.
 * @param {Function} apiRequest
 * @param {number} productoId
 * @param {number} cantidad
 * @returns {Promise<Response>}
 */
export async function agregarProductoServicio(apiRequest, productoId, cantidad = 1) {
  return apiRequest('/api/carrito/productos', {
    method: 'POST',
    json: { productoId, cantidad }
  })
}

/**
 * Actualiza la cantidad de un ítem en el carrito del servidor.
 * @param {Function} apiRequest
 * @param {number} productoId
 * @param {number} cantidad
 * @returns {Promise<Response>}
 */
export async function actualizarCantidadServicio(apiRequest, productoId, cantidad) {
  return apiRequest('/api/carrito/productos/' + productoId, {
    method: 'PUT',
    json: { cantidad }
  })
}

/**
 * Elimina un producto del carrito en el servidor.
 * @param {Function} apiRequest
 * @param {number} productoId
 * @returns {Promise<Response>}
 */
export async function quitarProductoServicio(apiRequest, productoId) {
  return apiRequest('/api/carrito/productos/' + productoId, {
    method: 'DELETE'
  })
}

/**
 * Envía la confirmación del pedido y pago al backend.
 * @param {Function} apiRequest
 * @param {object} payload
 * @returns {Promise<Response>}
 */
export async function confirmarPedidoServicio(apiRequest, payload) {
  return apiRequest('/api/pedidos/confirmar', {
    method: 'POST',
    json: payload
  })
}
