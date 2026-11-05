import test from 'node:test'
import assert from 'node:assert/strict'
import {
  obtenerFavoritos,
  esFavorito,
  alternarFavorito
} from '../src/catalogo/favoritos.js'

function configurarMockStorage() {
  let store = {}
  globalThis.window = {
    localStorage: {
      getItem: (key) => store[key] || null,
      setItem: (key, val) => { store[key] = String(val) },
      removeItem: (key) => { delete store[key] },
      clear: () => { store = {} }
    }
  }
}

test('favoritos maneja la lista de deseos en localStorage correctamente', () => {
  configurarMockStorage()

  assert.deepEqual(obtenerFavoritos(), [])
  assert.equal(esFavorito(10), false)

  // Agregar producto 10
  const r1 = alternarFavorito(10)
  assert.equal(r1.activo, true)
  assert.equal(r1.total, 1)
  assert.equal(esFavorito(10), true)

  // Agregar producto 20
  const r2 = alternarFavorito(20)
  assert.equal(r2.activo, true)
  assert.equal(r2.total, 2)
  assert.deepEqual(obtenerFavoritos(), [10, 20])

  // Remover producto 10
  const r3 = alternarFavorito(10)
  assert.equal(r3.activo, false)
  assert.equal(r3.total, 1)
  assert.equal(esFavorito(10), false)
  assert.deepEqual(obtenerFavoritos(), [20])
})
