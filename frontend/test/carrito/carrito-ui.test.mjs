import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inicializarCarrito,
  establecerUsuarioSesion,
  abrirCarrito,
  ocultarCarrito,
  mostrarCarrito,
  pasoCheckoutActual
} from '../../src/carrito/carrito.js'

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

  querySelectorAll(selector) {
    const results = []
    if (!selector) return results
    if (selector.startsWith('.')) {
      const cls = selector.slice(1)
      this._findAllChildren(el => el.className && el.className.includes(cls), results)
    } else if (selector.startsWith('#')) {
      const targetId = selector.slice(1)
      this._findAllChildren(el => el.id === targetId, results)
    } else {
      this._findAllChildren(el => el.tagName && el.tagName.toLowerCase() === selector.toLowerCase(), results)
    }
    return results
  }

  _findAllChildren(predicate, results) {
    for (const child of this.children) {
      if (predicate(child)) results.push(child)
      if (child._findAllChildren) {
        child._findAllChildren(predicate, results)
      }
    }
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
    drawerCount: new MockDOMElement('span', 'cart-drawer-count'),
    botonContinuar: new MockDOMElement('button', 'continuar-checkout'),
    textoContinuar: new MockDOMElement('span', 'continuar-checkout-texto'),
    checkoutTotal: new MockDOMElement('span', 'checkout-total'),
    checkoutResumen: new MockDOMElement('ul', 'checkout-resumen'),
    pasoCarrito: new MockDOMElement('section', 'checkout-paso-carrito'),
    pasoEntrega: new MockDOMElement('section', 'checkout-paso-entrega'),
    pasoConfirmacion: new MockDOMElement('section', 'checkout-paso-confirmacion')
  }

  const bodyElement = new MockDOMElement('body')
  bodyElement.contains = () => true

  global.document = {
    body: bodyElement,
    dispatchEvent: () => {},
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
        case '#continuar-checkout': return elements.botonContinuar
        case '#continuar-checkout-texto': return elements.textoContinuar
        case '#checkout-total': return elements.checkoutTotal
        case '#checkout-resumen': return elements.checkoutResumen
        case '#checkout-paso-carrito': return elements.pasoCarrito
        case '#checkout-paso-entrega': return elements.pasoEntrega
        case '#checkout-paso-confirmacion': return elements.pasoConfirmacion
        default: return null
      }
    }
  }

  return elements
}

test('inicializarCarrito conecta elementos del DOM y soporta inyección de Offcanvas', () => {
  setupMockDOM()
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
  assert.ok(dom.botonContinuar.disabled, 'Sin productos no se puede pasar a la entrega')
  assert.equal(dom.textoContinuar.textContent, 'Iniciar sesión para pagar')
  assert.equal(dom.listaCarrito.children.length, 1, 'Debe insertar el contenedor de empty state')
  assert.ok(dom.listaCarrito.children[0].className.includes('cart-empty-state-drawer'))
})

test('mostrarCarrito adapta los botones del checkout según rol CLIENTE autenticado vs invitado', () => {
  const dom = setupMockDOM()
  inicializarCarrito()

  // 1. Invitado: puede avanzar (lo lleva a iniciar sesión) pero no pagar
  establecerUsuarioSesion(null)
  mostrarCarrito({
    total: 100,
    productos: [{ productoId: 1, nombre: 'Item 1', cantidad: 1, stockDisponible: 5, precio: 100, subtotal: 100 }]
  })
  assert.equal(dom.textoContinuar.textContent, 'Iniciar sesión para pagar')
  assert.equal(dom.botonContinuar.disabled, false)
  assert.equal(dom.botonConfirmarCompra.disabled, true)

  // 2. Cliente autenticado: continúa a la entrega y el botón de pago muestra el total
  establecerUsuarioSesion({ id: 10, nombre: 'Carlos', rol: 'CLIENTE' })
  mostrarCarrito({
    total: 100,
    productos: [{ productoId: 1, nombre: 'Item 1', cantidad: 1, stockDisponible: 5, precio: 100, subtotal: 100 }]
  })
  assert.equal(dom.textoContinuar.textContent, 'Continuar con la entrega')
  // formatoPrecio separa "S/" del importe con un espacio no separable (U+00A0).
  assert.equal(dom.textoConfirmarCompra.textContent, 'Confirmar y pagar S/ 100.00')
  assert.equal(dom.botonConfirmarCompra.disabled, false)
  assert.equal(dom.checkoutTotal.textContent, 'S/ 100.00')
  assert.equal(dom.checkoutResumen.children.length, 1, 'El resumen "Tu pedido" lista cada producto')
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

test('confirmarCompra mantiene deshabilitado el botonConfirmarCompra cuando el carrito queda vacío tras el checkout', async () => {
  const dom = setupMockDOM()
  inicializarCarrito()
  establecerUsuarioSesion({ id: 10, nombre: 'Carlos', rol: 'CLIENTE' })

  // Preparar carrito inicial con 1 producto para que el botón esté habilitado
  mostrarCarrito({
    total: 100,
    productos: [{ productoId: 1, nombre: 'Item 1', cantidad: 1, stockDisponible: 5, precio: 100, subtotal: 100 }]
  })
  assert.equal(dom.botonConfirmarCompra.disabled, false)

  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    if (url.includes('/api/pedidos/confirmar')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ idPedido: 42 })
      }
    }
    if (url.includes('/api/carrito')) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ total: 0, productos: [] })
      }
    }
    throw new Error('URL no mockeada: ' + url)
  }

  try {
    const clickHandler = dom.botonConfirmarCompra.eventListeners['click']?.[0]
    assert.ok(clickHandler, 'Debe haber listener click en botonConfirmarCompra')
    await clickHandler()

    // El carrito debe tener el empty state
    assert.equal(dom.listaCarrito.querySelectorAll('.cart-item').length, 0)
    assert.equal(dom.listaCarrito.children.length, 1)
    // El botón de confirmar compra debe quedar DESHABILITADO porque el carrito está vacío
    assert.equal(dom.botonConfirmarCompra.disabled, true, 'El botón de compra debe estar deshabilitado al quedar el carrito vacío')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('checkout: tras pagar se ve la confirmación; un pago rechazado deja el carrito y otra clave; sin respuesta se reintenta con la misma', async () => {
  const dom = setupMockDOM()
  inicializarCarrito()
  establecerUsuarioSesion({ id: 10, nombre: 'Carlos', rol: 'CLIENTE' })
  const carritoLleno = { total: 100, productos: [{ productoId: 1, nombre: 'Item 1', cantidad: 1, stockDisponible: 5, precio: 100, subtotal: 100 }] }
  mostrarCarrito(carritoLleno)
  dom.botonContinuar.eventListeners.click[0]()
  assert.equal(pasoCheckoutActual(), 'entrega')
  assert.equal(dom.pasoEntrega.hidden, false)
  assert.equal(dom.pasoCarrito.hidden, true)

  const claves = []
  const respuestas = ['rechazo', 'sin-red', 'ok']
  const json = (status, cuerpo) => ({
    ok: status < 400,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => cuerpo,
    text: async () => JSON.stringify(cuerpo),
    clone() { return this }
  })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, opciones = {}) => {
    if (url.includes('/api/pedidos/confirmar')) {
      claves.push(JSON.parse(opciones.body).claveConfirmacion)
      const tipo = respuestas.shift()
      if (tipo === 'rechazo') return json(402, { error: 'Pago rechazado por el proveedor simulado' })
      if (tipo === 'sin-red') throw new TypeError('Failed to fetch')
      return json(201, { idPedido: 6, estado: 'PENDIENTE', total: 100, estadoPago: 'APROBADO' })
    }
    if (url.includes('/api/carrito')) {
      return json(200, respuestas.length === 0 ? { total: 0, productos: [] } : carritoLleno)
    }
    throw new Error('URL no mockeada: ' + url)
  }

  try {
    const pagar = dom.botonConfirmarCompra.eventListeners.click[0]
    await pagar()
    assert.equal(pasoCheckoutActual(), 'entrega', 'un pago rechazado no avanza')
    assert.match(dom.estadoCarrito.textContent, /no se creó ningún pedido/)

    await pagar()
    assert.equal(pasoCheckoutActual(), 'entrega')
    assert.match(dom.estadoCarrito.textContent, /revisa Mis compras/)

    await pagar()
    assert.equal(pasoCheckoutActual(), 'confirmacion')
    assert.equal(dom.pasoConfirmacion.hidden, false)
    const titulo = dom.pasoConfirmacion._findChild(el => el.textContent === '¡Compra confirmada!')
    assert.ok(titulo, 'La confirmación muestra el título del boceto')

    assert.equal(claves.length, 3)
    assert.notEqual(claves[0], claves[1], 'tras un 402 (respuesta definitiva) se usa una clave nueva')
    assert.equal(claves[1], claves[2], 'sin respuesta del servidor se reintenta con la misma clave')
    assert.equal(dom.botonConfirmarCompra.disabled, true, 'con el carrito vacío no se puede volver a pagar')
  } finally {
    globalThis.fetch = originalFetch
  }
})
