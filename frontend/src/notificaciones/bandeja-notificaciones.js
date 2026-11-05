import { apiRequest } from '../api/api.js'

/**
 * Obtiene la configuración semántica de badge para un estado de notificación.
 * @param {string} estado
 * @returns {{ texto: string, clase: string, estado: string }}
 */
export function obtenerBadgeEstadoNotificacion(estado) {
  const normalizado = typeof estado === 'string' ? estado.trim().toUpperCase() : ''
  switch (normalizado) {
    case 'EN_PREPARACION':
      return {
        texto: 'En preparación',
        clase: 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle',
        estado: 'preparacion'
      }
    case 'DESPACHADO':
      return {
        texto: 'Despachado',
        clase: 'badge bg-primary-subtle text-primary-emphasis border border-primary-subtle',
        estado: 'despachado'
      }
    case 'ENTREGADO':
      return {
        texto: 'Entregado',
        clase: 'badge bg-success-subtle text-success-emphasis border border-success-subtle',
        estado: 'entregado'
      }
    case 'CANCELADO':
      return {
        texto: 'Cancelado',
        clase: 'badge bg-danger-subtle text-danger-emphasis border border-danger-subtle',
        estado: 'cancelado'
      }
    default:
      return {
        texto: normalizado || 'Actualización',
        clase: 'badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle',
        estado: 'desconocido'
      }
  }
}

/**
 * Cuenta las notificaciones que no han sido marcadas como leídas.
 * @param {Array<{ leida?: boolean }>} notificaciones
 * @returns {number}
 */
export function contarNotificacionesNoLeidas(notificaciones) {
  if (!Array.isArray(notificaciones)) return 0
  return notificaciones.filter(item => item && !item.leida).length
}

/**
 * Formatea una fecha ISO a una representación local amigable en español.
 * @param {string|Date} fechaIso
 * @returns {string}
 */
export function formatearFechaNotificacion(fechaIso) {
  if (!fechaIso) return ''
  try {
    const fecha = new Date(fechaIso)
    if (Number.isNaN(fecha.getTime())) return ''
    return fecha.toLocaleString('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * Consulta la lista de notificaciones del cliente autenticado.
 * @param {Function} [request=apiRequest]
 * @param {number} [limite=50]
 * @returns {Promise<Array>}
 */
export async function consultarMisNotificaciones(request = apiRequest, limite = 50) {
  const limiteValido = typeof limite === 'number' && limite > 0 && limite <= 100 ? limite : 50
  const respuesta = await request(`/api/notificaciones/mias?limite=${limiteValido}`, {
    method: 'GET'
  })
  if (respuesta && typeof respuesta.json === 'function') {
    return await respuesta.json()
  }
  return respuesta
}

