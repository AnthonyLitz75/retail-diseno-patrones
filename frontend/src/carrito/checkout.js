/**
 * @file checkout.js
 * Reglas del checkout en tres pasos (boceto "Confirmar compra" y "Compra confirmada"):
 * Carrito → Entrega y pago → Confirmación. Aquí solo hay funciones puras; el DOM lo maneja
 * carrito.js. El total y los productos los decide el backend (CheckoutFacade): el navegador
 * solo envía el escenario de pago de prueba, la clave de idempotencia y los datos de entrega.
 */

import { formatoPrecio } from '../utilidades/formato.js'

export const PASOS_CHECKOUT = Object.freeze(['carrito', 'entrega', 'confirmacion'])
export const METODOS_PAGO = Object.freeze(['PRUEBA_APROBADA', 'PRUEBA_RECHAZADA'])

function nuevaClave() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null
}

export function construirPayloadConfirmacion({
  claveConfirmacion = null,
  destinatario = '',
  direccionEnvio = '',
  metodoPago = 'PRUEBA_APROBADA'
} = {}) {
  const clave = claveConfirmacion || nuevaClave()
  const destLimpio = typeof destinatario === 'string' ? destinatario.trim() : ''
  const dirLimpia = typeof direccionEnvio === 'string' ? direccionEnvio.trim() : ''

  if (!METODOS_PAGO.includes(metodoPago)) {
    throw new Error('Elige un escenario de pago de prueba.')
  }
  if (destLimpio.length > 120) {
    throw new Error('El destinatario no puede superar los 120 caracteres.')
  }
  if (dirLimpia.length > 250) {
    throw new Error('La dirección de envío no puede superar los 250 caracteres.')
  }

  const payload = {
    metodoPago
  }
  if (clave) {
    payload.claveConfirmacion = clave
  }
  if (destLimpio) {
    payload.destinatario = destLimpio
  }
  if (dirLimpia) {
    payload.direccionEnvio = dirLimpia
  }

  return payload
}

/** Texto del botón de pago del paso 2: el cliente ve cuánto va a pagar. */
export function textoBotonPagar(total) {
  return `Confirmar y pagar ${formatoPrecio(total)}`
}

/** "N.º 0006", igual que en Mis compras del boceto. */
export function numeroPedido(idPedido) {
  return `N.º ${String(idPedido ?? '').padStart(4, '0')}`
}

/** "Prueba · Aprobado" a partir de la respuesta de /api/pedidos/confirmar. */
export function describirPago(pedido = {}) {
  const estado = String(pedido.estadoPago || '').toLowerCase()
  const legible = estado ? estado.charAt(0).toUpperCase() + estado.slice(1) : 'Registrado'
  return `Prueba · ${legible}`
}

/**
 * Mensaje para el cliente cuando la compra no se confirma. Un pago rechazado (402) no toca
 * el carrito porque la fachada revierte toda la transacción.
 */
export function mensajeErrorCompra(error) {
  const estado = error?.status
  if (estado === 402) {
    return 'El pago de prueba fue rechazado y no se creó ningún pedido. Tu carrito sigue igual: elige «Pago de prueba aprobado» para completar la compra.'
  }
  if (estado === 0) {
    return `${error.message} Antes de reintentar, revisa Mis compras: si el pedido se creó, no se cobrará dos veces.`
  }
  return error?.message || 'No se pudo confirmar la compra.'
}

/**
 * Si el resultado de la compra es desconocido (sin respuesta del servidor), se reintenta
 * con la misma clave: el backend devuelve el mismo pedido en lugar de crear otro.
 * Con una respuesta definitiva (éxito o error HTTP) se usa una clave nueva.
 */
export function conservarClaveTrasError(error) {
  return error?.status === 0
}

/** Paso visible tras un cambio en el carrito: sin productos no se puede seguir en "entrega". */
export function pasoTrasActualizarCarrito(pasoActual, cantidadProductos) {
  if (pasoActual === 'entrega' && cantidadProductos === 0) return 'carrito'
  return pasoActual
}
