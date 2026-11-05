import test from 'node:test'
import assert from 'node:assert/strict'
import { obtenerBadgeStock } from '../src/utilidades/stock.js'

test('obtenerBadgeStock clasifica disponibilidad según umbrales de negocio', () => {
  // Agotado: 0 o menor
  const agotadoCero = obtenerBadgeStock(0)
  assert.equal(agotadoCero.texto, 'Agotado')
  assert.equal(agotadoCero.estado, 'agotado')
  assert.equal(agotadoCero.disponible, false)
  assert.match(agotadoCero.clase, /bg-danger-subtle/)

  const agotadoNegativo = obtenerBadgeStock(-3)
  assert.equal(agotadoNegativo.texto, 'Agotado')
  assert.equal(agotadoNegativo.disponible, false)

  const agotadoNulo = obtenerBadgeStock(null)
  assert.equal(agotadoNulo.texto, 'Agotado')
  assert.equal(agotadoNulo.disponible, false)

  // Escaso: 1 a 5 unidades
  const ultimaUnidad = obtenerBadgeStock(1)
  assert.equal(ultimaUnidad.texto, 'Última unidad')
  assert.equal(ultimaUnidad.estado, 'escaso')
  assert.equal(ultimaUnidad.disponible, true)
  assert.match(ultimaUnidad.clase, /bg-warning-subtle/)

  const ultimasTres = obtenerBadgeStock(3)
  assert.equal(ultimasTres.texto, 'Últimas 3 unidades')
  assert.equal(ultimasTres.estado, 'escaso')
  assert.equal(ultimasTres.disponible, true)

  const ultimasCinco = obtenerBadgeStock(5)
  assert.equal(ultimasCinco.texto, 'Últimas 5 unidades')
  assert.equal(ultimasCinco.estado, 'escaso')
  assert.equal(ultimasCinco.disponible, true)

  // Disponible / En stock: mayor a 5 unidades
  const enStockSeis = obtenerBadgeStock(6)
  assert.equal(enStockSeis.texto, 'En stock')
  assert.equal(enStockSeis.estado, 'disponible')
  assert.equal(enStockSeis.disponible, true)
  assert.match(enStockSeis.clase, /bg-success-subtle/)

  const enStockCincuenta = obtenerBadgeStock(50)
  assert.equal(enStockCincuenta.texto, 'En stock')
  assert.equal(enStockCincuenta.disponible, true)
  assert.match(enStockCincuenta.clase, /bg-success-subtle/)
})

