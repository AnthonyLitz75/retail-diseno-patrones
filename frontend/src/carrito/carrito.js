import { apiRequest } from '../api/api.js'
import { mostrarToast } from '../utilidades/notificaciones.js'
import { formatoPrecio } from '../utilidades/formato.js'
import { resolverImagenProducto } from '../catalogo/imagen-producto.js'
import { construirPayloadConfirmacion } from './checkout.js'
import {
  obtenerCarritoInvitado,
  agregarProductoInvitado,
  actualizarCantidadInvitado,
  quitarProductoInvitado
} from './carrito-invitado.js'

export { construirPayloadConfirmacion }

let seccionCarrito
let estadoCarrito
let listaCarrito
let totalCarrito
let botonConfirmarCompra
let spinnerConfirmarCompra
let textoConfirmarCompra
let campoDestinatario
let campoDireccion
let compraEnProceso = false
let offcanvasInstancia = null
let OffcanvasClase = null
let usuarioActual = null

export function establecerUsuarioSesion(usuario) {
  usuarioActual = usuario
}

function esClienteAutenticado() {
  return usuarioActual && usuarioActual.rol === 'CLIENTE'
}

function obtenerOffcanvas() {
  if (!offcanvasInstancia && seccionCarrito) {
    if (OffcanvasClase?.getOrCreateInstance) {
      offcanvasInstancia = OffcanvasClase.getOrCreateInstance(seccionCarrito)
    } else if (typeof window !== 'undefined' && window.bootstrap?.Offcanvas) {
      offcanvasInstancia = window.bootstrap.Offcanvas.getOrCreateInstance(seccionCarrito)
    }
  }
  return offcanvasInstancia
}

export function abrirCarrito() {
  const offcanvas = obtenerOffcanvas()
  if (offcanvas?.show) {
    offcanvas.show()
  }
}

export function inicializarCarrito({ offcanvas = null, Offcanvas = null } = {}) {
  if (offcanvas) {
    offcanvasInstancia = offcanvas
  }
  if (Offcanvas) {
    OffcanvasClase = Offcanvas
  } else if (typeof window !== 'undefined' && window.bootstrap?.Offcanvas) {
    OffcanvasClase = window.bootstrap.Offcanvas
  }
  seccionCarrito = document.querySelector('#seccion-carrito')
  estadoCarrito = document.querySelector('#estado-carrito')
  listaCarrito = document.querySelector('#productos-carrito')
  totalCarrito = document.querySelector('#total-carrito')
  botonConfirmarCompra = document.querySelector('#confirmar-compra')
  spinnerConfirmarCompra = document.querySelector('#confirmar-compra-spinner')
  textoConfirmarCompra = document.querySelector('#confirmar-compra-texto')
  campoDestinatario = document.querySelector('#checkout-destinatario')
  campoDireccion = document.querySelector('#checkout-direccion')
  if (botonConfirmarCompra) {
    botonConfirmarCompra.addEventListener('click', confirmarCompra)
  }
}

function mostrarError(error) {
  if (!estadoCarrito) return
  estadoCarrito.className = 'alert alert-danger py-2 small mb-2'
  estadoCarrito.textContent = error.message
}

async function actualizarCantidadDirecta(productoId, nuevaCantidad) {
  if (nuevaCantidad < 1) return

  if (!esClienteAutenticado()) {
    const nuevoCarrito = actualizarCantidadInvitado(productoId, nuevaCantidad)
    mostrarCarrito(nuevoCarrito)
    return
  }

  estadoCarrito.className = 'small text-secondary mb-2'
  estadoCarrito.textContent = 'Actualizando cantidad...'
  try {
    const respuesta = await apiRequest('/api/carrito/productos/' + productoId, {
      method: 'PUT',
      json: { cantidad: nuevaCantidad }
    })
    mostrarCarrito(await respuesta.json())
    estadoCarrito.className = 'alert alert-success py-2 small mb-2'
    estadoCarrito.textContent = 'Cantidad actualizada.'
  } catch (error) {
    mostrarError(error)
    await cargarCarrito()
  }
}

export function mostrarCarrito(carrito) {
  if (!listaCarrito || !totalCarrito) return

  listaCarrito.replaceChildren()
  totalCarrito.textContent = formatoPrecio(carrito.total)
  const totalItems = carrito.productos.reduce((total, producto) => total + producto.cantidad, 0)
  const contadorCarrito = document.querySelector('#contador-carrito')
  if (contadorCarrito) {
    contadorCarrito.textContent = String(totalItems)
  }
  const drawerCount = document.querySelector('#cart-drawer-count')
  if (drawerCount) {
    drawerCount.textContent = `${totalItems} ${totalItems === 1 ? 'ítem' : 'ítems'}`
  }

  // Ajustar estado y texto del botón de checkout según autenticación
  if (botonConfirmarCompra && textoConfirmarCompra) {
    if (!esClienteAutenticado()) {
      textoConfirmarCompra.textContent = 'Iniciar sesión para pagar'
      botonConfirmarCompra.disabled = carrito.productos.length === 0
    } else {
      textoConfirmarCompra.textContent = 'Confirmar compra con pago simulado'
      botonConfirmarCompra.disabled = compraEnProceso || carrito.productos.length === 0
    }
  }

  if (carrito.productos.length === 0) {
    estadoCarrito.className = 'small mb-0'
    estadoCarrito.textContent = ''
    const emptyState = document.createElement('div')
    emptyState.className = 'cart-empty-state-drawer text-center py-5 px-3'
    emptyState.innerHTML = `
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
    listaCarrito.append(emptyState)
    return
  }

  estadoCarrito.className = 'small mb-2'
  estadoCarrito.textContent = ''

  for (const producto of carrito.productos) {
    const fila = document.createElement('li')
    fila.className = 'list-group-item px-0 py-3 d-flex align-items-center gap-3 cart-item'

    // Miniatura del producto
    const imagenUrl = resolverImagenProducto(producto)
    const contenedorThumb = document.createElement('div')
    contenedorThumb.className = 'cart-item-thumb flex-shrink-0'
    if (imagenUrl) {
      const img = document.createElement('img')
      img.src = imagenUrl
      img.alt = producto.nombre || 'Producto'
      img.className = 'img-fluid'
      img.loading = 'lazy'
      contenedorThumb.append(img)
    } else {
      contenedorThumb.classList.add('cart-item-thumb-generic')
      contenedorThumb.innerHTML = `
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
    botonQuitar.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash3" viewBox="0 0 16 16">
        <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5a.5.5 0 0 1 .47-.528M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5m2.472.5a.5.5 0 0 1 .47.528l-.5 8.5a.5.5 0 0 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.468"/>
      </svg>
    `
    botonQuitar.addEventListener('click', () => quitarProducto(producto.productoId))

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
    btnMenos.innerHTML = '&minus;'
    btnMenos.disabled = producto.cantidad <= 1
    btnMenos.setAttribute('aria-label', `Disminuir cantidad de ${producto.nombre}`)
    btnMenos.addEventListener('click', () => actualizarCantidadDirecta(producto.productoId, producto.cantidad - 1))

    const qtySpan = document.createElement('span')
    qtySpan.className = 'cart-stepper-qty small fw-semibold text-center'
    qtySpan.textContent = String(producto.cantidad)

    const btnMas = document.createElement('button')
    btnMas.type = 'button'
    btnMas.className = 'btn cart-stepper-btn'
    btnMas.innerHTML = '&plus;'
    btnMas.disabled = producto.cantidad >= producto.stockDisponible
    btnMas.setAttribute('aria-label', `Aumentar cantidad de ${producto.nombre}`)
    btnMas.addEventListener('click', () => actualizarCantidadDirecta(producto.productoId, producto.cantidad + 1))

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
    listaCarrito.append(fila)
  }
}

export function ocultarCarrito() {
  const offcanvas = obtenerOffcanvas()
  if (offcanvas) {
    offcanvas.hide()
  }
  if (listaCarrito) listaCarrito.replaceChildren()
  if (estadoCarrito) estadoCarrito.textContent = ''
  if (totalCarrito) totalCarrito.textContent = formatoPrecio(0)
  const contadorCarrito = document.querySelector('#contador-carrito')
  if (contadorCarrito) contadorCarrito.textContent = '0'
  const drawerCount = document.querySelector('#cart-drawer-count')
  if (drawerCount) drawerCount.textContent = '0 ítems'
  if (botonConfirmarCompra) botonConfirmarCompra.disabled = true
  if (spinnerConfirmarCompra?.classList) spinnerConfirmarCompra.classList.add('d-none')
  if (textoConfirmarCompra) textoConfirmarCompra.textContent = 'Confirmar compra con pago simulado'
}

async function confirmarCompra() {
  if (compraEnProceso) return

  // Si no está autenticado como cliente, redirigir al login amigablemente
  if (!esClienteAutenticado()) {
    mostrarToast('Inicia sesión o crea una cuenta para completar tu compra.', 'info')
    window.location.href = '/login.html'
    return
  }

  const destinatarioValor = campoDestinatario ? campoDestinatario.value : ''
  const direccionValor = campoDireccion ? campoDireccion.value : ''

  let payload
  try {
    payload = construirPayloadConfirmacion({
      destinatario: destinatarioValor,
      direccionEnvio: direccionValor
    })
  } catch (errorValidacion) {
    mostrarError(errorValidacion)
    mostrarToast(errorValidacion.message, 'advertencia')
    return
  }

  compraEnProceso = true
  if (botonConfirmarCompra) botonConfirmarCompra.disabled = true
  if (spinnerConfirmarCompra) spinnerConfirmarCompra.classList.remove('d-none')
  if (textoConfirmarCompra) textoConfirmarCompra.textContent = 'Procesando pago...'
  estadoCarrito.className = 'alert alert-secondary py-2 small mb-2'
  estadoCarrito.textContent = 'Procesando pago simulado...'
  try {
    const respuesta = await apiRequest('/api/pedidos/confirmar', {
      method: 'POST',
      json: payload
    })
    const cuerpo = await respuesta.json()
    if (campoDestinatario) campoDestinatario.value = ''
    if (campoDireccion) campoDireccion.value = ''
    await cargarCarrito()
    estadoCarrito.className = 'alert alert-success py-2 small mb-2'
    estadoCarrito.textContent = `Compra confirmada. Se creó el pedido #${cuerpo.idPedido}.`
    mostrarToast(`¡Compra confirmada! Pedido #${cuerpo.idPedido} generado.`, 'exito')
    document.dispatchEvent(new CustomEvent('retail:pedido-confirmado', { detail: cuerpo }))
  } catch (error) {
    mostrarError(error)
    mostrarToast(`No se pudo procesar la compra: ${error.message}`, 'error')
  } finally {
    compraEnProceso = false
    if (spinnerConfirmarCompra?.classList) spinnerConfirmarCompra.classList.add('d-none')
    if (textoConfirmarCompra) textoConfirmarCompra.textContent = 'Confirmar compra con pago simulado'
    if (botonConfirmarCompra) {
      botonConfirmarCompra.disabled = listaCarrito.children.length === 0
    }
  }
}

export async function cargarCarrito() {
  if (!esClienteAutenticado()) {
    const carrito = obtenerCarritoInvitado()
    mostrarCarrito(carrito)
    return
  }

  if (estadoCarrito) {
    estadoCarrito.className = 'small text-secondary mb-2'
    estadoCarrito.textContent = 'Cargando carrito...'
  }

  try {
    const respuesta = await apiRequest('/api/carrito')
    mostrarCarrito(await respuesta.json())
  } catch (error) {
    mostrarError(error)
  }
}

export async function agregarProductoAlCarrito(productoId, productoObj = null, cantidad = 1) {
  const cant = Math.max(1, Number(cantidad) || 1);
  if (!esClienteAutenticado()) {
    if (productoObj) {
      const nuevoCarrito = agregarProductoInvitado(productoObj, cant)
      mostrarCarrito(nuevoCarrito)
      if (estadoCarrito) {
        estadoCarrito.className = 'alert alert-success py-2 small mb-2'
        estadoCarrito.textContent = 'Producto añadido a tu carrito.'
      }
      mostrarToast(`¡${productoObj.nombre} añadido al carrito!`, 'exito')
      abrirCarrito()
      return
    }
  }

  if (estadoCarrito) {
    estadoCarrito.className = 'small text-secondary mb-2'
    estadoCarrito.textContent = 'Agregando producto...'
  }

  try {
    const respuesta = await apiRequest('/api/carrito/productos', {
      method: 'POST',
      json: { productoId, cantidad: cant }
    })
    mostrarCarrito(await respuesta.json())
    if (estadoCarrito) {
      estadoCarrito.className = 'alert alert-success py-2 small mb-2'
      estadoCarrito.textContent = 'Producto agregado al carrito.'
    }
    mostrarToast('Producto añadido al carrito.', 'exito')
    abrirCarrito()
  } catch (error) {
    mostrarError(error)
    mostrarToast(`No se pudo agregar al carrito: ${error.message}`, 'error')
    abrirCarrito()
  }
}

async function quitarProducto(productoId) {
  if (!esClienteAutenticado()) {
    const nuevoCarrito = quitarProductoInvitado(productoId)
    mostrarCarrito(nuevoCarrito)
    mostrarToast('Producto quitado del carrito.', 'info')
    return
  }

  estadoCarrito.className = 'small text-secondary mb-2'
  estadoCarrito.textContent = 'Quitando producto...'

  try {
    await apiRequest('/api/carrito/productos/' + productoId, {
      method: 'DELETE'
    })
    await cargarCarrito()
    estadoCarrito.className = 'alert alert-success py-2 small mb-2'
    estadoCarrito.textContent = 'Producto quitado del carrito.'
    mostrarToast('Producto quitado del carrito.', 'info')
  } catch (error) {
    mostrarError(error)
    mostrarToast(`No se pudo quitar el producto: ${error.message}`, 'error')
  }
}
