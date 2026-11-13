import test from 'node:test'
import assert from 'node:assert/strict'
import { crearParametrosMovimientos, crearSolicitudEntrada } from '../../src/inventario/almacen.js'

test('serializa la entrada con el contrato del backend y limpia el motivo', () => {
  assert.deepEqual(crearSolicitudEntrada('12', '5', '  Reposición  '), {
    motivo: 'Reposición',
    productos: [{ productoId: 12, cantidad: 5 }]
  })
})

test('construye filtros de kardex opcionales e incluye el día completo', () => {
  const parametros = crearParametrosMovimientos({
    productoId: '12',
    desde: '2026-10-01',
    hasta: '2026-10-03'
  })
  assert.equal(parametros.get('productoId'), '12')
  const fechaDesde = new Date(parametros.get('desde'))
  const fechaHasta = new Date(parametros.get('hasta'))
  assert.deepEqual([fechaDesde.getFullYear(), fechaDesde.getMonth() + 1, fechaDesde.getDate()], [2026, 10, 1])
  assert.deepEqual([fechaHasta.getFullYear(), fechaHasta.getMonth() + 1, fechaHasta.getDate()], [2026, 10, 3])
  assert.ok(Date.parse(parametros.get('hasta')) > Date.parse(parametros.get('desde')))
  assert.deepEqual([...crearParametrosMovimientos({})], [])
})
