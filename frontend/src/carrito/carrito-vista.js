/**
 * @file carrito-vista.js
 * Módulo de renderizado DOM seguro para el carrito y checkout de Píxel Andino.
 * Utiliza estrictamente la template tag `html` para prevenir XSS.
 */

import { html } from '../utilidades/seguridad.js'

/**
 * Renderiza el estado vacío del cajón lateral del carrito.
 * @returns {HTMLElement}
 */
export function renderizarEstadoVacio() {
  const emptyState = document.createElement('div')
  emptyState.className = 'cart-empty-state-drawer text-center py-5 px-3'
  emptyState.innerHTML = html`
    <div class="cart-empty-icon mb-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" class="text-secondary">
        <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    </div>
    <h6 class="fw-bold text-dark mb-1">Tu carrito está vacío</h6>
    <p class="text-secondary small mb-4">Descubre nuestros periféricos y componentes de alta gama y agrégalos a tu carrito.</p>
    <button type="button" class="btn btn-outline-primary btn-sm rounded-pill px-4" data-bs-dismiss="offcanvas">
      Explorar catálogo
    </button>
  `
  return emptyState
}

/**
 * Renderiza una fila de producto dentro de la lista del carrito con controles delegados.
 * @param {object} producto
 * @param {object} helpers
 * @returns {HTMLElement}
 */
export function renderizarFilaProducto(producto, { formatoPrecio, resolverImagenProducto, asignarImagenConRespaldo }) {
  const fila = document.createElement('li')
  fila.className = 'list-group-item px-0 py-3 d-flex align-items-center gap-3 cart-item'

  // Miniatura del producto
  const imagenUrl = resolverImagenProducto(producto)
  const contenedorThumb = document.createElement('div')
  contenedorThumb.className = 'cart-item-thumb flex-shrink-0'
  if (imagenUrl) {
    const img = document.createElement('img')
    asignarImagenConRespaldo(img, imagenUrl)
    img.alt = producto.nombre || 'Producto'
    img.className = 'img-fluid'
    img.loading = 'lazy'
    contenedorThumb.append(img)
  } else {
    contenedorThumb.classList.add('cart-item-thumb-generic')
    contenedorThumb.innerHTML = html`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
      </svg>
    `
  }

  // Información del producto y controles
  const infoCol = document.createElement('div')
  infoCol.className = 'flex-grow-1 min-w-0'

  // Título y botón quitar
  const cabecera = document.createElement('div')
  cabecera.className = 'd-flex justify-content-between align-items-start gap-2 mb-1'

  const nombre = document.createElement('h6')
  nombre.className = 'mb-0 small fw-bold text-dark text-truncate'
  nombre.textContent = producto.nombre
  nombre.title = producto.nombre

  const botonQuitar = document.createElement('button')
  botonQuitar.type = 'button'
  botonQuitar.className = 'btn btn-link text-secondary p-0 cart-item-remove'
  botonQuitar.setAttribute('aria-label', `Quitar ${producto.nombre} del carrito`)
  botonQuitar.title = 'Quitar del carrito'
  botonQuitar.setAttribute('data-accion', 'quitar')
  botonQuitar.setAttribute('data-producto-id', String(producto.productoId))
  if (botonQuitar.dataset) {
    botonQuitar.dataset.accion = 'quitar'
    botonQuitar.dataset.productoId = String(producto.productoId)
  }
  botonQuitar.innerHTML = html`
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
      <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.528M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5m2.472.5a.5.5 0 0 1 .47.528l-.5 8.5a.5.5 0 0 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.468"/>
    </svg>
  `

  cabecera.append(nombre, botonQuitar)

  // Controles: Stepper y Subtotal
  const controles = document.createElement('div')
  controles.className = 'd-flex justify-content-between align-items-center mt-2'

  // Stepper
  const stepper = document.createElement('div')
  stepper.className = 'cart-stepper'

  const btnMenos = document.createElement('button')
  btnMenos.type = 'button'
  btnMenos.className = 'btn cart-stepper-btn'
  btnMenos.setAttribute('data-accion', 'decrementar')
  btnMenos.setAttribute('data-producto-id', String(producto.productoId))
  btnMenos.setAttribute('data-cantidad', String(producto.cantidad))
  if (btnMenos.dataset) {
    btnMenos.dataset.accion = 'decrementar'
    btnMenos.dataset.productoId = String(producto.productoId)
    btnMenos.dataset.cantidad = String(producto.cantidad)
  }
  btnMenos.innerHTML = html`&minus;`
  btnMenos.disabled = producto.cantidad <= 1
  btnMenos.setAttribute('aria-label', `Disminuir cantidad de ${producto.nombre}`)

  const qtySpan = document.createElement('span')
  qtySpan.className = 'cart-stepper-qty small fw-semibold text-center'
  qtySpan.textContent = String(producto.cantidad)

  const btnMas = document.createElement('button')
  btnMas.type = 'button'
  btnMas.className = 'btn cart-stepper-btn'
  btnMas.setAttribute('data-accion', 'incrementar')
  btnMas.setAttribute('data-producto-id', String(producto.productoId))
  btnMas.setAttribute('data-cantidad', String(producto.cantidad))
  if (btnMas.dataset) {
    btnMas.dataset.accion = 'incrementar'
    btnMas.dataset.productoId = String(producto.productoId)
    btnMas.dataset.cantidad = String(producto.cantidad)
  }
  btnMas.innerHTML = html`&plus;`
  btnMas.disabled = producto.cantidad >= producto.stockDisponible
  btnMas.setAttribute('aria-label', `Aumentar cantidad de ${producto.nombre}`)

  stepper.append(btnMenos, qtySpan, btnMas)

  // Subtotal
  const subtotalBox = document.createElement('div')
  subtotalBox.className = 'text-end'

  const subtotal = document.createElement('span')
  subtotal.className = 'fw-bold text-primary small d-block'
  subtotal.textContent = formatoPrecio(producto.subtotal)

  const unitario = document.createElement('span')
  unitario.className = 'text-muted'
  unitario.style.fontSize = '0.72rem'
  unitario.textContent = `${formatoPrecio(producto.precio)} c/u`

  subtotalBox.append(subtotal, unitario)
  controles.append(stepper, subtotalBox)

  infoCol.append(cabecera, controles)
  fila.append(contenedorThumb, infoCol)
  return fila
}

/**
 * Renderiza los ítems del resumen "Tu pedido" del paso 2.
 * @param {object} carrito
 * @param {Function} formatoPrecio
 * @returns {HTMLElement[]}
 */
export function renderizarResumenCheckout(carrito, formatoPrecio) {
  return carrito.productos.map((producto) => {
    const fila = document.createElement('li')
    fila.className = 'd-flex justify-content-between gap-2 py-1 border-bottom'
    const nombre = document.createElement('span')
    nombre.textContent = `${producto.nombre} × ${producto.cantidad}`
    const subtotal = document.createElement('span')
    subtotal.className = 'fw-semibold text-nowrap'
    subtotal.textContent = formatoPrecio(producto.subtotal)
    fila.append(nombre, subtotal)
    return fila
  })
}

/**
 * Renderiza el nodo de confirmación de compra exitosa (paso 3).
 * @param {object} pedido
 * @param {object} helpers
 * @returns {HTMLElement[]}
 */
export function renderizarConfirmacionPedido(pedido, { formatoPrecio, numeroPedido, describirPago, alVerPedido, alSeguirComprando }) {
  const el = (etiqueta, clase = '', texto = '') => {
    const nodo = document.createElement(etiqueta)
    if (clase) nodo.className = clase
    if (texto) nodo.textContent = texto
    return nodo
  }

  const icono = el('div', 'checkout-confirmado-icono mx-auto mb-3')
  icono.setAttribute('aria-hidden', 'true')
  icono.textContent = '✓'

  const titulo = el('h3', 'h4 fw-bold text-center mb-2', '¡Compra confirmada!')
  const mensaje = el('p', 'text-center text-secondary small mb-3')
  mensaje.append(
    `Tu pedido ${numeroPedido(pedido.idPedido)} está `,
    el('span', 'badge text-bg-warning', pedido.estado || 'PENDIENTE'),
    '. Te avisaremos en Notificaciones cuando almacén lo prepare.'
  )

  const datos = el('dl', 'checkout-confirmado-datos small mb-3')
  const filas = [
    ['Total', formatoPrecio(pedido.total)],
    ['Pago', describirPago(pedido)],
    ['Entrega en', pedido.direccionEnvio || 'Sin dirección indicada']
  ]
  if (pedido.destinatario) filas.push(['Recibe', pedido.destinatario])
  for (const [clave, valor] of filas) {
    datos.append(el('dt', '', clave), el('dd', '', valor))
  }

  const verPedido = el('button', 'btn btn-primary w-100 mb-2', 'Ver mi pedido')
  verPedido.type = 'button'
  verPedido.addEventListener('click', alVerPedido)

  const seguir = el('button', 'btn btn-outline-primary w-100', 'Seguir comprando')
  seguir.type = 'button'
  seguir.addEventListener('click', alSeguirComprando)

  return [icono, titulo, mensaje, datos, verPedido, seguir]
}
