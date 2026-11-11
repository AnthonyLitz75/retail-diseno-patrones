import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deshacerUltimaAccion,
  mensajeErrorDeshacer,
  pintarEstadoConDeshacer
} from '../src/carrito/deshacer-carrito.js'

// Spec 005, T018 (US4-US6): botón Deshacer del carrito.

function crearElementoFalso(tag = 'div') {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    textContent: '',
    type: '',
    children: [],
    atributos: {},
    oyentes: {},
    replaceChildren(...nodos) { this.children = nodos },
    append(...nodos) { this.children.push(...nodos) },
    setAttribute(k, v) { this.atributos[k] = String(v) },
    addEventListener(evento, cb) { this.oyentes[evento] = cb }
  }
}

const documentoFalso = { createElement: (tag) => crearElementoFalso(tag) }

test('deshacerUltimaAccion envía POST a /api/carrito/deshacer y devuelve el carrito', async () => {
  const llamadas = []
  const request = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones })
    return { json: async () => ({ idCarrito: 1, productos: [], total: 0, revision: 8 }) }
  }

  const carrito = await deshacerUltimaAccion(request)

  assert.deepEqual(llamadas, [{ ruta: '/api/carrito/deshacer', opciones: { method: 'POST' } }])
  assert.equal(carrito.revision, 8)
})

test('mensajeErrorDeshacer explica el historial vacío (400) y el carrito desactualizado (409)', () => {
  assert.equal(mensajeErrorDeshacer({ status: 400, message: 'No hay acciones para deshacer' }),
    'No hay acciones para deshacer.')
  assert.equal(mensajeErrorDeshacer({ status: 409, message: 'El carrito cambió; actualiza e intenta de nuevo' }),
    'El carrito cambió; actualiza e intenta de nuevo')
  assert.equal(mensajeErrorDeshacer({ status: 409, message: '' }),
    'El carrito cambió en otra pestaña o dispositivo; se actualizó la vista.')
  assert.equal(mensajeErrorDeshacer({ status: 500, message: 'x' }), 'No se pudo deshacer la acción.')
  assert.equal(mensajeErrorDeshacer(null), 'No se pudo deshacer la acción.')
})

test('pintarEstadoConDeshacer muestra el mensaje y un botón accesible que ejecuta la acción', () => {
  const estado = crearElementoFalso('p')
  let pulsado = 0

  pintarEstadoConDeshacer(estado, 'Producto quitado del carrito.', () => { pulsado++ }, documentoFalso)

  assert.match(estado.className, /alert-success/)
  const [texto, boton] = estado.children
  assert.equal(texto.textContent, 'Producto quitado del carrito.')
  assert.equal(boton.tagName, 'BUTTON')
  assert.equal(boton.type, 'button')
  assert.equal(boton.textContent, 'Deshacer')
  assert.equal(boton.atributos['aria-label'], 'Deshacer la última acción del carrito')
  boton.oyentes.click()
  assert.equal(pulsado, 1)
})

test('pintarEstadoConDeshacer tolera un contenedor ausente', () => {
  assert.doesNotThrow(() => pintarEstadoConDeshacer(null, 'x', () => {}, documentoFalso))
})
