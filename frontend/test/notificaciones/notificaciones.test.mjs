import test from 'node:test'
import assert from 'node:assert/strict'
import {
  configurarClaseToast,
  configurarIconoToast,
  normalizarOpcionesConfirmacion
} from '../../src/utilidades/notificaciones.js'

test('configurarClaseToast mapea estados a clases semánticas de Bootstrap', () => {
  assert.equal(configurarClaseToast('exito'), 'text-bg-success')
  assert.equal(configurarClaseToast('error'), 'text-bg-danger')
  assert.equal(configurarClaseToast('advertencia'), 'text-bg-warning text-dark')
  assert.equal(configurarClaseToast('info'), 'text-bg-info text-dark')
  assert.equal(configurarClaseToast('text-bg-dark'), 'text-bg-dark')
  assert.equal(configurarClaseToast('desconocido'), 'text-bg-primary')
  assert.equal(configurarClaseToast(), 'text-bg-success')
})

test('configurarIconoToast asigna símbolos visuales según el tipo de alerta', () => {
  assert.equal(configurarIconoToast('exito'), '✓')
  assert.equal(configurarIconoToast('error'), '✕')
  assert.equal(configurarIconoToast('advertencia'), '⚠')
  assert.equal(configurarIconoToast('info'), 'ℹ')
  assert.equal(configurarIconoToast('cualquiera'), '•')
})

test('normalizarOpcionesConfirmacion aplica valores por defecto y preserva personalizaciones', () => {
  const porDefecto = normalizarOpcionesConfirmacion()
  assert.deepEqual(porDefecto, {
    titulo: 'Confirmación',
    mensaje: '¿Estás seguro de realizar esta acción?',
    textoBoton: 'Confirmar',
    claseBoton: 'btn-primary'
  })

  const personalizado = normalizarOpcionesConfirmacion({
    titulo: 'Cancelar pedido',
    mensaje: '¿Estás seguro de cancelar el pedido #10?',
    textoBoton: 'Sí, cancelar pedido',
    claseBoton: 'btn-danger'
  })
  assert.deepEqual(personalizado, {
    titulo: 'Cancelar pedido',
    mensaje: '¿Estás seguro de cancelar el pedido #10?',
    textoBoton: 'Sí, cancelar pedido',
    claseBoton: 'btn-danger'
  })
})

