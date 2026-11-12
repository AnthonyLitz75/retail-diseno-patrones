import { apiRequest } from '../api/api.js'
import { ESTADO_PEDIDO } from '../utilidades/constantes.js'

/** Spec 006: avisos de reclamos y devoluciones -> [texto, color Bootstrap, estado]. */
const BADGES_ATENCION = {
  RECLAMO_REGISTRADO: ['Reclamo registrado', 'info', 'reclamo'],
  RECLAMO_RESPONDIDO: ['Reclamo respondido', 'primary', 'reclamo'],
  RECLAMO_ESCALADO: ['Reclamo escalado', 'warning', 'reclamo'],
  RECLAMO_RESUELTO: ['Reclamo resuelto', 'success', 'reclamo'],
  DEVOLUCION_SOLICITADA: ['Devolución solicitada', 'info', 'devolucion'],
  DEVOLUCION_APROBADA: ['Devolución aprobada', 'primary', 'devolucion'],
  DEVOLUCION_RECHAZADA: ['Devolución rechazada', 'danger', 'devolucion'],
  DEVOLUCION_CERRADA: ['Devolución reembolsada', 'success', 'devolucion']
}

/**
 * Obtiene la configuración semántica de badge para un estado de notificación.
 * @param {string} estado
 * @returns {{ texto: string, clase: string, estado: string }}
 */
export function obtenerBadgeEstadoNotificacion(estado) {
  const normalizado = typeof estado === 'string' ? estado.trim().toUpperCase() : ''
  switch (normalizado) {
    case ESTADO_PEDIDO.PENDIENTE:
      return {
        texto: 'Confirmado',
        clase: 'badge bg-info-subtle text-info-emphasis border border-info-subtle',
        estado: 'confirmado'
      }
    case ESTADO_PEDIDO.EN_PREPARACION:
      return {
        texto: 'En preparación',
        clase: 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle',
        estado: 'preparacion'
      }
    case ESTADO_PEDIDO.DESPACHADO:
      return {
        texto: 'Despachado',
        clase: 'badge bg-primary-subtle text-primary-emphasis border border-primary-subtle',
        estado: 'despachado'
      }
    case ESTADO_PEDIDO.ENTREGADO:
      return {
        texto: 'Entregado',
        clase: 'badge bg-success-subtle text-success-emphasis border border-success-subtle',
        estado: 'entregado'
      }
    case ESTADO_PEDIDO.CANCELADO:
      return {
        texto: 'Cancelado',
        clase: 'badge bg-danger-subtle text-danger-emphasis border border-danger-subtle',
        estado: 'cancelado'
      }
    default:
      if (BADGES_ATENCION[normalizado]) {
        const [texto, color, estadoBadge] = BADGES_ATENCION[normalizado]
        return {
          texto,
          clase: `badge bg-${color}-subtle text-${color}-emphasis border border-${color}-subtle`,
          estado: estadoBadge
        }
      }
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
    method: 'GET',
    segundoPlano: true
  })
  if (respuesta && typeof respuesta.json === 'function') {
    return await respuesta.json()
  }
  return respuesta
}


/**
 * Marca una notificación propia como leída (PATCH /api/notificaciones/{id}/leida).
 * El servidor responde 404 si la notificación es de otro usuario.
 * @param {Function} request
 * @param {number} idNotificacion
 * @returns {Promise<Object>} la notificación actualizada
 */
export async function marcarNotificacionLeida(request = apiRequest, idNotificacion) {
  if (!Number.isInteger(idNotificacion) || idNotificacion <= 0) {
    throw new Error('El identificador de la notificación no es válido')
  }
  const respuesta = await request(`/api/notificaciones/${idNotificacion}/leida`, {
    method: 'PATCH'
  })
  if (respuesta && typeof respuesta.json === 'function') {
    return await respuesta.json()
  }
  return respuesta
}

/**
 * Registra la lectura de una notificación y devuelve la lista actualizada sin modificar la
 * original. Si ya estaba leída no consulta al servidor; si el servidor rechaza la operación,
 * conserva la lista tal cual para que el contador no mienta.
 * @param {Function} request
 * @param {Array<{ id: number, leida?: boolean }>} notificaciones
 * @param {{ id: number, leida?: boolean }} notificacion
 * @returns {Promise<Array>}
 */
export async function registrarLectura(request, notificaciones, notificacion) {
  if (!notificacion || notificacion.leida) return notificaciones
  try {
    await marcarNotificacionLeida(request, notificacion.id)
  } catch {
    return notificaciones
  }
  return notificaciones.map(item => (item.id === notificacion.id ? { ...item, leida: true } : item))
}
