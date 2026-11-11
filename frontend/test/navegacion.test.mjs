import test from 'node:test'
import assert from 'node:assert/strict'
import {
  determinarVistasPorRol,
  obtenerVistaPorDefecto,
  obtenerEtiquetaPestaña,
  esVistaPermitida
} from '../src/utilidades/navegacion.js'

test('determinarVistasPorRol asigna vistas específicas según privilegios del rol', () => {
  assert.deepEqual(determinarVistasPorRol('ADMIN'), ['administracion', 'tienda', 'pedidos', 'inventario'])
  assert.deepEqual(determinarVistasPorRol('ALMACEN'), ['pedidos', 'inventario', 'tienda'])
  assert.deepEqual(determinarVistasPorRol('VENDEDOR'), ['tienda', 'consultas', 'pedidos', 'inventario'])
  assert.deepEqual(determinarVistasPorRol('CLIENTE'), ['tienda', 'pedidos'])
  assert.deepEqual(determinarVistasPorRol('SOPORTE'), ['soporte', 'tienda'])
  assert.deepEqual(determinarVistasPorRol(null), ['tienda'])
  assert.deepEqual(determinarVistasPorRol('DESCONOCIDO'), ['tienda'])
})

test('obtenerVistaPorDefecto selecciona la vista más relevante al iniciar sesión', () => {
  assert.equal(obtenerVistaPorDefecto('ADMIN'), 'administracion')
  assert.equal(obtenerVistaPorDefecto('ALMACEN'), 'pedidos')
  assert.equal(obtenerVistaPorDefecto('SOPORTE'), 'soporte')
  assert.equal(obtenerVistaPorDefecto('VENDEDOR'), 'tienda')
  assert.equal(obtenerVistaPorDefecto('CLIENTE'), 'tienda')
  assert.equal(obtenerVistaPorDefecto(null), 'tienda')
})

test('obtenerEtiquetaPestaña adapta el texto según el rol del usuario', () => {
  assert.equal(obtenerEtiquetaPestaña('pedidos', 'CLIENTE'), 'Mis compras')
  assert.equal(obtenerEtiquetaPestaña('pedidos', 'ADMIN'), 'Gestión de pedidos')
  assert.equal(obtenerEtiquetaPestaña('pedidos', 'ALMACEN'), 'Gestión de pedidos')
  assert.equal(obtenerEtiquetaPestaña('tienda', 'ALMACEN'), 'Catálogo')
  assert.equal(obtenerEtiquetaPestaña('tienda', 'CLIENTE'), 'Tienda')
  assert.equal(obtenerEtiquetaPestaña('inventario', 'ADMIN'), 'Inventario y kardex')
  assert.equal(obtenerEtiquetaPestaña('administracion', 'ADMIN'), 'Administración')
  assert.equal(obtenerEtiquetaPestaña('consultas', 'VENDEDOR'), 'Consultas de clientes')
  assert.equal(obtenerEtiquetaPestaña('soporte', 'SOPORTE'), 'Atención al cliente')
})

test('esVistaPermitida valida correctamente el acceso a cada módulo', () => {
  assert.equal(esVistaPermitida('administracion', 'ADMIN'), true)
  assert.equal(esVistaPermitida('administracion', 'CLIENTE'), false)
  assert.equal(esVistaPermitida('consultas', 'VENDEDOR'), true)
  assert.equal(esVistaPermitida('consultas', 'ALMACEN'), false)
  assert.equal(esVistaPermitida('inventario', 'ALMACEN'), true)
  assert.equal(esVistaPermitida('tienda', null), true)
  assert.equal(esVistaPermitida('pedidos', null), false)
})

