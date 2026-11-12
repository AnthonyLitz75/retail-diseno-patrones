import test from 'node:test'
import assert from 'node:assert/strict'
import { esRutaProtegida, evaluarAcceso } from '../src/router/guardas.js'

test('las rutas del catálogo son públicas para todos', () => {
  for (const tipo of ['inicio', 'catalogo', 'categoria', 'subcategoria', 'producto', 'buscar', '404']) {
    assert.deepEqual(evaluarAcceso(tipo, null), { permitido: true }, tipo)
    assert.equal(esRutaProtegida(tipo), false, tipo)
  }
})

test('#/pedidos: invitado va al login; roles con pedidos entran', () => {
  const invitado = evaluarAcceso('pedidos', null)
  assert.equal(invitado.permitido, false)
  assert.equal(invitado.destino, 'login')
  for (const rol of ['CLIENTE', 'VENDEDOR', 'ALMACEN', 'ADMIN']) {
    assert.deepEqual(evaluarAcceso('pedidos', rol), { permitido: true }, rol)
  }
})

test('#/pedidos con un rol sin esa vista (SOPORTE) vuelve a la tienda con mensaje', () => {
  const soporte = evaluarAcceso('pedidos', 'SOPORTE')
  assert.equal(soporte.permitido, false)
  assert.equal(soporte.destino, 'tienda')
  assert.match(soporte.mensaje, /no tiene acceso/)
})

test('un tipo con nombre de propiedad heredada no se confunde con una ruta protegida', () => {
  assert.equal(esRutaProtegida('toString'), false)
  assert.deepEqual(evaluarAcceso('constructor', null), { permitido: true })
})
