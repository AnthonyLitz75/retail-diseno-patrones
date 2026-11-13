import test from 'node:test'
import assert from 'node:assert/strict'
import { crearIndicadorCarga } from '../../src/utilidades/indicador-carga.js'

/** Indicador con reloj manual: ejecutar() dispara el temporizador pendiente. */
function escenario() {
  let oyente = null
  let programado = null
  const raiz = { atributos: {}, setAttribute (k, v) { this.atributos[k] = v }, removeAttribute (k) { delete this.atributos[k] } }
  const indicador = crearIndicadorCarga({
    suscribir: (fn) => { oyente = fn; return () => { oyente = null } },
    elemento: { hidden: true },
    raizOcupada: raiz,
    programar: (fn) => { programado = fn; return 1 },
    cancelarProgramado: () => { programado = null }
  })
  return {
    indicador,
    raiz,
    emitir: (tipo, segundoPlano = false) => oyente?.({ tipo, url: '/api/x', segundoPlano }),
    vencerTemporizador: () => { const fn = programado; programado = null; fn?.() },
    hayTemporizador: () => programado !== null
  }
}

test('una petición rápida no muestra el indicador (sin parpadeo)', () => {
  const e = escenario()
  e.emitir('inicio')
  e.emitir('fin')
  assert.equal(e.hayTemporizador(), false, 'Se canceló antes de mostrarse')
  assert.equal(e.indicador.visible(), false)
})

test('una petición lenta lo muestra con aria-busy hasta que terminan todas', () => {
  const e = escenario()
  e.emitir('inicio')
  e.emitir('inicio')
  e.vencerTemporizador()
  assert.equal(e.indicador.visible(), true)
  assert.equal(e.raiz.atributos['aria-busy'], 'true')
  e.emitir('fin')
  assert.equal(e.indicador.visible(), true, 'Aún queda una petición')
  e.emitir('fin')
  assert.equal(e.indicador.visible(), false)
  assert.equal('aria-busy' in e.raiz.atributos, false)
})

test('el sondeo en segundo plano no cuenta y un fin de más no deja el contador negativo', () => {
  const e = escenario()
  e.emitir('inicio', true)
  assert.equal(e.indicador.pendientes(), 0)
  assert.equal(e.hayTemporizador(), false)
  e.emitir('fin')
  assert.equal(e.indicador.pendientes(), 0)
})

test('detener cancela la suscripción y oculta', () => {
  const e = escenario()
  e.emitir('inicio')
  e.vencerTemporizador()
  e.indicador.detener()
  assert.equal(e.indicador.visible(), false)
  e.emitir('inicio')
  assert.equal(e.indicador.pendientes(), 1, 'Ya no recibe eventos')
})
