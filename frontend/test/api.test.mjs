import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, ApiError, MENSAJE_TIEMPO_AGOTADO, TIEMPO_LIMITE_MS } from '../src/api/api.js'

const fetchOriginal = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = fetchOriginal
})

test('aplica credenciales same-origin y serializa JSON', async () => {
  let llamada
  globalThis.fetch = async (url, options) => {
    llamada = { url, options }
    return new Response('{"ok":true}', { status: 200 })
  }

  const respuesta = await apiRequest('/api/demo', { method: 'POST', json: { nombre: 'Audio' } })
  assert.equal(llamada.options.credentials, 'same-origin')
  assert.equal(llamada.options.headers.get('Content-Type'), 'application/json')
  assert.equal(llamada.options.body, '{"nombre":"Audio"}')
  assert.deepEqual(await respuesta.json(), { ok: true })
})

test('preserva credenciales explícitas para integraciones que las necesiten', async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.credentials, 'include')
    return new Response(null, { status: 204 })
  }
  await apiRequest('/api/demo', { credentials: 'include' })
})

test('convierte errores HTTP y conserva el mensaje del backend', async () => {
  globalThis.fetch = async () => new Response('{"detail":"Pedido no modificable"}', {
    status: 409,
    headers: { 'Content-Type': 'application/json' }
  })
  await assert.rejects(apiRequest('/api/pedidos/1'), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 409)
    assert.equal(error.message, 'Pedido no modificable')
    return true
  })
})

test('mapea estados HTTP conocidos cuando la respuesta no tiene detalle', async () => {
  for (const [status, expected] of [
    [400, 'La solicitud contiene datos inválidos.'],
    [401, 'Inicia sesión para continuar.'],
    [403, 'No tienes permiso para realizar esta acción.'],
    [404, 'No se encontró el recurso solicitado.'],
    [409, 'Hay un conflicto con el estado actual. Actualiza e inténtalo de nuevo.'],
    [500, 'Ocurrió un error en el servidor.']
  ]) {
    globalThis.fetch = async () => new Response('', { status })
    await assert.rejects(apiRequest('/api/demo'), (error) => error.message === expected)
  }
})

test('normaliza errores de red', async () => {
  globalThis.fetch = async () => { throw new TypeError('offline') }
  await assert.rejects(apiRequest('/api/demo'), (error) => {
    assert.equal(error.status, 0)
    assert.equal(error.message, 'No se pudo conectar con el servidor.')
    return true
  })
})

// ---------- Tiempo límite (revisión de buenas prácticas del frontend, punto 9) ----------

/** fetch simulado que nunca responde por sí solo: solo termina si se cancela la señal. */
function fetchColgado() {
  return (_url, options) => new Promise((_resolver, rechazar) => {
    options.signal.addEventListener('abort', () => rechazar(new DOMException('Cancelada', 'AbortError')))
  })
}

test('cancela la petición si el servidor no responde a tiempo', async () => {
  globalThis.fetch = fetchColgado()
  await assert.rejects(apiRequest('/api/lenta', { tiempoLimiteMs: 20 }), (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 0)
    assert.equal(error.message, MENSAJE_TIEMPO_AGOTADO)
    return true
  })
})

test('siempre envía una señal de cancelación y el tiempo por defecto es de 15 segundos', async () => {
  let senal
  globalThis.fetch = async (_url, options) => {
    senal = options.signal
    return new Response(null, { status: 204 })
  }
  await apiRequest('/api/demo')
  assert.ok(senal instanceof AbortSignal)
  assert.equal(senal.aborted, false, 'una respuesta a tiempo no cancela nada')
  assert.equal(TIEMPO_LIMITE_MS, 15000)
})

test('respeta la cancelación pedida por quien llama', async () => {
  globalThis.fetch = fetchColgado()
  const controlador = new AbortController()
  const promesa = apiRequest('/api/demo', { signal: controlador.signal })
  controlador.abort()
  await assert.rejects(promesa, (error) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.message, 'No se pudo conectar con el servidor.')
    return true
  })
})

test('un fallo de red sigue mostrando que no se pudo conectar', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(apiRequest('/api/demo'), /No se pudo conectar con el servidor/)
})
