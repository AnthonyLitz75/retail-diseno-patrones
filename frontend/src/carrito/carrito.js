// Mapeo y referencia a clases del stepper renderizadas en carrito-vista.js:
// cart-stepper, cart-stepper-btn, cart-stepper-qty
// Imagen con respaldo: asignarImagenConRespaldo(img, url)
import { apiRequest } from '../api/api.js'
import { mostrarToast } from '../utilidades/notificaciones.js'
import { formatoPrecio } from '../utilidades/formato.js'
import { asignarImagenConRespaldo, resolverImagenProducto } from '../catalogo/componentes/imagen-producto.js'
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
import { ROL, EVENTOS } from '../utilidades/constantes.js'
import {
  obtenerCarritoServicio,
  agregarProductoServicio,
  actualizarCantidadServicio,
  quitarProductoServicio,
  confirmarPedidoServicio
} from './carrito-servicio.js'
import {
  renderizarEstadoVacio,
  renderizarFilaProducto,
  renderizarResumenCheckout,
  renderizarConfirmacionPedido
} from './carrito-vista.js'

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
// Checkout en tres pasos: paso visible y clave del intento de compra en curso.
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
  if (estadoCarrito) {
    estadoCarrito.setAttribute?.('role', 'status')
    estadoCarrito.setAttribute?.('aria-live', 'polite')
  }
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
  if (listaCarrito && !listaCarrito._delegadoRegistrado) {
    listaCarrito._delegadoRegistrado = true
    listaCarrito.addEventListener('click', manejarAccionProductoCarrito)
  }
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
    mostrarToast('Inicia sesión para continuar con la entrega y el pago.', 'info')
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
  resumenCheckout.replaceChildren(...renderizarResumenCheckout(carrito, formatoPrecio))
}

/** Paso 3 (boceto "Compra confirmada"): número, estado, total, pago y entrega del pedido. */
function pintarConfirmacion(pedido) {
  if (!pasoConfirmacion) return
  const nodos = renderizarConfirmacionPedido(pedido, {
    formatoPrecio,
    numeroPedido,
    describirPago,
    alVerPedido: () => {
      obtenerOffcanvas()?.hide?.()
      mostrarPaso('carrito')
      window.location.hash = '#/pedidos'
    },
    alSeguirComprando: () => {
      obtenerOffcanvas()?.hide?.()
      mostrarPaso('carrito')
    }
  })
  pasoConfirmacion.replaceChildren(...nodos)
}

function mostrarError(error) {
  if (!estadoCarrito) return
  estadoCarrito.className = 'alert alert-danger py-2 small mb-2'
  estadoCarrito.setAttribute?.('role', 'alert')
  estadoCarrito.setAttribute?.('aria-live', 'polite')
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
    const respuesta = await actualizarCantidadServicio(apiRequest, productoId, nuevaCantidad)
    mostrarCarrito(await respuesta.json())
    pintarEstadoConDeshacer(estadoCarrito, 'Cantidad actualizada.', deshacerAccionCarrito)
  } catch (error) {
    mostrarError(error)
    await cargarCarrito()
  }
}

/**
 * Spec 005 (RF08): deshace la última acción del cliente sobre su carrito.
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
      await cargarCarrito()
      pintarEstadoConDeshacer(estadoCarrito, mensaje, deshacerAccionCarrito, document, 'advertencia')
      return
    }
    estadoCarrito.className = 'alert alert-warning py-2 small mb-2'
    estadoCarrito.textContent = mensaje
  }
}

function manejarAccionProductoCarrito(evento) {
  const boton = evento.target?.closest?.('[data-accion]')
  if (!boton || boton.disabled) return
  const accion = boton.dataset ? boton.dataset.accion : boton.getAttribute?.('data-accion')
  const productoId = Number(boton.dataset ? boton.dataset.productoId : boton.getAttribute?.('data-producto-id'))
  const cantidad = Number(boton.dataset ? boton.dataset.cantidad : boton.getAttribute?.('data-cantidad'))
  if (!productoId) return

  if (accion === 'quitar') {
    void quitarProducto(productoId)
  } else if (accion === 'decrementar') {
    void actualizarCantidadDirecta(productoId, cantidad - 1)
  } else if (accion === 'incrementar') {
    void actualizarCantidadDirecta(productoId, cantidad + 1)
  }
}

export function mostrarCarrito(carrito) {
  if (!listaCarrito || !totalCarrito) return
  if (!listaCarrito._delegadoRegistrado) {
    listaCarrito._delegadoRegistrado = true
    listaCarrito.addEventListener('click', manejarAccionProductoCarrito)
  }

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
    listaCarrito.append(renderizarEstadoVacio())
    return
  }

  estadoCarrito.className = 'small mb-2'
  estadoCarrito.textContent = ''

  for (const producto of carrito.productos) {
    listaCarrito.append(renderizarFilaProducto(producto, {
      formatoPrecio,
      resolverImagenProducto,
      asignarImagenConRespaldo
    }))
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
  // La misma clave viaja en los reintentos de este intento.
  claveIntento = payload.claveConfirmacion || null

  compraEnProceso = true
  if (botonConfirmarCompra) botonConfirmarCompra.disabled = true
  if (spinnerConfirmarCompra) spinnerConfirmarCompra.classList.remove('d-none')
  if (textoConfirmarCompra) textoConfirmarCompra.textContent = 'Procesando pago...'
  estadoCarrito.className = 'alert alert-secondary py-2 small mb-2'
  estadoCarrito.textContent = 'Procesando pago simulado...'
  let confirmado = false
  try {
    const respuesta = await confirmarPedidoServicio(apiRequest, payload)
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
    document.dispatchEvent(new CustomEvent(EVENTOS.PEDIDO_CONFIRMADO, { detail: cuerpo }))
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
    const respuesta = await obtenerCarritoServicio(apiRequest)
    mostrarCarrito(await respuesta.json())
  } catch (error) {
    mostrarError(error)
  }
}

export async function agregarProductoAlCarrito(productoId, productoObj = null, cantidad = 1) {
  const cant = Math.max(1, Number(cantidad) || 1)
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
    const respuesta = await agregarProductoServicio(apiRequest, productoId, cant)
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
    await quitarProductoServicio(apiRequest, productoId)
    await cargarCarrito()
    pintarEstadoConDeshacer(estadoCarrito, 'Producto quitado del carrito.', deshacerAccionCarrito)
    mostrarToast('Producto quitado del carrito.', 'info')
  } catch (error) {
    mostrarError(error)
    mostrarToast(`No se pudo quitar el producto: ${error.message}`, 'error')
  }
}
