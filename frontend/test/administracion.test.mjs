import test from 'node:test'
import assert from 'node:assert/strict'
import {
  cambiarEstadoCategoria, cambiarRol, crearParametrosReporte, crearCategoria,
  actualizarCategoria, desactivarCuenta, listarCategoriasAdmin, listarCuentas,
  registrarPersonal, cargarResumenAdmin, solicitarCsvVentas
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
  await solicitarCsvVentas(request, 'hasta=2026-10-31')
  assert.deepEqual(llamadas.map(({ url }) => url), [
    '/api/admin/usuarios', '/api/admin/usuarios', '/api/admin/usuarios/5/rol',
    '/api/admin/usuarios/5/desactivar', '/api/admin/categorias', '/api/admin/categorias',
    '/api/admin/categorias/2', '/api/admin/categorias/2/estado',
    '/api/admin/reportes/resumen?desde=2026-10-01', '/api/admin/reportes/ventas.csv?hasta=2026-10-31'
  ])
  assert.deepEqual(llamadas[2].opciones.json, { rol: 'ALMACEN' })
  assert.deepEqual(llamadas[7].opciones.json, { activa: false })
})

test('arma el rango de reporte para el día local completo y valida fechas', () => {
  assert.equal(crearParametrosReporte('2026-10-01', '2026-10-16'),
    'desde=2026-10-01T00%3A00%3A00-05%3A00&hasta=2026-10-16T23%3A59%3A59.999-05%3A00')
  assert.equal(crearParametrosReporte('', ''), '')
  assert.throws(() => crearParametrosReporte('2026-10-17', '2026-10-16'), /posterior/)
})
