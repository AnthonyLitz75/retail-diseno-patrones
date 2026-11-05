import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ETAPAS_PEDIDO,
  calcularProgresoPedido,
  renderizarStepperPedido
} from '../src/pedidos/pedidos-stepper.js'

test('ETAPAS_PEDIDO contiene las 4 fases canónicas del patrón State', () => {
  assert.equal(ETAPAS_PEDIDO.length, 4)
  assert.deepEqual(
    ETAPAS_PEDIDO.map(e => e.clave),
    ['PENDIENTE', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO']
  )
})

test('calcularProgresoPedido calcula correctamente PENDIENTE', () => {
  const progreso = calcularProgresoPedido('PENDIENTE')
  assert.equal(progreso.esCancelado, false)
  assert.equal(progreso.porcentaje, 0)
  assert.equal(progreso.pasoActivo, 0)
  assert.equal(progreso.pasos[0].estado, 'current')
  assert.equal(progreso.pasos[1].estado, 'pending')
  assert.equal(progreso.pasos[2].estado, 'pending')
  assert.equal(progreso.pasos[3].estado, 'pending')
})

test('calcularProgresoPedido calcula correctamente EN_PREPARACION', () => {
  const progreso = calcularProgresoPedido('EN_PREPARACION')
  assert.equal(progreso.esCancelado, false)
  assert.ok(Math.abs(progreso.porcentaje - 33.33) < 0.1)
  assert.equal(progreso.pasoActivo, 1)
  assert.equal(progreso.pasos[0].estado, 'completed')
  assert.equal(progreso.pasos[1].estado, 'current')
  assert.equal(progreso.pasos[2].estado, 'pending')
  assert.equal(progreso.pasos[3].estado, 'pending')
})

test('calcularProgresoPedido calcula correctamente DESPACHADO', () => {
  const progreso = calcularProgresoPedido('DESPACHADO')
  assert.equal(progreso.esCancelado, false)
  assert.ok(Math.abs(progreso.porcentaje - 66.66) < 0.1)
  assert.equal(progreso.pasoActivo, 2)
  assert.equal(progreso.pasos[0].estado, 'completed')
  assert.equal(progreso.pasos[1].estado, 'completed')
  assert.equal(progreso.pasos[2].estado, 'current')
  assert.equal(progreso.pasos[3].estado, 'pending')
})

test('calcularProgresoPedido calcula correctamente ENTREGADO', () => {
  const progreso = calcularProgresoPedido('ENTREGADO')
  assert.equal(progreso.esCancelado, false)
  assert.equal(progreso.porcentaje, 100)
  assert.equal(progreso.pasoActivo, 3)
  assert.ok(progreso.pasos.every(p => p.estado === 'completed'))
})

test('calcularProgresoPedido maneja pedidos CANCELADO como estado especial', () => {
  const progreso = calcularProgresoPedido('CANCELADO')
  assert.equal(progreso.esCancelado, true)
  assert.equal(progreso.porcentaje, 0)
  assert.ok(progreso.pasos.every(p => p.estado === 'cancelled'))
})

test('renderizarStepperPedido genera HTML con clases semánticas e indicadores visuales', () => {
  const htmlPendiente = renderizarStepperPedido('PENDIENTE')
  assert.ok(htmlPendiente.includes('order-stepper'))
  assert.ok(htmlPendiente.includes('is-current'))
  assert.ok(htmlPendiente.includes('style="width: 0%;"'))

  const htmlEntregado = renderizarStepperPedido('ENTREGADO')
  assert.ok(htmlEntregado.includes('is-completed'))
  assert.ok(htmlEntregado.includes('style="width: 100%;"'))

  const htmlCancelado = renderizarStepperPedido('CANCELADO')
  assert.ok(htmlCancelado.includes('order-cancelled-banner'))
  assert.ok(htmlCancelado.includes('Pedido Cancelado'))
})
