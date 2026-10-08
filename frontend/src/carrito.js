let seccionCarrito
let estadoCarrito
let listaCarrito
let totalCarrito
let botonConfirmarCompra
let compraEnProceso = false

export function inicializarCarrito() {
  seccionCarrito = document.querySelector('#seccion-carrito')
  estadoCarrito = document.querySelector('#estado-carrito')
  listaCarrito = document.querySelector('#productos-carrito')
  totalCarrito = document.querySelector('#total-carrito')
  botonConfirmarCompra = document.querySelector('#confirmar-compra')
  botonConfirmarCompra.addEventListener('click', confirmarCompra)
}

function formatoPrecio(valor) {
  return Number(valor).toLocaleString('es-PE', {
    style: 'currency',
    currency: 'PEN'
  })
}

function mostrarError(error) {
  estadoCarrito.className = 'mt-3 mb-2 text-danger'
  estadoCarrito.textContent = error.message
}

function mostrarCarrito(carrito) {
  listaCarrito.replaceChildren()
  totalCarrito.textContent = 'Total: ' + formatoPrecio(carrito.total)
  const contadorCarrito = document.querySelector('#contador-carrito')
  if (contadorCarrito) contadorCarrito.textContent = String(carrito.productos.reduce((total, producto) => total + producto.cantidad, 0))
  botonConfirmarCompra.disabled = compraEnProceso || carrito.productos.length === 0

  if (carrito.productos.length === 0) {
    estadoCarrito.className = 'mt-3 mb-2 text-secondary'
    estadoCarrito.textContent = 'Tu carrito está vacío.'
    return
  }

  estadoCarrito.textContent = ''

  for (const producto of carrito.productos) {
    const fila = document.createElement('li')
    fila.className = 'list-group-item d-flex flex-wrap align-items-center justify-content-between gap-3'

    const informacion = document.createElement('div')
    const nombre = document.createElement('strong')
    nombre.textContent = producto.nombre
    const detalle = document.createElement('div')
    detalle.className = 'small text-secondary'
    detalle.textContent =
      formatoPrecio(producto.precio) + ' por unidad · Subtotal: ' +
      formatoPrecio(producto.subtotal)
    informacion.append(nombre, detalle)

    const controles = document.createElement('div')
    controles.className = 'd-flex align-items-center gap-2'

    const etiquetaCantidad = document.createElement('label')
    etiquetaCantidad.className = 'visually-hidden'
    etiquetaCantidad.htmlFor = 'cantidad-carrito-' + producto.productoId
    etiquetaCantidad.textContent = 'Cantidad de ' + producto.nombre

    const cantidad = document.createElement('input')
    cantidad.id = etiquetaCantidad.htmlFor
    cantidad.className = 'form-control form-control-sm'
    cantidad.type = 'number'
    cantidad.min = '1'
    cantidad.max = String(producto.stockDisponible)
    cantidad.step = '1'
    cantidad.value = String(producto.cantidad)
    cantidad.style.width = '5rem'
    cantidad.addEventListener('change', () =>
      actualizarCantidad(producto.productoId, cantidad)
    )

    const quitar = document.createElement('button')
    quitar.type = 'button'
    quitar.className = 'btn btn-outline-danger btn-sm'
    quitar.textContent = 'Quitar'
    quitar.addEventListener('click', () => quitarProducto(producto.productoId))

    controles.append(etiquetaCantidad, cantidad, quitar)
    fila.append(informacion, controles)
    listaCarrito.append(fila)
  }
}

export function ocultarCarrito() {
  seccionCarrito.hidden = true
  listaCarrito.replaceChildren()
  estadoCarrito.textContent = ''
  totalCarrito.textContent = ''
  const contadorCarrito = document.querySelector('#contador-carrito')
  if (contadorCarrito) contadorCarrito.textContent = '0'
  botonConfirmarCompra.disabled = true
}

async function confirmarCompra() {
  if (compraEnProceso) return

  compraEnProceso = true
  botonConfirmarCompra.disabled = true
  estadoCarrito.className = 'mt-3 mb-2 text-secondary'
  estadoCarrito.textContent = 'Procesando pago simulado...'
  try {
    const respuesta = await fetch('/api/pedidos/confirmar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ metodoPago: 'PRUEBA_APROBADA' })
    })
    const cuerpo = await respuesta.json().catch(() => ({}))
    if (!respuesta.ok) {
      throw new Error(cuerpo.error || cuerpo.message || `No se pudo confirmar la compra (código ${respuesta.status}).`)
    }

    await cargarCarrito()
    estadoCarrito.className = 'mt-3 mb-2 text-success'
    estadoCarrito.textContent = `Compra confirmada. Se creó el pedido #${cuerpo.idPedido}.`
    document.dispatchEvent(new CustomEvent('retail:pedido-confirmado', { detail: cuerpo }))
  } catch (error) {
    mostrarError(error)
  } finally {
    compraEnProceso = false
    botonConfirmarCompra.disabled = listaCarrito.children.length === 0
  }
}

export async function cargarCarrito() {
  seccionCarrito.hidden = false
  estadoCarrito.className = 'mt-3 mb-2 text-secondary'
  estadoCarrito.textContent = 'Cargando carrito...'

  try {
    const respuesta = await fetch('/api/carrito', {
      credentials: 'same-origin'
    })

    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el carrito (código ' + respuesta.status + ').')
    }

    mostrarCarrito(await respuesta.json())
  } catch (error) {
    mostrarError(error)
  }
}

export async function agregarProductoAlCarrito(productoId) {
  estadoCarrito.className = 'mt-3 mb-2 text-secondary'
  estadoCarrito.textContent = 'Agregando producto...'

  try {
    const respuesta = await fetch('/api/carrito/productos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ productoId, cantidad: 1 })
    })

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}))
      throw new Error(cuerpo.error || 'No se pudo agregar el producto (código ' + respuesta.status + ').')
    }

    mostrarCarrito(await respuesta.json())
    estadoCarrito.className = 'mt-3 mb-2 text-success'
    estadoCarrito.textContent = 'Producto agregado al carrito.'
  } catch (error) {
    mostrarError(error)
  }
}

async function actualizarCantidad(productoId, campo) {
  const cantidad = Number(campo.value)
  const maximo = Number(campo.max)

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > maximo) {
    estadoCarrito.className = 'mt-3 mb-2 text-danger'
    estadoCarrito.textContent = 'Ingresa una cantidad entre 1 y ' + maximo + '.'
    await cargarCarrito()
    return
  }

  estadoCarrito.className = 'mt-3 mb-2 text-secondary'
  estadoCarrito.textContent = 'Actualizando cantidad...'

  try {
    const respuesta = await fetch('/api/carrito/productos/' + productoId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ cantidad })
    })

    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}))
      throw new Error(cuerpo.error || 'No se pudo actualizar la cantidad (código ' + respuesta.status + ').')
    }

    mostrarCarrito(await respuesta.json())
    estadoCarrito.className = 'mt-3 mb-2 text-success'
    estadoCarrito.textContent = 'Cantidad actualizada.'
  } catch (error) {
    mostrarError(error)
    await cargarCarrito()
  }
}

async function quitarProducto(productoId) {
  estadoCarrito.className = 'mt-3 mb-2 text-secondary'
  estadoCarrito.textContent = 'Quitando producto...'

  try {
    const respuesta = await fetch('/api/carrito/productos/' + productoId, {
      method: 'DELETE',
      credentials: 'same-origin'
    })

    if (!respuesta.ok) {
      throw new Error('No se pudo quitar el producto (código ' + respuesta.status + ').')
    }

    await cargarCarrito()
    estadoCarrito.className = 'mt-3 mb-2 text-success'
    estadoCarrito.textContent = 'Producto quitado del carrito.'
  } catch (error) {
    mostrarError(error)
  }
}
