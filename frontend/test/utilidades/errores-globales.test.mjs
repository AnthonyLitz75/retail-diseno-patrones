import test from 'node:test'
import assert from 'node:assert/strict'
import { apiRequest, suscribirEventosApi } from '../../src/api/api.js'
import {
  configurarErroresGlobales,
  esRutaDeAutenticacion,
  rutaLoginConRetorno,
  VENTANA_AVISO_MS
} from '../../src/utilidades/errores-globales.js'

const fetchOriginal = globalThis.fetch
test.afterEach(() => { globalThis.fetch = fetchOriginal })

/** Arma el manejador con dependencias falsas y un reloj controlable. */
function escenario({ usuario = { rol: 'CLIENTE' }, hash = '#/pedidos' } = {}) {
  let oyente = null
  let reloj = 0
  const toasts = []
  const redirecciones = []
  let sesionesLimpiadas = 0
  configurarErroresGlobales({
    suscribir: (fn) => { oyente = fn; return () => {} },
    obtenerUsuario: () => usuario,
    mostrarToast: (mensaje, tipo) => toasts.push({ mensaje, tipo }),
    alSesionExpirada: () => { sesionesLimpiadas += 1 },
    redirigir: (ruta) => redirecciones.push(ruta),
    obtenerHash: () => hash,
    ahora: () => reloj,
    programar: (fn) => fn()
  })
  return {
    toasts,
    redirecciones,
    sesionesLimpiadas: () => sesionesLimpiadas,
    avanzar: (ms) => { reloj += ms },
    error: (status, url = '/api/pedidos/mis-pedidos') => oyente({ tipo: 'error', status, url, segundoPlano: false })
  }
}

test('401 con sesión: avisa una sola vez, limpia la sesión y lleva al login con retorno', () => {
  const e = escenario()
  e.error(401)
  e.error(401, '/api/carrito')
  assert.equal(e.toasts.length, 1)
  assert.match(e.toasts[0].mensaje, /sesión expiró/)
  assert.equal(e.toasts[0].tipo, 'advertencia')
  assert.equal(e.sesionesLimpiadas(), 1)
  assert.deepEqual(e.redirecciones, ['/login.html?volver=%23%2Fpedidos'])
})

test('401 como invitado: pide iniciar sesión sin limpiar nada', () => {
  const e = escenario({ usuario: null, hash: '' })
  e.error(401)
  assert.match(e.toasts[0].mensaje, /^Inicia sesión/)
  assert.equal(e.sesionesLimpiadas(), 0)
  assert.deepEqual(e.redirecciones, ['/login.html'])
})

test('las rutas /api/auth/* no disparan el manejo global (consultar sesión o clave errónea)', () => {
  const e = escenario()
  e.error(401, '/api/auth/sesion')
  e.error(401, '/api/auth/login')
  assert.equal(e.toasts.length, 0)
  assert.equal(e.redirecciones.length, 0)
  assert.equal(esRutaDeAutenticacion('/api/authx'), false)
})

test('403 avisa de permisos sin redirigir y no repite el aviso dentro de la ventana', () => {
  const e = escenario()
  e.error(403)
  e.error(403)
  e.avanzar(VENTANA_AVISO_MS)
  e.error(403)
  assert.equal(e.toasts.length, 2)
  assert.match(e.toasts[0].mensaje, /permiso/)
  assert.equal(e.redirecciones.length, 0)
})

test('el retorno al login solo acepta rutas internas de la SPA', () => {
  assert.equal(rutaLoginConRetorno('#/producto/PA-1'), '/login.html?volver=%23%2Fproducto%2FPA-1')
  assert.equal(rutaLoginConRetorno('javascript:alert(1)'), '/login.html')
  assert.equal(rutaLoginConRetorno(undefined), '/login.html')
  assert.equal(rutaLoginConRetorno('#/'), '/login.html', 'El inicio no necesita retorno')
})

test('apiRequest emite inicio, error 401 y fin, y marca las peticiones en segundo plano', async () => {
  const eventos = []
  const cancelar = suscribirEventosApi((ev) => eventos.push(`${ev.tipo}:${ev.status ?? ''}:${ev.segundoPlano}`))
  globalThis.fetch = async () => new Response('', { status: 401 })
  await assert.rejects(apiRequest('/api/carrito', { segundoPlano: true }))
  globalThis.fetch = async () => new Response('{}', { status: 200 })
  await apiRequest('/api/productos')
  cancelar()
  await apiRequest('/api/productos')
  assert.deepEqual(eventos, ['inicio::true', 'error:401:true', 'fin::true', 'inicio::false', 'fin::false'])
})

test('segundoPlano no llega a fetch y un oyente con fallas no rompe la petición', async () => {
  let opciones
  globalThis.fetch = async (_url, o) => { opciones = o; return new Response('{}', { status: 200 }) }
  const cancelar = suscribirEventosApi(() => { throw new Error('oyente roto') })
  await apiRequest('/api/productos', { segundoPlano: true })
  cancelar()
  assert.equal('segundoPlano' in opciones, false)
})

test('tras el login solo se vuelve a rutas internas de la SPA (sin open redirect)', async () => {
  const { destinoTrasLogin } = await import('../../src/utilidades/errores-globales.js')
  assert.equal(destinoTrasLogin('?volver=%23%2Fpedidos'), '/#/pedidos')
  assert.equal(destinoTrasLogin('?volver=%23%2Fproducto%2FPA-0003'), '/#/producto/PA-0003')
  for (const malicioso of ['?volver=https%3A%2F%2Fevil.example', '?volver=%2F%2Fevil.example', '?volver=%23%2F%2Fevil.example',
    '?volver=javascript%3Aalert(1)', '?volver=%23%2F%22%3E%3Cscript%3E', '']) {
    assert.equal(destinoTrasLogin(malicioso), '/', malicioso)
  }
})
