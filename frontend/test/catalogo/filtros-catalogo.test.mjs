import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aplicarFiltrosYOrden,
  CRITERIOS_ORDEN,
  obtenerChipsFiltrosActivos,
  paginarProductos,
} from '../../src/catalogo/componentes/filtros-catalogo.js'

const productosMuestra = [
  { id: 1, nombre: 'Teclado Mecánico', precio: 150.0, stock: 10 },
  { id: 2, nombre: 'Mouse Óptico', precio: 50.0, stock: 0 },
  { id: 3, nombre: 'Webcam Full HD', precio: 220.0, stock: 4 },
  { id: 4, nombre: 'Auriculares Inalámbricos', precio: 99.9, stock: -1 },
  { id: 5, nombre: 'Cargador USB-C', precio: 35.5, stock: 15 }
]

test('aplicarFiltrosYOrden tolera entradas nulas o no array', () => {
  assert.deepEqual(aplicarFiltrosYOrden(null), [])
  assert.deepEqual(aplicarFiltrosYOrden(undefined), [])
  assert.deepEqual(aplicarFiltrosYOrden('invalido'), [])
})

test('aplicarFiltrosYOrden no muta el array original', () => {
  const copiaOriginal = [...productosMuestra]
  const resultado = aplicarFiltrosYOrden(productosMuestra, {
    criterioOrden: CRITERIOS_ORDEN.PRECIO_ASC,
    soloEnStock: true
  })

  assert.deepEqual(productosMuestra, copiaOriginal)
  assert.notEqual(resultado, productosMuestra)
})

test('aplicarFiltrosYOrden con soloEnStock filtra productos agotados o con stock no positivo', () => {
  const disponibles = aplicarFiltrosYOrden(productosMuestra, { soloEnStock: true })
  assert.equal(disponibles.length, 3)
  assert.ok(disponibles.every((p) => p.stock > 0))
  assert.deepEqual(
    disponibles.map((p) => p.id),
    [1, 3, 5]
  )
})

test('aplicarFiltrosYOrden ordena por precio ascendente y descendente', () => {
  const precioAsc = aplicarFiltrosYOrden(productosMuestra, {
    criterioOrden: CRITERIOS_ORDEN.PRECIO_ASC
  })
  assert.deepEqual(
    precioAsc.map((p) => p.precio),
    [35.5, 50.0, 99.9, 150.0, 220.0]
  )

  const precioDesc = aplicarFiltrosYOrden(productosMuestra, {
    criterioOrden: CRITERIOS_ORDEN.PRECIO_DESC
  })
  assert.deepEqual(
    precioDesc.map((p) => p.precio),
    [220.0, 150.0, 99.9, 50.0, 35.5]
  )
})

test('aplicarFiltrosYOrden ordena alfabéticamente por nombre A-Z y Z-A', () => {
  const nombreAsc = aplicarFiltrosYOrden(productosMuestra, {
    criterioOrden: CRITERIOS_ORDEN.NOMBRE_ASC
  })
  assert.deepEqual(
    nombreAsc.map((p) => p.nombre),
    [
      'Auriculares Inalámbricos',
      'Cargador USB-C',
      'Mouse Óptico',
      'Teclado Mecánico',
      'Webcam Full HD'
    ]
  )

  const nombreDesc = aplicarFiltrosYOrden(productosMuestra, {
    criterioOrden: CRITERIOS_ORDEN.NOMBRE_DESC
  })
  assert.deepEqual(
    nombreDesc.map((p) => p.nombre),
    [
      'Webcam Full HD',
      'Teclado Mecánico',
      'Mouse Óptico',
      'Cargador USB-C',
      'Auriculares Inalámbricos'
    ]
  )
})

test('aplicarFiltrosYOrden combina filtro de stock con ordenamiento', () => {
  const enStockBaratos = aplicarFiltrosYOrden(productosMuestra, {
    criterioOrden: CRITERIOS_ORDEN.PRECIO_ASC,
    soloEnStock: true
  })

  assert.equal(enStockBaratos.length, 3)
  assert.deepEqual(
    enStockBaratos.map((p) => p.id),
    [5, 1, 3] // Cargador (35.5), Teclado (150.0), Webcam (220.0)
  )
})



test('obtenerChipsFiltrosActivos genera etiquetas legibles y detecta solo filtros presentes', () => {
  // Sin filtros
  assert.deepEqual(obtenerChipsFiltrosActivos(), [])
  assert.deepEqual(obtenerChipsFiltrosActivos({ busqueda: '   ' }), [])

  // Con búsqueda y categoría
  const chips1 = obtenerChipsFiltrosActivos({
    busqueda: 'teclado',
    categoria: 'Periféricos'
  })
  assert.equal(chips1.length, 2)
  assert.deepEqual(chips1[0], { tipo: 'busqueda', label: 'Búsqueda: "teclado"' })
  assert.deepEqual(chips1[1], { tipo: 'categoria', label: 'Categoría: Periféricos' })

  // Con rango de precios y stock
  const chips2 = obtenerChipsFiltrosActivos({
    precioMin: 50,
    precioMax: 150.5,
    soloEnStock: true
  })
  assert.equal(chips2.length, 3)
  assert.deepEqual(chips2[0], { tipo: 'precioMin', label: 'Precio mín: S/ 50.00' })
  assert.deepEqual(chips2[1], { tipo: 'precioMax', label: 'Precio máx: S/ 150.50' })
  assert.deepEqual(chips2[2], { tipo: 'soloEnStock', label: 'Solo en stock' })
})

test('paginarProductos maneja colecciones vacías o no válidas', () => {
  const vacio1 = paginarProductos(null)
  assert.equal(vacio1.totalItems, 0)
  assert.equal(vacio1.totalPaginas, 0)
  assert.equal(vacio1.paginaActual, 1)
  assert.deepEqual(vacio1.items, [])
  assert.equal(vacio1.tieneAnterior, false)
  assert.equal(vacio1.tieneSiguiente, false)

  const vacio2 = paginarProductos([])
  assert.equal(vacio2.totalItems, 0)
  assert.equal(vacio2.totalPaginas, 0)
  assert.deepEqual(vacio2.items, [])
})

test('paginarProductos calcula páginas y límites para 12 productos por página (RF-03)', () => {
  const lista28 = Array.from({ length: 28 }, (_, i) => ({ id: i + 1, nombre: `Producto ${i + 1}` }))

  // Página 1 (debe contener 12 ítems del 1 al 12)
  const pag1 = paginarProductos(lista28, 1, 12)
  assert.equal(pag1.totalItems, 28)
  assert.equal(pag1.totalPaginas, 3)
  assert.equal(pag1.paginaActual, 1)
  assert.equal(pag1.items.length, 12)
  assert.equal(pag1.items[0].id, 1)
  assert.equal(pag1.items[11].id, 12)
  assert.equal(pag1.tieneAnterior, false)
  assert.equal(pag1.tieneSiguiente, true)
  assert.equal(pag1.indiceInicio, 1)
  assert.equal(pag1.indiceFin, 12)

  // Página 2 (debe contener 12 ítems del 13 al 24)
  const pag2 = paginarProductos(lista28, 2, 12)
  assert.equal(pag2.paginaActual, 2)
  assert.equal(pag2.items.length, 12)
  assert.equal(pag2.items[0].id, 13)
  assert.equal(pag2.items[11].id, 24)
  assert.equal(pag2.tieneAnterior, true)
  assert.equal(pag2.tieneSiguiente, true)
  assert.equal(pag2.indiceInicio, 13)
  assert.equal(pag2.indiceFin, 24)

  // Página 3 (debe contener los 4 ítems restantes del 25 al 28)
  const pag3 = paginarProductos(lista28, 3, 12)
  assert.equal(pag3.paginaActual, 3)
  assert.equal(pag3.items.length, 4)
  assert.equal(pag3.items[0].id, 25)
  assert.equal(pag3.items[3].id, 28)
  assert.equal(pag3.tieneAnterior, true)
  assert.equal(pag3.tieneSiguiente, false)
  assert.equal(pag3.indiceInicio, 25)
  assert.equal(pag3.indiceFin, 28)
})

test('paginarProductos normaliza números de página fuera de rango', () => {
  const lista10 = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }))

  // Menor a 1 se ajusta a 1
  const bajo = paginarProductos(lista10, -5, 12)
  assert.equal(bajo.paginaActual, 1)
  assert.equal(bajo.items.length, 10)
  assert.equal(bajo.totalPaginas, 1)

  // Mayor a totalPaginas se ajusta a la última página
  const alto = paginarProductos(lista10, 99, 12)
  assert.equal(alto.paginaActual, 1)
  assert.equal(alto.items.length, 10)
})
