import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inicializarCarrito,
  establecerUsuarioSesion,
  abrirCarrito,
  ocultarCarrito,
  mostrarCarrito
} from '../src/carrito/carrito.js'

// Entorno simulado de DOM mínimo para Node.js
class MockDOMElement {
  constructor(tag, id = '') {
    this.tagName = tag.toUpperCase()
    this.id = id
    this.className = ''
    this.textContent = ''
    this.innerHTML = ''
    this.children = []
    this.attributes = {}
    this.disabled = false
    this.value = ''
    this.style = {}
    this.eventListeners = {}
    this.classList = {
      _classes: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._classes.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._classes.delete(c)),
      contains: (c) => this.classList._classes.has(c)
    }
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v)
  }

  getAttribute(k) {
    return this.attributes[k]
  }

  addEventListener(ev, fn) {
    if (!this.eventListeners[ev]) this.eventListeners[ev] = []
    this.eventListeners[ev].push(fn)
  }

  append(...nodes) {
    nodes.forEach(n => this.children.push(n))
  }

  replaceChildren(...nodes) {
    this.children = [...nodes]
    this.innerHTML = ''
  }

  querySelector(selector) {
    if (!selector) return null
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1)
      if (this.id === targetId) return this
      return this._findChild(el => el.id === targetId)
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1)
      if (this.className.includes(cls)) return this
      return this._findChild(el => el.className.includes(cls))
    }
    return this._findChild(el => el.tagName.toLowerCase() === selector.toLowerCase())
  }

  _findChild(predicate) {
    for (const child of this.children) {
      if (predicate(child)) return child
      if (child._findChild) {
        const found = child._findChild(predicate)
        if (found) return found
      }
    }
    return null
  }
}

function setupMockDOM() {
  const elements = {
    seccionCarrito: new MockDOMElement('div', 'seccion-carrito'),
    estadoCarrito: new MockDOMElement('p', 'estado-carrito'),
    listaCarrito: new MockDOMElement('ul', 'productos-carrito'),
    totalCarrito: new MockDOMElement('span', 'total-carrito'),
    botonConfirmarCompra: new MockDOMElement('button', 'confirmar-compra'),
    spinnerConfirmarCompra: new MockDOMElement('span', 'confirmar-compra-spinner'),
    textoConfirmarCompra: new MockDOMElement('span', 'confirmar-compra-texto'),
    campoDestinatario: new MockDOMElement('input', 'checkout-destinatario'),
    campoDireccion: new MockDOMElement('input', 'checkout-direccion'),
    contadorCarrito: new MockDOMElement('span', 'contador-carrito'),
    drawerCount: new MockDOMElement('span', 'cart-drawer-count')
  }

  global.document = {
    createElement(tag) {
      return new MockDOMElement(tag)
    },
    querySelector(selector) {
      switch (selector) {
        case '#seccion-carrito': return elements.seccionCarrito
        case '#estado-carrito': return elements.estadoCarrito
        case '#productos-carrito': return elements.listaCarrito
        case '#total-carrito': return elements.totalCarrito
        case '#confirmar-compra': return elements.botonConfirmarCompra
        case '#confirmar-compra-spinner': return elements.spinnerConfirmarCompra
        case '#confirmar-compra-texto': return elements.textoConfirmarCompra
        case '#checkout-destinatario': return elements.campoDestinatario
        case '#checkout-direccion': return elements.campoDireccion
        case '#contador-carrito': return elements.contadorCarrito
        case '#cart-drawer-count': return elements.drawerCount
        default: return null
      }
    }
  }

  return elements
}

test('inicializarCarrito conecta elementos del DOM y soporta inyección de Offcanvas', () => {
  const dom = setupMockDOM()
  let showCalled = false
  const mockOffcanvas = {
    show: () => { showCalled = true },
    hide: () => {}
  }

  inicializarCarrito({ offcanvas: mockOffcanvas })
  abrirCarrito()

  assert.ok(showCalled, 'abrirCarrito debe disparar el método show() del offcanvas')
})

test('mostrarCarrito renderiza estado vacío cuando no hay ítems', () => {
  const dom = setupMockDOM()
  inicializarCarrito()
  establecerUsuarioSesion(null)

  mostrarCarrito({
    total: 0,
    productos: []
  })

  assert.equal(dom.totalCarrito.textContent, 'S/ 0.00')
  assert.equal(dom.contadorCarrito.textContent, '0')
  assert.equal(dom.drawerCount.textContent, '0 ítems')
  assert.ok(dom.botonConfirmarCompra.disabled, 'El botón de compra debe estar deshabilitado')
  assert.equal(dom.textoConfirmarCompra.textContent, 'Iniciar sesión para pagar')
  assert.equal(dom.listaCarrito.children.length, 1, 'Debe insertar el contenedor de empty state')
  assert.ok(dom.listaCarrito.children[0].className.includes('cart-empty-state-drawer'))
})

test('mostrarCarrito adapta el botón de compra según rol CLIENTE autenticado vs invitado', () => {
  const dom = setupMockDOM()
  inicializarCarrito()

  // 1. Invitado
  establecerUsuarioSesion(null)
  mostrarCarrito({
    total: 100,
    productos: [{ productoId: 1, nombre: 'Item 1', cantidad: 1, stockDisponible: 5, precio: 100, subtotal: 100 }]
  })
  assert.equal(dom.textoConfirmarCompra.textContent, 'Iniciar sesión para pagar')
  assert.equal(dom.botonConfirmarCompra.disabled, false)

  // 2. Cliente Autenticado
  establecerUsuarioSesion({ id: 10, nombre: 'Carlos', rol: 'CLIENTE' })
  mostrarCarrito({
    total: 100,
    productos: [{ productoId: 1, nombre: 'Item 1', cantidad: 1, stockDisponible: 5, precio: 100, subtotal: 100 }]
  })
  assert.equal(dom.textoConfirmarCompra.textContent, 'Confirmar compra con pago simulado')
  assert.equal(dom.botonConfirmarCompra.disabled, false)
})

test('mostrarCarrito renderiza productos con steppers, límites de stock y subtotales en Soles', () => {
  const dom = setupMockDOM()
  inicializarCarrito()
  establecerUsuarioSesion({ id: 10, nombre: 'Carlos', rol: 'CLIENTE' })

  const carritoDatos = {
    total: 350.5,
    productos: [
      {
        productoId: 1,
        sku: 'PA-0001',
        nombre: 'Teclado mecánico 60% RGB',
        cantidad: 1,
        stockDisponible: 10,
        precio: 150.5,
        subtotal: 150.5
      },
      {
        productoId: 5,
        sku: 'PA-0005',
        nombre: 'Mouse gamer G203',
        cantidad: 4,
        stockDisponible: 4,
        precio: 50.0,
        subtotal: 200.0
      }
    ]
  }

  mostrarCarrito(carritoDatos)

  // Verificaciones globales
  assert.equal(dom.contadorCarrito.textContent, '5')
  assert.equal(dom.drawerCount.textContent, '5 ítems')
  assert.equal(dom.totalCarrito.textContent, 'S/ 350.50')
  assert.equal(dom.listaCarrito.children.length, 2, 'Deben existir 2 ítems en la lista')

  // Verificación de Ítem 1 (cantidad 1 -> botón menos deshabilitado)
  const item1 = dom.listaCarrito.children[0]
  assert.ok(item1.className.includes('cart-item'))
  const stepper1 = item1._findChild(el => el.className === 'cart-stepper')
  assert.ok(stepper1, 'Debe contener el stepper')
  const btnMenos1 = stepper1.children[0]
  const qtySpan1 = stepper1.children[1]
  const btnMas1 = stepper1.children[2]
  assert.ok(btnMenos1.disabled, 'Botón menos debe estar deshabilitado cuando cantidad = 1')
  assert.equal(qtySpan1.textContent, '1')
  assert.equal(btnMas1.disabled, false, 'Botón más debe estar habilitado cuando cantidad < stock')

  // Verificación de Ítem 2 (cantidad 4 = stockDisponible 4 -> botón más deshabilitado)
  const item2 = dom.listaCarrito.children[1]
  const stepper2 = item2._findChild(el => el.className === 'cart-stepper')
  const btnMenos2 = stepper2.children[0]
  const qtySpan2 = stepper2.children[1]
  const btnMas2 = stepper2.children[2]
  assert.equal(btnMenos2.disabled, false, 'Botón menos debe estar habilitado cuando cantidad > 1')
  assert.equal(qtySpan2.textContent, '4')
  assert.ok(btnMas2.disabled, 'Botón más debe estar deshabilitado cuando cantidad alcanza el stock')
})

test('ocultarCarrito resetea el DOM y llama a hide() en el offcanvas', () => {
  const dom = setupMockDOM()
  let hideCalled = false
  const mockOffcanvas = {
    show: () => {},
    hide: () => { hideCalled = true }
  }

  inicializarCarrito({ offcanvas: mockOffcanvas })
  ocultarCarrito()

  assert.ok(hideCalled, 'Debe invocar hide() en la instancia de offcanvas')
  assert.equal(dom.listaCarrito.children.length, 0)
  assert.equal(dom.contadorCarrito.textContent, '0')
  assert.equal(dom.drawerCount.textContent, '0 ítems')
  assert.equal(dom.totalCarrito.textContent, 'S/ 0.00')
  assert.ok(dom.botonConfirmarCompra.disabled)
})
