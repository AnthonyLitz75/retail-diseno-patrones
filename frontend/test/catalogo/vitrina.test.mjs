import test from 'node:test'
import assert from 'node:assert/strict'
import { distribuirProductosVitrina, LIMITES_VITRINA } from '../../src/catalogo/vistas/vitrina.js'

test('distribuirProductosVitrina tolera colecciones vacías o no válidas', () => {
  const vacio1 = distribuirProductosVitrina(null)
  assert.equal(vacio1.totalEnVitrina, 0)
  assert.deepEqual(vacio1.destacados, [])
  assert.deepEqual(vacio1.nuevos, [])
  assert.deepEqual(vacio1.ofertas, [])
  assert.deepEqual(vacio1.componentes, [])

  const vacio2 = distribuirProductosVitrina([])
  assert.equal(vacio2.totalEnVitrina, 0)
})

test('distribuirProductosVitrina descarta productos con stock <= 0 (RF-04)', () => {
  const listaConAgotados = [
    { id: 1, nombre: 'GPU RTX 4070', stock: 0, destacado: true },
    { id: 2, nombre: 'CPU Ryzen 7', stock: -1, nuevo: true },
    { id: 3, nombre: 'Mouse Gamer', stock: 5, destacado: true },
    { id: 4, nombre: 'Teclado RGB', stock: 0, precio: 100, precioAnterior: 150 },
    { id: 5, nombre: 'SSD NVMe 1TB', stock: 8, categoria: 'Componentes para PC' }
  ]

  const vitrina = distribuirProductosVitrina(listaConAgotados)
  const todosLosIds = [
    ...vitrina.destacados.map((p) => p.id),
    ...vitrina.nuevos.map((p) => p.id),
    ...vitrina.ofertas.map((p) => p.id),
    ...vitrina.componentes.map((p) => p.id)
  ]

  assert.ok(!todosLosIds.includes(1), 'No debe incluir producto con stock 0')
  assert.ok(!todosLosIds.includes(2), 'No debe incluir producto con stock negativo')
  assert.ok(!todosLosIds.includes(4), 'No debe incluir oferta agotada')
  assert.ok(todosLosIds.includes(3), 'Debe incluir producto con stock > 0')
  assert.ok(todosLosIds.includes(5), 'Debe incluir producto con stock > 0')
})

test('distribuirProductosVitrina garantiza cero productos repetidos entre secciones (RF-04)', () => {
  // Producto que cumple criterios de varias secciones a la vez (es nuevo, tiene descuento y es componente)
  const multiCriterio = [
    { id: 101, nombre: 'Radeon RX 7600', stock: 4, nuevo: true, precio: 1149, precioAnterior: 1355, categoria: 'Componentes para PC', destacado: true },
    { id: 102, nombre: 'Teclado Fizz', stock: 10, nuevo: true, precio: 169, precioAnterior: 219, categoria: 'Teclados' },
    { id: 103, nombre: 'Mouse Griffin', stock: 15, precio: 89, precioAnterior: 119, categoria: 'Mouse' },
    { id: 104, nombre: 'SSD Kingston 1TB', stock: 12, categoria: 'Componentes para PC' }
  ]

  const vitrina = distribuirProductosVitrina(multiCriterio)
  const setIds = new Set()
  let duplicados = 0

  const todasLasListas = [
    ...vitrina.destacados,
    ...vitrina.nuevos,
    ...vitrina.ofertas,
    ...vitrina.componentes
  ]

  for (const p of todasLasListas) {
    if (setIds.has(p.id)) duplicados++
    setIds.add(p.id)
  }

  assert.equal(duplicados, 0, 'No debe haber ningún producto repetido entre secciones')
})

test('distribuirProductosVitrina respeta los límites máximos por sección (RF-04)', () => {
  // Crear 40 productos variados
  const catalogo40 = Array.from({ length: 40 }, (_, i) => ({
    id: i + 1,
    nombre: `Hardware ${i + 1}`,
    stock: 10,
    destacado: i < 15,
    nuevo: i >= 10 && i < 25,
    precio: 100,
    precioAnterior: i >= 20 ? 150 : null,
    categoria: 'Componentes para PC'
  }))

  const vitrina = distribuirProductosVitrina(catalogo40)

  assert.ok(vitrina.destacados.length <= LIMITES_VITRINA.MAX_DESTACADOS)
  assert.ok(vitrina.nuevos.length <= LIMITES_VITRINA.MAX_NUEVOS)
  assert.ok(vitrina.ofertas.length <= LIMITES_VITRINA.MAX_OFERTAS)
  assert.ok(vitrina.componentes.length <= LIMITES_VITRINA.MAX_COMPONENTES)

  // Entre 12 y 28 tarjetas en total en vitrina
  assert.ok(vitrina.totalEnVitrina >= 12, `Debe haber al menos 12 productos en vitrina (hay ${vitrina.totalEnVitrina})`)
  assert.ok(vitrina.totalEnVitrina <= 28, `Debe haber a lo sumo 28 productos en vitrina (hay ${vitrina.totalEnVitrina})`)
})
