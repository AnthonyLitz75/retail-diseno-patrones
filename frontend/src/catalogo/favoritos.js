const CLAVE_STORAGE_FAVORITOS = 'retail_wishlist'

/**
 * Obtiene el conjunto de IDs de productos en favoritos desde localStorage
 * @returns {number[]}
 */
export function obtenerFavoritos() {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(CLAVE_STORAGE_FAVORITOS)
    if (!raw) return []
    const ids = JSON.parse(raw)
    return Array.isArray(ids) ? ids.map(Number).filter(n => Number.isInteger(n) && n > 0) : []
  } catch {
    return []
  }
}

/**
 * Verifica si un producto específico está en favoritos
 * @param {number} productoId
 * @returns {boolean}
 */
export function esFavorito(productoId) {
  const id = Number(productoId)
  if (!id) return false
  const favoritos = obtenerFavoritos()
  return favoritos.includes(id)
}

/**
 * Alterna el estado de un producto en favoritos (agrega o remueve)
 * @param {number} productoId
 * @returns {{ activo: boolean, total: number }}
 */
export function alternarFavorito(productoId) {
  const id = Number(productoId)
  if (!id) return { activo: false, total: 0 }

  const favoritos = obtenerFavoritos()
  const index = favoritos.indexOf(id)
  let activo

  if (index >= 0) {
    favoritos.splice(index, 1)
    activo = false
  } else {
    favoritos.push(id)
    activo = true
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(CLAVE_STORAGE_FAVORITOS, JSON.stringify(favoritos))
    } catch (err) {
      console.warn('No se pudo guardar la lista de favoritos:', err)
    }
  }

  return { activo, total: favoritos.length }
}
