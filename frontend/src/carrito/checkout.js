export function construirPayloadConfirmacion({
  claveConfirmacion = null,
  destinatario = '',
  direccionEnvio = '',
  metodoPago = 'PRUEBA_APROBADA'
} = {}) {
  const clave = claveConfirmacion || (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : null)
  const destLimpio = typeof destinatario === 'string' ? destinatario.trim() : ''
  const dirLimpia = typeof direccionEnvio === 'string' ? direccionEnvio.trim() : ''

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

