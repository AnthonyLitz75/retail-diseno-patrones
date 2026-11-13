import test from 'node:test'
import assert from 'node:assert/strict'
import { accionDevolucion, accionesReclamo } from '../../src/soporte/soporte-vista.js'

test('reclamo: abierto se toma; en atención solo lo atiende su responsable', () => {
  assert.deepEqual(accionesReclamo({ estado: 'ABIERTO' }, 7), ['tomar'])
  assert.deepEqual(accionesReclamo({ estado: 'EN_ATENCION', soporteId: 7 }, 7), ['responder', 'escalar'])
  assert.deepEqual(accionesReclamo({ estado: 'EN_ATENCION', soporteId: 8 }, 7), ['otroAgente'])
  assert.deepEqual(accionesReclamo({ estado: 'ESCALADO', soporteId: 7 }, 7), [], 'Lo resuelve el administrador')
  assert.deepEqual(accionesReclamo({ estado: 'RESUELTO', soporteId: 7 }, 7), [])
})

test('devolución: solicitada se decide, aprobada se recibe, el resto es solo lectura', () => {
  assert.equal(accionDevolucion({ estado: 'SOLICITADA' }), 'decidir')
  assert.equal(accionDevolucion({ estado: 'APROBADA' }), 'recibir')
  assert.equal(accionDevolucion({ estado: 'RECHAZADA' }), null)
  assert.equal(accionDevolucion({ estado: 'CERRADA' }), null)
})

test('reasignación: solo agentes SOPORTE activos, por nombre', async () => {
  const { agentesDisponibles } = await import('../../src/administracion/incidencias-vista.js')
  const cuentas = [
    { idUsuario: 1, nombre: 'Zoe', rol: 'SOPORTE', activo: true },
    { idUsuario: 2, nombre: 'Ana', rol: 'SOPORTE', activo: true },
    { idUsuario: 3, nombre: 'Beto', rol: 'SOPORTE', activo: false },
    { idUsuario: 4, nombre: 'Caro', rol: 'VENDEDOR', activo: true }
  ]
  assert.deepEqual(agentesDisponibles(cuentas).map(a => a.idUsuario), [2, 1])
  assert.deepEqual(agentesDisponibles(null), [])
})
