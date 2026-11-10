const MENSAJES_HTTP = {
  400: 'La solicitud contiene datos inválidos.',
  401: 'Inicia sesión para continuar.',
  403: 'No tienes permiso para realizar esta acción.',
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

export async function apiRequest(url, options = {}, esReintento = false) {
  const { json, headers: headersIniciales, ...opcionesFetch } = options
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
      return apiRequest(url, options, true)
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
