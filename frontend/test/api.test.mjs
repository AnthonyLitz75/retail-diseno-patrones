import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, ApiError } from '../src/api/api.js'

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
