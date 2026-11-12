import { apiRequest } from '../api/api.js'
import { mostrarToast } from '../utilidades/notificaciones.js'
import { formatoPrecio } from '../utilidades/formato.js'
import { asignarImagenConRespaldo, resolverImagenProducto } from '../catalogo/imagen-producto.js'
import {
  construirPayloadConfirmacion,
  conservarClaveTrasError,
  describirPago,
  mensajeErrorCompra,
  numeroPedido,
  PASOS_CHECKOUT,
  pasoTrasActualizarCarrito,
  textoBotonPagar
} from './checkout.js'
import {
  deshacerUltimaAccion,
  mensajeErrorDeshacer,
  pintarEstadoConDeshacer,
  puedeSeguirDeshaciendo
} from './deshacer-carrito.js'
import {
  obtenerCarritoInvitado,
  agregarProductoInvitado,
  actualizarCantidadInvitado,
  quitarProductoInvitado
} from './carrito-invitado.js'
import { ROL } from '../utilidades/constantes.js'

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
let botonContinuar
let textoContinuar
let botonVolverCarrito
let totalCheckout
let resumenCheckout
let pasoConfirmacion
// Checkout en tres pasos (boceto "Confirmar compra"): paso visible y clave del intento de
// compra en curso. La clave se conserva solo si el resultado fue desconocido (sin respuesta).
let pasoActual = 'carrito'
let claveIntento = null
let ultimoTotal = 0
let compraEnProceso = false
let offcanvasInstancia = null
let OffcanvasClase = null
let usuarioActual = null

export function establecerUsuarioSesion(usuario) {
  usuarioActual = usuario
}

function esClienteAutenticado() {
  return usuarioActual && usuarioActual.rol === ROL.CLIENTE
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
  botonContinuar = document.querySelector('#continuar-checkout')
  textoContinuar = document.querySelector('#continuar-checkout-texto')
  botonVolverCarrito = document.querySelector('#volver-carrito')
  totalCheckout = document.querySelector('#checkout-total')
  resumenCheckout = document.querySelector('#checkout-resumen')
  pasoConfirmacion = document.querySelector('#checkout-paso-confirmacion')
  pasoActual = 'carrito'
  claveIntento = null
  if (botonConfirmarCompra) {
    botonConfirmarCompra.addEventListener('click', confirmarCompra)
  }
  botonContinuar?.addEventListener('click', irAEntrega)
  botonVolverCarrito?.addEventListener('click', () => mostrarPaso('carrito'))
  // Al cerrar el panel tras una compra, la próxima vez se abre en el carrito.
  seccionCarrito?.addEventListener?.('hidden.bs.offcanvas', () => {
    if (pasoActual === 'confirmacion') mostrarPaso('carrito')
  })
}

/** Muestra un paso del checkout y marca el avance en la barra de pasos. */
export function mostrarPaso(paso) {
  if (!PASOS_CHECKOUT.includes(paso)) return
  pasoActual = paso
  const indice = PASOS_CHECKOUT.indexOf(paso)
  PASOS_CHECKOUT.forEach((nombre, i) => {
    const seccion = document.querySelector(`#checkout-paso-${nombre}`)
    if (seccion) seccion.hidden = nombre !== paso
    const marca = document.querySelector(`#checkout-pasos [data-paso="${nombre}"]`)
    if (marca) {
      marca.classList.toggle('is-done', i < indice)
      if (nombre === paso) marca.setAttribute('aria-current', 'step')
      else marca.removeAttribute('aria-current')
    }
  })
  if (paso !== 'carrito' && estadoCarrito) {
    estadoCarrito.className = 'small mb-2'
    estadoCarrito.textContent = ''
  }
}

export function pasoCheckoutActual() {
  return pasoActual
}

function irAEntrega() {
  if (!esClienteAutenticado()) {
    mostrarToast('Inicia sesión o crea una cuenta para completar tu compra.', 'info')
    window.location.href = '/login.html'
    return
  }
  mostrarPaso('entrega')
  campoDestinatario?.focus?.()
}

function metodoPagoElegido() {
  return document.querySelector('input[name="checkout-metodo-pago"]:checked')?.value || 'PRUEBA_APROBADA'
}

/** Resumen "Tu pedido" del paso 2 con lo que hay en el carrito. */
function pintarResumen(carrito) {
  if (totalCheckout) totalCheckout.textContent = formatoPrecio(carrito.total)
  if (!resumenCheckout) return
  resumenCheckout.replaceChildren(...carrito.productos.map((producto) => {
    const fila = document.createElement('li')
    fila.className = 'd-flex justify-content-between gap-2 py-1 border-bottom'
    const nombre = document.createElement('span')
    nombre.textContent = `${producto.nombre} × ${producto.cantidad}`
    const subtotal = document.createElement('span')
    subtotal.className = 'fw-semibold text-nowrap'
    subtotal.textContent = formatoPrecio(producto.subtotal)
    fila.append(nombre, subtotal)
    return fila
  }))
}

/** Paso 3 (boceto "Compra confirmada"): número, estado, total, pago y entrega del pedido. */
function pintarConfirmacion(pedido) {
  if (!pasoConfirmacion) return
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
  verPedido.addEventListener('click', () => {
    obtenerOffcanvas()?.hide?.()
    mostrarPaso('carrito')
    window.location.hash = '#/pedidos'
  })
  const seguir = el('button', 'btn btn-outline-primary w-100', 'Seguir comprando')
  seguir.type = 'button'
  seguir.addEventListener('click', () => {
    obtenerOffcanvas()?.hide?.()
    mostrarPaso('carrito')
  })
  pasoConfirmacion.replaceChildren(icono, titulo, mensaje, datos, verPedido, seguir)
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
    pintarEstadoConDeshacer(estadoCarrito, 'Cantidad actualizada.', deshacerAccionCarrito)
  } catch (error) {
    mostrarError(error)
    await cargarCarrito()
  }
}

/**
 * Spec 005 (RF08): deshace la última acción del cliente sobre su carrito. Un 409 indica
 * que el carrito cambió en otra sesión o que el producto ya no está disponible: se recarga
 * la vista para no mostrar datos viejos.
 */
async function deshacerAccionCarrito() {
  if (!estadoCarrito) return
  estadoCarrito.className = 'small text-secondary mb-2'
  estadoCarrito.textContent = 'Deshaciendo la última acción...'
  try {
    mostrarCarrito(await deshacerUltimaAccion(apiRequest))
    pintarEstadoConDeshacer(estadoCarrito, 'Acción deshecha.', deshacerAccionCarrito)
    mostrarToast('Se deshizo la última acción del carrito.', 'info')
  } catch (error) {
    const mensaje = mensajeErrorDeshacer(error)
    if (puedeSeguirDeshaciendo(error)) {
      // 409: se recarga la vista y se ofrece seguir con las acciones anteriores (H1).
      await cargarCarrito()
      pintarEstadoConDeshacer(estadoCarrito, mensaje, deshacerAccionCarrito, document, 'advertencia')
      return
    }
    estadoCarrito.className = 'alert alert-warning py-2 small mb-2'
    estadoCarrito.textContent = mensaje
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

  // Paso 1: el invitado debe iniciar sesión; el cliente continúa a "Entrega y pago".
  const vacio = carrito.productos.length === 0
  if (botonContinuar) botonContinuar.disabled = vacio
  if (textoContinuar) {
    textoContinuar.textContent = esClienteAutenticado() ? 'Continuar con la entrega' : 'Iniciar sesión para pagar'
  }
  // Paso 2: el botón muestra el total que se va a pagar.
  ultimoTotal = carrito.total
  if (botonConfirmarCompra) {
    botonConfirmarCompra.disabled = !esClienteAutenticado() || compraEnProceso || vacio
  }
  if (textoConfirmarCompra && !compraEnProceso) textoConfirmarCompra.textContent = textoBotonPagar(carrito.total)
  pintarResumen(carrito)
  const paso = pasoTrasActualizarCarrito(pasoActual, carrito.productos.length)
  if (paso !== pasoActual) mostrarPaso(paso)

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
      asignarImagenConRespaldo(img, imagenUrl)
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
  if (botonContinuar) botonContinuar.disabled = true
  if (spinnerConfirmarCompra?.classList) spinnerConfirmarCompra.classList.add('d-none')
  if (textoConfirmarCompra) textoConfirmarCompra.textContent = textoBotonPagar(0)
  claveIntento = null
  mostrarPaso('carrito')
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
      claveConfirmacion: claveIntento,
      destinatario: destinatarioValor,
      direccionEnvio: direccionValor,
      metodoPago: metodoPagoElegido()
    })
  } catch (errorValidacion) {
    mostrarError(errorValidacion)
    mostrarToast(errorValidacion.message, 'advertencia')
    return
  }
  // La misma clave viaja en los reintentos de este intento (idempotencia en CheckoutFacade).
  claveIntento = payload.claveConfirmacion || null

  compraEnProceso = true
  if (botonConfirmarCompra) botonConfirmarCompra.disabled = true
  if (spinnerConfirmarCompra) spinnerConfirmarCompra.classList.remove('d-none')
  if (textoConfirmarCompra) textoConfirmarCompra.textContent = 'Procesando pago...'
  estadoCarrito.className = 'alert alert-secondary py-2 small mb-2'
  estadoCarrito.textContent = 'Procesando pago simulado...'
  let confirmado = false
  try {
    const respuesta = await apiRequest('/api/pedidos/confirmar', {
      method: 'POST',
      json: payload
    })
    const cuerpo = await respuesta.json()
    confirmado = true
    claveIntento = null
    if (campoDestinatario) campoDestinatario.value = ''
    if (campoDireccion) campoDireccion.value = ''
    pintarConfirmacion({ destinatario: payload.destinatario, direccionEnvio: payload.direccionEnvio, ...cuerpo })
    mostrarPaso('confirmacion')
    pasoConfirmacion?.focus?.()
    await cargarCarrito()
    mostrarToast(`¡Compra confirmada! Pedido ${numeroPedido(cuerpo.idPedido)} generado.`, 'exito')
    document.dispatchEvent(new CustomEvent('retail:pedido-confirmado', { detail: cuerpo }))
  } catch (error) {
    if (!conservarClaveTrasError(error)) claveIntento = null
    const mensaje = mensajeErrorCompra(error)
    if (estadoCarrito) {
      estadoCarrito.className = `alert ${error?.status === 402 ? 'alert-warning' : 'alert-danger'} py-2 small mb-2`
      estadoCarrito.textContent = mensaje
    }
    mostrarToast(`No se pudo procesar la compra: ${error.message}`, 'error')
  } finally {
    compraEnProceso = false
    if (spinnerConfirmarCompra?.classList) spinnerConfirmarCompra.classList.add('d-none')
    if (textoConfirmarCompra) textoConfirmarCompra.textContent = textoBotonPagar(confirmado ? 0 : ultimoTotal)
    if (botonConfirmarCompra) {
      botonConfirmarCompra.disabled = !listaCarrito || listaCarrito.querySelectorAll('.cart-item').length === 0
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
    pintarEstadoConDeshacer(estadoCarrito, 'Producto agregado al carrito.', deshacerAccionCarrito)
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
    pintarEstadoConDeshacer(estadoCarrito, 'Producto quitado del carrito.', deshacerAccionCarrito)
    mostrarToast('Producto quitado del carrito.', 'info')
  } catch (error) {
    mostrarError(error)
    mostrarToast(`No se pudo quitar el producto: ${error.message}`, 'error')
  }
}
