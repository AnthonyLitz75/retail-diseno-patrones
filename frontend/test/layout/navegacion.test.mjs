import test from 'node:test'
import assert from 'node:assert/strict'
import {
  determinarVistasPorRol,
  obtenerVistaPorDefecto,
  obtenerEtiquetaPestaña,
  esVistaPermitida
} from '../../src/utilidades/navegacion.js'

test('determinarVistasPorRol: el cliente tiene sus vistas; el personal solo la tienda (T11)', () => {
  // T11: las vistas del personal se mudaron al panel (panel.html).
  for (const rol of ['ADMIN', 'ALMACEN', 'VENDEDOR', 'SOPORTE']) {
    assert.deepEqual(determinarVistasPorRol(rol), ['tienda'], rol)
  }
  assert.deepEqual(determinarVistasPorRol('CLIENTE'), ['tienda', 'pedidos', 'atencion'])
  assert.deepEqual(determinarVistasPorRol(null), ['tienda'])
  assert.deepEqual(determinarVistasPorRol('DESCONOCIDO'), ['tienda'])
})

test('obtenerVistaPorDefecto: en la tienda todos empiezan en la tienda (T11)', () => {
  assert.equal(obtenerVistaPorDefecto('ADMIN'), 'tienda')
  assert.equal(obtenerVistaPorDefecto('ALMACEN'), 'tienda')
  assert.equal(obtenerVistaPorDefecto('SOPORTE'), 'tienda')
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

test('esVistaPermitida valida correctamente el acceso a cada vista de la tienda (T11)', () => {
  // T11: ningún rol tiene en la tienda las vistas del personal.
  assert.equal(esVistaPermitida('administracion', 'ADMIN'), false)
  assert.equal(esVistaPermitida('administracion', 'CLIENTE'), false)
  assert.equal(esVistaPermitida('consultas', 'VENDEDOR'), false)
  assert.equal(esVistaPermitida('inventario', 'ALMACEN'), false)
  assert.equal(esVistaPermitida('tienda', 'ADMIN'), true)
  assert.equal(esVistaPermitida('atencion', 'CLIENTE'), true)
  assert.equal(esVistaPermitida('tienda', null), true)
  assert.equal(esVistaPermitida('pedidos', null), false)
})


test('obtenerVistaInicial respeta #/pedidos si el rol lo permite (spec 007, T003)', async () => {
  const { obtenerVistaInicial } = await import('../../src/utilidades/navegacion.js')
  assert.equal(obtenerVistaInicial('CLIENTE', '#/pedidos'), 'pedidos')
  // T11: el personal ya no tiene «pedidos» en la tienda; siempre arranca en la tienda.
  assert.equal(obtenerVistaInicial('ADMIN', '#/pedidos'), 'tienda')
  assert.equal(obtenerVistaInicial('SOPORTE', '#/pedidos'), 'tienda', 'Sin acceso: vista por defecto')
  assert.equal(obtenerVistaInicial('ADMIN', '#/'), 'tienda')
  assert.equal(obtenerVistaInicial('CLIENTE', '#/constructor'), 'tienda')
})
