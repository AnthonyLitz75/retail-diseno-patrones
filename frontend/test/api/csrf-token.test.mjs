import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, ApiError, reiniciarTokenCsrf } from '../../src/api/api.js'

const fetchOriginal = globalThis.fetch

test.beforeEach(() => {
  reiniciarTokenCsrf()
})

test.afterEach(() => {
  globalThis.fetch = fetchOriginal
  reiniciarTokenCsrf()
})

test('solicita token CSRF y lo adjunta en cabecera en peticiones POST', async () => {
  const llamadas = []
  globalThis.fetch = async (url, options) => {
    llamadas.push({ url, options })
    if (url === '/api/auth/csrf') {
      return new Response(JSON.stringify({ token: 'csrf-token-123', cabecera: 'X-XSRF-TOKEN' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const respuesta = await apiRequest('/api/pedidos/confirmar', {
    method: 'POST',
    json: { clave: 'abc' }
  })

  assert.equal(llamadas.length, 2)
  assert.equal(llamadas[0].url, '/api/auth/csrf')
  assert.equal(llamadas[1].url, '/api/pedidos/confirmar')
  assert.equal(llamadas[1].options.headers.get('X-XSRF-TOKEN'), 'csrf-token-123')
  assert.deepEqual(await respuesta.json(), { ok: true })
})

test('reutiliza el token CSRF en mutaciones posteriores sin volver a llamar /api/auth/csrf', async () => {
  let contadorCsrf = 0
  globalThis.fetch = async (url, _options) => {
    if (url === '/api/auth/csrf') {
      contadorCsrf++
      return new Response(JSON.stringify({ token: 'csrf-token-fijo', cabecera: 'X-XSRF-TOKEN' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  await apiRequest('/api/carrito/productos', { method: 'POST', json: { id: 1 } })
  await apiRequest('/api/carrito/productos/1', { method: 'PUT', json: { cantidad: 5 } })
  await apiRequest('/api/carrito/productos/1', { method: 'DELETE' })

  assert.equal(contadorCsrf, 1)
})

test('peticiones GET no solicitan ni envían token CSRF', async () => {
  let llamadaCsrf = false
  globalThis.fetch = async (url, _options) => {
    if (url === '/api/auth/csrf') {
      llamadaCsrf = true
    }
    return new Response(JSON.stringify({ productos: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  await apiRequest('/api/productos')
  assert.equal(llamadaCsrf, false)
})

test('ante 403 en mutación, renueva token y reintenta la petición una vez', async () => {
  const tokensEntregados = ['token-viejo', 'token-renovado']
  let intentosMutacion = 0
  const tokensRecibidos = []

  globalThis.fetch = async (url, options) => {
    if (url === '/api/auth/csrf') {
      const token = tokensEntregados.shift()
      return new Response(JSON.stringify({ token, cabecera: 'X-XSRF-TOKEN' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (url === '/api/carrito/productos') {
      intentosMutacion++
      tokensRecibidos.push(options.headers.get('X-XSRF-TOKEN'))
      if (intentosMutacion === 1) {
        return new Response(JSON.stringify({ error: 'Token de seguridad inválido' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return new Response(JSON.stringify({ guardado: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(null, { status: 404 })
  }

  const respuesta = await apiRequest('/api/carrito/productos', {
    method: 'POST',
    json: { productoId: 1 }
  })

  assert.equal(intentosMutacion, 2)
  assert.deepEqual(tokensRecibidos, ['token-viejo', 'token-renovado'])
  assert.deepEqual(await respuesta.json(), { guardado: true })
})

test('si el reintento tras 403 vuelve a fallar con 403, lanza el error y no entra en bucle', async () => {
  let intentosMutacion = 0
  globalThis.fetch = async (url, _options) => {
    if (url === '/api/auth/csrf') {
      return new Response(JSON.stringify({ token: 'nuevo-token', cabecera: 'X-XSRF-TOKEN' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (url === '/api/admin/restringido') {
      intentosMutacion++
      return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(null, { status: 404 })
  }

  await assert.rejects(
    apiRequest('/api/admin/restringido', { method: 'POST', json: {} }),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.status, 403)
      assert.equal(error.message, 'Acceso denegado')
      return true
    }
  )

  assert.equal(intentosMutacion, 2)
})
