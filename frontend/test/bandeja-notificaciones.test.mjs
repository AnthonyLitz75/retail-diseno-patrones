import test from 'node:test'
import assert from 'node:assert/strict'
import {
  obtenerBadgeEstadoNotificacion,
  contarNotificacionesNoLeidas,
  formatearFechaNotificacion,
  consultarMisNotificaciones
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

