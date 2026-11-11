import test from 'node:test'
import assert from 'node:assert/strict'
import {
  obtenerBadgeEstadoNotificacion,
  contarNotificacionesNoLeidas,
  formatearFechaNotificacion,
  consultarMisNotificaciones,
  marcarNotificacionLeida,
  registrarLectura
} from '../src/notificaciones/bandeja-notificaciones.js'

test('obtenerBadgeEstadoNotificacion asigna badges semánticos según el estado del pedido', () => {
  const prep = obtenerBadgeEstadoNotificacion('EN_PREPARACION')
  assert.equal(prep.texto, 'En preparación')
  assert.equal(prep.estado, 'preparacion')
  assert.match(prep.clase, /bg-warning-subtle/)

  const desp = obtenerBadgeEstadoNotificacion('DESPACHADO')
  assert.equal(desp.texto, 'Despachado')
  assert.equal(desp.estado, 'despachado')
  assert.match(desp.clase, /bg-primary-subtle/)

  const ent = obtenerBadgeEstadoNotificacion('ENTREGADO')
  assert.equal(ent.texto, 'Entregado')
  assert.equal(ent.estado, 'entregado')
  assert.match(ent.clase, /bg-success-subtle/)

  const canc = obtenerBadgeEstadoNotificacion('CANCELADO')
  assert.equal(canc.texto, 'Cancelado')
  assert.equal(canc.estado, 'cancelado')
  assert.match(canc.clase, /bg-danger-subtle/)

  const desconocido = obtenerBadgeEstadoNotificacion('OTRO_ESTADO')
  assert.equal(desconocido.texto, 'OTRO_ESTADO')
  assert.equal(desconocido.estado, 'desconocido')
  assert.match(desconocido.clase, /bg-secondary-subtle/)

  const nulo = obtenerBadgeEstadoNotificacion(null)
  assert.equal(nulo.texto, 'Actualización')
  assert.equal(nulo.estado, 'desconocido')
})

test('contarNotificacionesNoLeidas calcula correctamente las alertas pendientes', () => {
  assert.equal(contarNotificacionesNoLeidas(null), 0)
  assert.equal(contarNotificacionesNoLeidas([]), 0)

  const lista = [
    { id: 1, leida: false },
    { id: 2, leida: true },
    { id: 3, leida: false },
    { id: 4, leida: false }
  ]
  assert.equal(contarNotificacionesNoLeidas(lista), 3)

  const todasLeidas = [
    { id: 1, leida: true },
    { id: 2, leida: true }
  ]
  assert.equal(contarNotificacionesNoLeidas(todasLeidas), 0)
})

test('formatearFechaNotificacion formatea fechas ISO y tolera valores nulos o inválidos', () => {
  assert.equal(formatearFechaNotificacion(null), '')
  assert.equal(formatearFechaNotificacion(''), '')
  assert.equal(formatearFechaNotificacion('fecha-invalida'), '')

  const formateada = formatearFechaNotificacion('2026-10-16T10:30:00Z')
  assert.ok(formateada.length > 0)
})

test('consultarMisNotificaciones consulta el endpoint /api/notificaciones/mias respetando límites', async () => {
  let rutaInvocada
  let opcionesInvocadas
  const mockNotificaciones = [
    { idNotificacion: 1, pedidoId: 10, estado: 'DESPACHADO', mensaje: 'Tu pedido fue despachado.' }
  ]

  const mockRequest = async (ruta, opciones) => {
    rutaInvocada = ruta
    opcionesInvocadas = opciones
    return {
      json: async () => mockNotificaciones
    }
  }

  const resultado = await consultarMisNotificaciones(mockRequest, 25)
  assert.equal(rutaInvocada, '/api/notificaciones/mias?limite=25')
  assert.equal(opcionesInvocadas.method, 'GET')
  assert.deepEqual(resultado, mockNotificaciones)

  // Si se pasa un límite fuera de rango, usa el valor por defecto de 50
  await consultarMisNotificaciones(mockRequest, 999)
  assert.equal(rutaInvocada, '/api/notificaciones/mias?limite=50')

  await consultarMisNotificaciones(mockRequest, -5)
  assert.equal(rutaInvocada, '/api/notificaciones/mias?limite=50')
})


// --- Spec 005, T010 (US3): pedido confirmado y marcar como leída ---

test('obtenerBadgeEstadoNotificacion muestra PENDIENTE como pedido confirmado', () => {
  const confirmado = obtenerBadgeEstadoNotificacion('PENDIENTE')
  assert.equal(confirmado.texto, 'Confirmado')
  assert.equal(confirmado.estado, 'confirmado')
  assert.match(confirmado.clase, /bg-info-subtle/)
})

test('marcarNotificacionLeida envía PATCH a /api/notificaciones/{id}/leida', async () => {
  const llamadas = []
  const request = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones })
    return { json: async () => ({ id: 7, leida: true }) }
  }

  const resultado = await marcarNotificacionLeida(request, 7)

  assert.deepEqual(llamadas, [{ ruta: '/api/notificaciones/7/leida', opciones: { method: 'PATCH' } }])
  assert.deepEqual(resultado, { id: 7, leida: true })
})

test('marcarNotificacionLeida rechaza identificadores inválidos sin llamar al servidor', async () => {
  let llamado = false
  const request = async () => { llamado = true }

  for (const invalido of [0, -3, null, undefined, '7', 1.5]) {
    await assert.rejects(() => marcarNotificacionLeida(request, invalido), /identificador/i)
  }
  assert.equal(llamado, false)
})

test('registrarLectura marca la notificación y devuelve una lista nueva con el contador reducido', async () => {
  const lista = [
    { id: 1, leida: false, estado: 'PENDIENTE' },
    { id: 2, leida: false, estado: 'EN_PREPARACION' }
  ]
  const rutas = []
  const request = async (ruta) => { rutas.push(ruta); return { json: async () => ({ id: 1, leida: true }) } }

  const actualizada = await registrarLectura(request, lista, lista[0])

  assert.deepEqual(rutas, ['/api/notificaciones/1/leida'])
  assert.equal(contarNotificacionesNoLeidas(actualizada), 1)
  assert.equal(actualizada[0].leida, true)
  assert.equal(lista[0].leida, false, 'No modifica la lista original')
})

test('registrarLectura no llama al servidor si la notificación ya estaba leída', async () => {
  const lista = [{ id: 3, leida: true }]
  let llamado = false
  const request = async () => { llamado = true }

  const actualizada = await registrarLectura(request, lista, lista[0])

  assert.equal(llamado, false)
  assert.equal(actualizada, lista)
})

test('registrarLectura conserva la lista si el servidor rechaza la operación', async () => {
  const lista = [{ id: 4, leida: false }]
  const request = async () => { throw new Error('404') }

  const actualizada = await registrarLectura(request, lista, lista[0])

  assert.equal(actualizada, lista)
  assert.equal(contarNotificacionesNoLeidas(actualizada), 1)
})

test('spec 006: badges de reclamos y devoluciones', async () => {
  const { obtenerBadgeEstadoNotificacion } = await import('../src/notificaciones/bandeja-notificaciones.js')
  assert.equal(obtenerBadgeEstadoNotificacion('RECLAMO_RESUELTO').texto, 'Reclamo resuelto')
  assert.equal(obtenerBadgeEstadoNotificacion('DEVOLUCION_CERRADA').estado, 'devolucion')
  assert.match(obtenerBadgeEstadoNotificacion('devolucion_rechazada').clase, /bg-danger-subtle/)
})
