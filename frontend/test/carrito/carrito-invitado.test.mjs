import test from 'node:test'
import assert from 'node:assert/strict'
import {
  obtenerCarritoInvitado,
  agregarProductoInvitado,
  actualizarCantidadInvitado,
  quitarProductoInvitado,
  limpiarCarritoInvitado,
  hayCarritoInvitado,
  sincronizarCarritoInvitadoConBackend
} from '../../src/carrito/carrito-invitado.js'

// Mock de localStorage para el entorno Node.js
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

test('carrito-invitado gestiona adición, subtotales y acumulación de productos', () => {
  configurarMockStorage()
  limpiarCarritoInvitado()

  assert.equal(hayCarritoInvitado(), false)

  // Agregar mouse
  const c1 = agregarProductoInvitado({ id: 1, nombre: 'Mouse Gamer', precio: 50.0, stock: 10 }, 1)
  assert.equal(c1.productos.length, 1)
  assert.equal(c1.total, 50.0)
  assert.equal(c1.productos[0].cantidad, 1)
  assert.equal(c1.productos[0].subtotal, 50.0)
  assert.equal(hayCarritoInvitado(), true)

  // Agregar 2 más del mismo producto
  const c2 = agregarProductoInvitado({ id: 1, nombre: 'Mouse Gamer', precio: 50.0, stock: 10 }, 2)
  assert.equal(c2.productos.length, 1)
  assert.equal(c2.productos[0].cantidad, 3)
  assert.equal(c2.productos[0].subtotal, 150.0)
  assert.equal(c2.total, 150.0)

  // Agregar teclado
  const c3 = agregarProductoInvitado({ id: 2, nombre: 'Teclado Mecánico', precio: 120.0, stock: 5 }, 1)
  assert.equal(c3.productos.length, 2)
  assert.equal(c3.total, 270.0)
})

test('carrito-invitado respeta el límite de stock disponible', () => {
  configurarMockStorage()
  limpiarCarritoInvitado()

  // Stock máximo 3
  agregarProductoInvitado({ id: 5, nombre: 'Webcam Pro', precio: 80.0, stock: 3 }, 5)
  const carrito = obtenerCarritoInvitado()
  assert.equal(carrito.productos[0].cantidad, 3)
  assert.equal(carrito.productos[0].subtotal, 240.0)
})

test('actualizarCantidadInvitado modifica y elimina ítems cuando la cantidad es <= 0', () => {
  configurarMockStorage()
  limpiarCarritoInvitado()

  agregarProductoInvitado({ id: 10, nombre: 'Cargador Rápido', precio: 30.0, stock: 15 }, 2)
  let c = obtenerCarritoInvitado()
  assert.equal(c.productos[0].cantidad, 2)

  // Actualizar a 4
  c = actualizarCantidadInvitado(10, 4)
  assert.equal(c.productos[0].cantidad, 4)
  assert.equal(c.productos[0].subtotal, 120.0)
  assert.equal(c.total, 120.0)

  // Actualizar a 0 (debe remover)
  c = actualizarCantidadInvitado(10, 0)
  assert.equal(c.productos.length, 0)
  assert.equal(c.total, 0)
  assert.equal(hayCarritoInvitado(), false)
})

test('quitarProductoInvitado elimina el producto específico', () => {
  configurarMockStorage()
  limpiarCarritoInvitado()

  agregarProductoInvitado({ id: 1, nombre: 'Mouse', precio: 20.0, stock: 5 }, 1)
  agregarProductoInvitado({ id: 2, nombre: 'Teclado', precio: 80.0, stock: 5 }, 1)

  const c = quitarProductoInvitado(1)
  assert.equal(c.productos.length, 1)
  assert.equal(c.productos[0].productoId, 2)
  assert.equal(c.total, 80.0)
})

test('sincronizarCarritoInvitadoConBackend transfiere ítems al backend y limpia el almacenamiento local', async () => {
  configurarMockStorage()
  limpiarCarritoInvitado()

  agregarProductoInvitado({ id: 1, nombre: 'Mouse', precio: 20.0, stock: 5 }, 2)
  agregarProductoInvitado({ id: 2, nombre: 'Teclado', precio: 80.0, stock: 5 }, 1)

  const llamadas = []
  const mockApiRequest = async (url, opciones) => {
    llamadas.push({ url, opciones })
    return { ok: true }
  }

  const sincronizados = await sincronizarCarritoInvitadoConBackend(mockApiRequest)
  assert.equal(sincronizados, 2)
  assert.equal(llamadas.length, 2)
  assert.equal(llamadas[0].opciones.json.productoId, 1)
  assert.equal(llamadas[0].opciones.json.cantidad, 2)
  assert.equal(llamadas[1].opciones.json.productoId, 2)
  assert.equal(llamadas[1].opciones.json.cantidad, 1)

  // Debe haberse limpiado el carrito de invitado
  assert.equal(hayCarritoInvitado(), false)
})
