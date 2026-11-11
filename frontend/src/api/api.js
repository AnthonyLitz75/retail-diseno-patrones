const MENSAJES_HTTP = {
  400: 'La solicitud contiene datos inválidos.',
  401: 'Inicia sesión para continuar.',
  403: 'No tienes permiso para realizar esta acción.',
  402: 'El pago fue rechazado. Revisa el medio de pago e inténtalo de nuevo.',
  404: 'No se encontró el recurso solicitado.',
  409: 'Hay un conflicto con el estado actual. Actualiza e inténtalo de nuevo.',
  500: 'Ocurrió un error en el servidor.'
}

let datosCsrf = null
let promesaCsrf = null

export function reiniciarTokenCsrf() {
  datosCsrf = null
  promesaCsrf = null
}

export async function obtenerTokenCsrf(forzarRenovacion = false) {
  if (datosCsrf && !forzarRenovacion) return datosCsrf
  if (promesaCsrf) return promesaCsrf

  promesaCsrf = (async () => {
    try {
      const resp = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
      if (resp.ok) {
        const json = await resp.json()
        datosCsrf = {
          token: json.token || '',
          cabecera: json.cabecera || 'X-XSRF-TOKEN'
        }
        return datosCsrf
      }
    } catch {
      // Si la llamada falla, se devolverá null
    } finally {
      promesaCsrf = null
    }
    return null
  })()

  return promesaCsrf
}

export class ApiError extends Error {
  constructor(message, status = 0, options = {}) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}

// ---------- Eventos de peticiones (spec 007, T002 y T004) ----------
// El cliente HTTP no conoce la interfaz: avisa a quien se suscriba cuándo empieza y termina
// una petición y cuándo falla por sesión (401) o permisos (403). Así el indicador de carga y
// el manejo global de errores viven en sus propios módulos y se prueban por separado.

const suscriptores = new Set()

/**
 * @param {(evento: {tipo: 'inicio'|'fin'|'error', url: string, segundoPlano: boolean, status?: number, mensaje?: string}) => void} oyente
 * @returns {() => void} función para cancelar la suscripción
 */
export function suscribirEventosApi(oyente) {
  suscriptores.add(oyente)
  return () => suscriptores.delete(oyente)
}

function emitir(evento) {
  for (const oyente of suscriptores) {
    try {
      oyente(evento)
    } catch {
      // Un oyente con fallas no debe romper la petición.
    }
  }
}

/**
 * Petición a la API con cookies de sesión y CSRF. Opción propia: {@code segundoPlano: true}
 * para consultas automáticas (por ejemplo, el sondeo de notificaciones), que no muestran el
 * indicador de carga.
 */
export async function apiRequest(url, options = {}) {
  const segundoPlano = Boolean(options.segundoPlano)
  emitir({ tipo: 'inicio', url, segundoPlano })
  try {
    return await realizarPeticion(url, options)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      emitir({ tipo: 'error', url, segundoPlano, status: error.status, mensaje: error.message })
    }
    throw error
  } finally {
    emitir({ tipo: 'fin', url, segundoPlano })
  }
}

async function realizarPeticion(url, options = {}, esReintento = false) {
  const { json, headers: headersIniciales, segundoPlano: _segundoPlano, ...opcionesFetch } = options
  const headers = new Headers(headersIniciales)
  const metodo = (options.method || 'GET').toUpperCase()
  const esMutacion = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(metodo)

  if (esMutacion) {
    const csrf = await obtenerTokenCsrf()
    if (csrf && csrf.token) {
      headers.set(csrf.cabecera, csrf.token)
    }
  }

  const opciones = {
    ...opcionesFetch,
    method: metodo,
    headers,
    credentials: opcionesFetch.credentials ?? 'same-origin'
  }

  if (json !== undefined) {
    if (opciones.body !== undefined) {
      throw new TypeError('Usa json o body, no ambos, en una petición API.')
    }
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
    opciones.body = JSON.stringify(json)
  }

  let respuesta
  try {
    respuesta = await fetch(url, opciones)
  } catch (causa) {
    throw new ApiError('No se pudo conectar con el servidor.', 0, { cause: causa })
  }

  if (!respuesta.ok) {
    if (respuesta.status === 403 && esMutacion && !esReintento) {
      await obtenerTokenCsrf(true)
      return realizarPeticion(url, options, true)
    }
    throw await crearErrorHttp(respuesta)
  }
  return respuesta
}

async function crearErrorHttp(respuesta) {
  let mensaje
  try {
    const cuerpo = await respuesta.clone().json()
    mensaje = cuerpo.error || cuerpo.message || cuerpo.detail || cuerpo.title
  } catch {
    // Algunas respuestas de error no incluyen JSON.
  }
  return new ApiError(
    mensaje || MENSAJES_HTTP[respuesta.status] || `La solicitud falló (código ${respuesta.status}).`,
    respuesta.status
  )
}
