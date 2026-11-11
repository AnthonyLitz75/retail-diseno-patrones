import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularSaldoDevolvible,
  decidirDevolucion,
  etiquetaEstadoDevolucion,
  etiquetaEstadoReclamo,
  listarBandejaReclamos,
  reasignarReclamo,
  recibirDevolucion,
  registrarReclamo,
  responderReclamo,
  solicitarDevolucion
} from '../src/atencion/atencion.js'

function grabadora(respuesta = {}) {
  const llamadas = []
  const apiRequest = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return { json: async () => respuesta }
  }
  return { apiRequest, llamadas }
}

test('registra el reclamo con texto limpio y valida antes de enviar', async () => {
  const { apiRequest, llamadas } = grabadora({ id: 5 })
  const reclamo = await registrarReclamo(apiRequest, 12, { motivo: ' Falla ', descripcion: ' No enciende ' })
  assert.deepEqual(reclamo, { id: 5 })
  assert.equal(llamadas[0].url, '/api/pedidos/12/reclamos')
  assert.equal(llamadas[0].opciones.method, 'POST')
  assert.deepEqual(llamadas[0].opciones.json, { motivo: 'Falla', descripcion: 'No enciende' })

  assert.throws(() => registrarReclamo(apiRequest, 12, { motivo: '', descripcion: 'x' }), /motivo es obligatorio/)
  assert.throws(() => registrarReclamo(apiRequest, 12, { motivo: 'x'.repeat(101), descripcion: 'x' }), /100 caracteres/)
  assert.throws(() => registrarReclamo(apiRequest, 0, { motivo: 'x', descripcion: 'x' }), /pedido no es válido/)
  assert.equal(llamadas.length, 1)
})

test('la devolución envía solo las líneas con cantidad y exige al menos una', async () => {
  const { apiRequest, llamadas } = grabadora({ id: 9 })
  await solicitarDevolucion(apiRequest, 3, 'No me sirve', [
    { pedidoDetalleId: 7, cantidad: 1 },
    { pedidoDetalleId: 8, cantidad: 0 }
  ])
  assert.equal(llamadas[0].url, '/api/pedidos/3/devoluciones')
  assert.deepEqual(llamadas[0].opciones.json, { motivo: 'No me sirve', lineas: [{ pedidoDetalleId: 7, cantidad: 1 }] })

  assert.throws(() => solicitarDevolucion(apiRequest, 3, 'x', [{ pedidoDetalleId: 7, cantidad: 0 }]), /al menos una unidad/)
  assert.throws(() => solicitarDevolucion(apiRequest, 3, 'x', [{ pedidoDetalleId: 7, cantidad: 1.5 }]), /enteros/)
})

test('saldo devolvible: comprado menos lo no rechazado del mismo pedido', () => {
  const pedido = {
    idPedido: 1,
    productos: [
      { idDetalle: 10, cantidad: 3 },
      { idDetalle: 11, cantidad: 1 },
      { idDetalle: null, cantidad: 2 }
    ]
  }
  const devoluciones = [
    { pedidoId: 1, estado: 'SOLICITADA', lineas: [{ pedidoDetalleId: 10, cantidad: 1 }] },
    { pedidoId: 1, estado: 'CERRADA', lineas: [{ pedidoDetalleId: 10, cantidad: 1 }, { pedidoDetalleId: 11, cantidad: 1 }] },
    { pedidoId: 1, estado: 'RECHAZADA', lineas: [{ pedidoDetalleId: 10, cantidad: 1 }] },
    { pedidoId: 2, estado: 'APROBADA', lineas: [{ pedidoDetalleId: 10, cantidad: 1 }] }
  ]
  const saldos = calcularSaldoDevolvible(pedido, devoluciones)
  assert.equal(saldos.get(10), 1)
  assert.equal(saldos.get(11), 0)
  assert.equal(saldos.size, 2, 'Sin id de línea no se ofrece devolver')
})

test('soporte: filtro de bandeja codificado, respuesta y decisión', async () => {
  const { apiRequest, llamadas } = grabadora([])
  await listarBandejaReclamos(apiRequest, 'EN_ATENCION')
  await listarBandejaReclamos(apiRequest)
  await responderReclamo(apiRequest, 4, ' Listo ', true)
  await decidirDevolucion(apiRequest, 6, false, '  ')
  assert.equal(llamadas[0].url, '/api/soporte/reclamos?estado=EN_ATENCION')
  assert.equal(llamadas[1].url, '/api/soporte/reclamos')
  assert.deepEqual(llamadas[2].opciones.json, { respuesta: 'Listo', estado: 'RESUELTO' })
  assert.deepEqual(llamadas[3].opciones.json, { aprobada: false, observacion: null })
})

test('recepción: todas las líneas y escenario de reembolso solo si se elige', async () => {
  const { apiRequest, llamadas } = grabadora({})
  await recibirDevolucion(apiRequest, 2, [{ detalleDevolucionId: 1, reintegrarStock: true }, { detalleDevolucionId: 2, reintegrarStock: false }])
  await recibirDevolucion(apiRequest, 2, [{ detalleDevolucionId: 1, reintegrarStock: 1 }], 'PRUEBA_RECHAZADA')
  assert.equal(llamadas[0].url, '/api/soporte/devoluciones/2/recepcion')
  assert.equal(llamadas[0].opciones.json.escenarioReembolso, undefined)
  assert.equal(llamadas[0].opciones.json.lineas[1].reintegrarStock, false)
  assert.equal(llamadas[1].opciones.json.escenarioReembolso, 'PRUEBA_RECHAZADA')
  assert.throws(() => recibirDevolucion(apiRequest, 2, []), /cada línea/)
})

test('reasignación exige un agente válido', async () => {
  const { apiRequest, llamadas } = grabadora({})
  await reasignarReclamo(apiRequest, 3, '15')
  assert.deepEqual(llamadas[0].opciones.json, { soporteId: 15 })
  assert.throws(() => reasignarReclamo(apiRequest, 3, ''), /agente de soporte/)
})

test('etiquetas de estado conocidas y desconocidas', () => {
  assert.equal(etiquetaEstadoReclamo('ESCALADO').texto, 'Escalado')
  assert.equal(etiquetaEstadoDevolucion('CERRADA').clase, 'text-bg-success')
  assert.equal(etiquetaEstadoDevolucion('OTRO').texto, 'OTRO')
})

test('Mi atención: resumen de abiertos y estado de preguntas', async () => {
  const { resumirAtenciones, etiquetaEstadoPregunta } = await import('../src/atencion/mi-atencion.js')
  const resumen = resumirAtenciones({
    preguntas: [{ respuesta: 'Sí' }, { respuesta: null }],
    reclamos: [{ estado: 'RESUELTO' }, { estado: 'ESCALADO' }, { estado: 'ABIERTO' }],
    devoluciones: [{ estado: 'CERRADA' }, { estado: 'RECHAZADA' }, { estado: 'APROBADA' }]
  })
  assert.deepEqual(resumen, {
    preguntas: { total: 2, abiertos: 1 },
    reclamos: { total: 3, abiertos: 2 },
    devoluciones: { total: 3, abiertos: 1 }
  })
  assert.equal(etiquetaEstadoPregunta({ respuesta: 'ok' }).texto, 'Respondida')
  assert.equal(etiquetaEstadoPregunta({}).texto, 'Pendiente')
  assert.deepEqual(resumirAtenciones({}), {
    preguntas: { total: 0, abiertos: 0 }, reclamos: { total: 0, abiertos: 0 }, devoluciones: { total: 0, abiertos: 0 }
  })
})
