const CLAVE_STORAGE_CARRITO_INVITADO = 'retail_guest_cart'

/**
 * Obtiene el estado actual del carrito de invitado desde localStorage
 * @returns {{ total: number, productos: Array }}
 */
export function obtenerCarritoInvitado() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { total: 0, productos: [] }
  }

  try {
    const raw = window.localStorage.getItem(CLAVE_STORAGE_CARRITO_INVITADO)
    if (!raw) return { total: 0, productos: [] }
    const datos = JSON.parse(raw)
    if (!Array.isArray(datos.productos)) return { total: 0, productos: [] }

    // Recalcular subtotales y total para asegurar consistencia
    let total = 0
    const productosValidos = datos.productos.map(p => {
      const cantidad = Math.max(1, Number(p.cantidad) || 1)
      const precio = Number(p.precio) || 0
      const subtotal = Math.round(precio * cantidad * 100) / 100
      total += subtotal
      return {
        ...p,
        cantidad,
        precio,
        subtotal
      }
    })

    return {
      total: Math.round(total * 100) / 100,
      productos: productosValidos
    }
  } catch {
    return { total: 0, productos: [] }
  }
}

/**
 * Guarda el carrito de invitado en localStorage
 * @param {{ total: number, productos: Array }} carrito
 */
export function guardarCarritoInvitado(carrito) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(CLAVE_STORAGE_CARRITO_INVITADO, JSON.stringify(carrito))
  } catch (error) {
    console.warn('No se pudo guardar el carrito de invitado:', error)
  }
}

/**
 * Agrega un producto al carrito de invitado o incrementa su cantidad
 * @param {Object} producto { id, nombre, precio, stock }
 * @param {number} cantidad
 * @returns {{ total: number, productos: Array }}
 */
export function agregarProductoInvitado(producto, cantidad = 1) {
  if (!producto || !producto.id) return obtenerCarritoInvitado()

  const carrito = obtenerCarritoInvitado()
  const productoId = Number(producto.id)
  const stockDisponible = Number(producto.stock) || 999
  const cantAAgregar = Math.max(1, Number(cantidad) || 1)

  const indexExistente = carrito.productos.findIndex(p => p.productoId === productoId)

  if (indexExistente >= 0) {
    const actual = carrito.productos[indexExistente]
    const nuevaCantidad = Math.min(stockDisponible, actual.cantidad + cantAAgregar)
    actual.cantidad = nuevaCantidad
    actual.subtotal = Math.round(actual.precio * nuevaCantidad * 100) / 100
    actual.stockDisponible = stockDisponible
  } else {
    const precio = Number(producto.precio) || 0
    const cantidadFinal = Math.min(stockDisponible, cantAAgregar)
    carrito.productos.push({
      productoId,
      nombre: producto.nombre || 'Producto',
      precio,
      cantidad: cantidadFinal,
      subtotal: Math.round(precio * cantidadFinal * 100) / 100,
      stockDisponible
    })
  }

  // Recalcular total
  carrito.total = Math.round(
    carrito.productos.reduce((acc, p) => acc + p.subtotal, 0) * 100
  ) / 100

  guardarCarritoInvitado(carrito)
  return carrito
}

/**
 * Actualiza directamente la cantidad de un ítem en el carrito de invitado
 * @param {number} productoId
 * @param {number} nuevaCantidad
 * @returns {{ total: number, productos: Array }}
 */
export function actualizarCantidadInvitado(productoId, nuevaCantidad) {
  const id = Number(productoId)
  const cantidad = Number(nuevaCantidad)
  const carrito = obtenerCarritoInvitado()

  if (cantidad <= 0) {
    return quitarProductoInvitado(id)
  }

  const item = carrito.productos.find(p => p.productoId === id)
  if (item) {
    const stockMaximo = item.stockDisponible || 999
    item.cantidad = Math.min(stockMaximo, cantidad)
    item.subtotal = Math.round(item.precio * item.cantidad * 100) / 100

    carrito.total = Math.round(
      carrito.productos.reduce((acc, p) => acc + p.subtotal, 0) * 100
    ) / 100
    guardarCarritoInvitado(carrito)
  }

  return carrito
}

/**
 * Elimina un producto del carrito de invitado
 * @param {number} productoId
 * @returns {{ total: number, productos: Array }}
 */
export function quitarProductoInvitado(productoId) {
  const id = Number(productoId)
  const carrito = obtenerCarritoInvitado()

  carrito.productos = carrito.productos.filter(p => p.productoId !== id)
  carrito.total = Math.round(
    carrito.productos.reduce((acc, p) => acc + p.subtotal, 0) * 100
  ) / 100

  guardarCarritoInvitado(carrito)
  return carrito
}

/**
 * Limpia el carrito de invitado
 */
export function limpiarCarritoInvitado() {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.removeItem(CLAVE_STORAGE_CARRITO_INVITADO)
}

/**
 * Determina si hay ítems en el carrito de invitado
 * @returns {boolean}
 */
export function hayCarritoInvitado() {
  const carrito = obtenerCarritoInvitado()
  return carrito.productos.length > 0
}

/**
 * Sincroniza los ítems del carrito de invitado con el backend al iniciar sesión
 * @param {Function} apiRequest
 * @returns {Promise<number>} Número de ítems sincronizados
 */
export async function sincronizarCarritoInvitadoConBackend(apiRequest) {
  const carrito = obtenerCarritoInvitado()
  if (carrito.productos.length === 0) return 0

  let sincronizados = 0
  for (const item of carrito.productos) {
    try {
      await apiRequest('/api/carrito/productos', {
        method: 'POST',
        json: {
          productoId: item.productoId,
          cantidad: item.cantidad
        }
      })
      sincronizados++
    } catch (err) {
      console.warn(`No se pudo sincronizar producto ${item.productoId}:`, err)
    }
  }

  limpiarCarritoInvitado()
  return sincronizados
}
