import test from 'node:test'
import assert from 'node:assert/strict'
import {
  construirPayloadConfirmacion,
  conservarClaveTrasError,
  describirPago,
  mensajeErrorCompra,
  numeroPedido,
  PASOS_CHECKOUT,
  pasoTrasActualizarCarrito,
  textoBotonPagar
} from '../src/carrito/checkout.js'

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

test('el checkout tiene tres pasos y el botón de pago muestra el total', () => {
  assert.deepEqual([...PASOS_CHECKOUT], ['carrito', 'entrega', 'confirmacion'])
  assert.equal(textoBotonPagar(716), 'Confirmar y pagar S/ 716.00')
  assert.equal(numeroPedido(6), 'N.º 0006')
  assert.equal(numeroPedido(1234), 'N.º 1234')
  assert.equal(describirPago({ estadoPago: 'APROBADO' }), 'Prueba · Aprobado')
  assert.equal(describirPago({}), 'Prueba · Registrado')
})

test('construirPayloadConfirmacion envía el escenario de pago elegido y rechaza uno inventado', () => {
  assert.equal(construirPayloadConfirmacion({ metodoPago: 'PRUEBA_RECHAZADA' }).metodoPago, 'PRUEBA_RECHAZADA')
  assert.throws(() => construirPayloadConfirmacion({ metodoPago: 'TARJETA' }), /escenario de pago/)
})

test('un pago rechazado explica que el carrito no cambió; sin respuesta se conserva la clave', () => {
  assert.match(mensajeErrorCompra({ status: 402, message: 'Pago rechazado' }), /no se creó ningún pedido/)
  assert.match(mensajeErrorCompra({ status: 0, message: 'No se pudo conectar con el servidor.' }), /revisa Mis compras/)
  assert.equal(mensajeErrorCompra({ status: 409, message: 'Stock insuficiente' }), 'Stock insuficiente')
  assert.equal(conservarClaveTrasError({ status: 0 }), true, 'resultado desconocido: reintentar con la misma clave')
  assert.equal(conservarClaveTrasError({ status: 402 }), false)
  assert.equal(conservarClaveTrasError({ status: 409 }), false)
})

test('si el carrito queda vacío en "entrega" se vuelve al paso del carrito', () => {
  assert.equal(pasoTrasActualizarCarrito('entrega', 0), 'carrito')
  assert.equal(pasoTrasActualizarCarrito('entrega', 2), 'entrega')
  assert.equal(pasoTrasActualizarCarrito('confirmacion', 0), 'confirmacion', 'la confirmación se ve con el carrito ya vacío')
})
