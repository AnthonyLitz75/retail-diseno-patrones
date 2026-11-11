import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cambiarEstadoCategoria, cambiarRol, crearParametrosReporte, crearCategoria,
  actualizarCategoria, desactivarCuenta, listarCategoriasAdmin, listarCuentas,
  registrarPersonal, cargarResumenAdmin, solicitarCsv, tarjetasResumen
} from '../src/administracion/administracion.js'

test('usa las rutas administrativas para usuarios, categorías y reportes', async () => {
  const llamadas = []
  const request = async (url, opciones = {}) => {
    llamadas.push({ url, opciones })
    return { json: async () => [] }
  }
  await listarCuentas(request)
  await registrarPersonal(request, { nombre: 'Vendedora', correo: 'v@example.com', clave: '12345678', rol: 'VENDEDOR' })
  await cambiarRol(request, 5, 'ALMACEN')
  await desactivarCuenta(request, 5)
  await listarCategoriasAdmin(request)
  await crearCategoria(request, 'Audio')
  await actualizarCategoria(request, 2, 'Audio y video')
  await cambiarEstadoCategoria(request, 2, false)
  await cargarResumenAdmin(request, 'desde=2026-10-01')
  await solicitarCsv(request, 'ventas', 'hasta=2026-10-31')
  await solicitarCsv(request, 'movimientos', 'desde=2026-10-01')
  await solicitarCsv(request, 'inventario', 'desde=2026-10-01')
  assert.deepEqual(llamadas.map(({ url }) => url), [
    '/api/admin/usuarios', '/api/admin/usuarios', '/api/admin/usuarios/5/rol',
    '/api/admin/usuarios/5/desactivar', '/api/admin/categorias', '/api/admin/categorias',
    '/api/admin/categorias/2', '/api/admin/categorias/2/estado',
    '/api/admin/reportes/resumen?desde=2026-10-01', '/api/admin/reportes/ventas.csv?hasta=2026-10-31',
    '/api/admin/reportes/movimientos.csv?desde=2026-10-01', '/api/admin/reportes/inventario.csv'
  ])
  assert.deepEqual(llamadas[2].opciones.json, { rol: 'ALMACEN' })
  assert.deepEqual(llamadas[7].opciones.json, { activa: false })
})

test('arma el rango de reporte con fechas yyyy-MM-dd (contrato 007) y valida el orden', () => {
  assert.equal(crearParametrosReporte('2026-10-01', '2026-10-16'), 'desde=2026-10-01&hasta=2026-10-16')
  assert.equal(crearParametrosReporte('', ''), '')
  assert.throws(() => crearParametrosReporte('2026-10-17', '2026-10-16'), /posterior/)
})

test('solicitarCsv rechaza reportes desconocidos sin llamar a la API', () => {
  let llamadas = 0
  assert.throws(() => solicitarCsv(() => { llamadas += 1 }, 'usuarios', ''), /desconocido/)
  assert.equal(llamadas, 0)
})

test('tarjetas del panel: ventas netas, pedidos por estado, escalados y valores por defecto', () => {
  const tarjetas = Object.fromEntries(tarjetasResumen({
    ventasNetas: 35.5,
    pedidosVendidos: 2,
    pedidosPorEstado: { EN_PREPARACION: 1, CANCELADO: 1 },
    escalados: 3,
    movimientos: {}
  }))
  assert.match(tarjetas['Ventas netas (sin cancelados)'], /^S\/\s35\.50$/)
  assert.match(tarjetasResumen({ valorInventario: 80687 })[6][1], /80,687\.00$/, 'Separador de miles')
  assert.equal(tarjetas['Pedidos por estado'], 'EN PREPARACION: 1 · CANCELADO: 1')
  assert.equal(tarjetas['Reclamos escalados abiertos'], 3)
  assert.equal(tarjetas.Movimientos, 'Sin movimientos')
  assert.match(tarjetas['Valor del inventario'], /^S\/\s0\.00$/)
})
