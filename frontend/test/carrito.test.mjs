import test from 'node:test'
import assert from 'node:assert/strict'
import { construirPayloadConfirmacion } from '../src/carrito/checkout.js'

test('construirPayloadConfirmacion genera clave si no se suministra y empaqueta campos opcionales', () => {
  const payload = construirPayloadConfirmacion({
    destinatario: '  Juan Pérez  ',
    direccionEnvio: '  Av. Universitaria 1234, Lima  '
  })

  assert.equal(payload.metodoPago, 'PRUEBA_APROBADA')
  assert.equal(payload.destinatario, 'Juan Pérez')
  assert.equal(payload.direccionEnvio, 'Av. Universitaria 1234, Lima')
  assert.ok(typeof payload.claveConfirmacion === 'string')
  assert.match(payload.claveConfirmacion, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
})

test('construirPayloadConfirmacion respeta clave existente y omite campos vacíos', () => {
  const claveFija = 'c1234567-89ab-cdef-0123-456789abcdef'
  const payload = construirPayloadConfirmacion({
    claveConfirmacion: claveFija,
    destinatario: '   ',
    direccionEnvio: ''
  })

  assert.equal(payload.metodoPago, 'PRUEBA_APROBADA')
  assert.equal(payload.claveConfirmacion, claveFija)
  assert.equal(payload.destinatario, undefined)
  assert.equal(payload.direccionEnvio, undefined)
})

test('construirPayloadConfirmacion valida longitud máxima de destinatario y dirección', () => {
  assert.throws(
    () => construirPayloadConfirmacion({ destinatario: 'A'.repeat(121) }),
    /El destinatario no puede superar los 120 caracteres/
  )

  assert.throws(
    () => construirPayloadConfirmacion({ direccionEnvio: 'B'.repeat(251) }),
    /La dirección de envío no puede superar los 250 caracteres/
  )
})
