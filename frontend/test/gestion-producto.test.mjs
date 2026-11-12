import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cambiarEstadoProducto,
  categoriasAsignables,
  editarFichaProducto,
  listarProductosGestion,
  prepararFicha
} from '../src/catalogo/gestion-producto.js'

function grabadora(respuesta = {}) {
  const llamadas = []
  return {
    llamadas,
    apiRequest: async (url, opciones) => {
      llamadas.push({ url, opciones })
      return { json: async () => respuesta }
    }
  }
}

test('prepara la ficha: recorta textos y convierte vacíos en null', () => {
  assert.deepEqual(prepararFicha({ nombre: ' Mouse ', marca: '  ', descripcion: '', imagen: ' /img/m.webp ', categoria: 'Mouse' }), {
    nombre: 'Mouse', marca: null, descripcion: null, imagen: '/img/m.webp', categoria: 'Mouse'
  })
})

test('rechaza nombre o categoría vacíos, textos largos e imágenes que no son http(s) ni ruta', () => {
  assert.throws(() => prepararFicha({ nombre: ' ', categoria: 'Mouse' }), /nombre es obligatorio/)
  assert.throws(() => prepararFicha({ nombre: 'Mouse', categoria: '' }), /categoría/)
  assert.throws(() => prepararFicha({ nombre: 'x'.repeat(121), categoria: 'Mouse' }), /120/)
  for (const imagen of ['javascript:alert(1)', 'data:image/png;base64,AA', 'https://x.pe/a b.png', 'img/sin-barra.png']) {
    assert.throws(() => prepararFicha({ nombre: 'Mouse', categoria: 'Mouse', imagen }), /URL http/, imagen)
  }
  assert.equal(prepararFicha({ nombre: 'Mouse', categoria: 'Mouse', imagen: 'https://cdn.pe/m.webp' }).imagen, 'https://cdn.pe/m.webp')
})

test('edita con PUT y cambia el estado con PATCH; valida el id antes de llamar', async () => {
  const { apiRequest, llamadas } = grabadora({ id: 4 })
  await editarFichaProducto(apiRequest, 4, { nombre: 'Teclado', categoria: 'Teclados' })
  await cambiarEstadoProducto(apiRequest, '4', 0)
  await listarProductosGestion(apiRequest)
  assert.equal(llamadas[0].url, '/api/productos/4')
  assert.equal(llamadas[0].opciones.method, 'PUT')
  assert.equal(llamadas[0].opciones.json.nombre, 'Teclado')
  assert.deepEqual(llamadas[1], { url: '/api/productos/4/estado', opciones: { method: 'PATCH', json: { activo: false } } })
  assert.equal(llamadas[2].url, '/api/productos/gestion')
  await assert.rejects(cambiarEstadoProducto(apiRequest, 0, true), /no es válido/)
  assert.equal(llamadas.length, 3)
})

test('solo se ofrecen categorías activas, ordenadas', () => {
  assert.deepEqual(categoriasAsignables([
    { nombre: 'Teclados', activa: true }, { nombre: 'Audio', activa: false }, { nombre: 'Mouse' }
  ]), ['Mouse', 'Teclados'])
  assert.deepEqual(categoriasAsignables(null), [])
})
