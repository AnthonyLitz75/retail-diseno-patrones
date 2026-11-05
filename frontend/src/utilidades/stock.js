export function obtenerBadgeStock(stock) {
  const cantidad = Number(stock) || 0
  if (cantidad <= 0) {
    return {
      texto: 'Agotado',
      clase: 'badge bg-danger-subtle text-danger-emphasis border border-danger-subtle',
      estado: 'agotado',
      disponible: false
    }
  }
  if (cantidad <= 5) {
    return {
      texto: cantidad === 1 ? 'Última unidad' : `Últimas ${cantidad} unidades`,
      clase: 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle',
      estado: 'escaso',
      disponible: true
    }
  }
  return {
    texto: 'En stock',
    clase: 'badge bg-success-subtle text-success-emphasis border border-success-subtle',
    estado: 'disponible',
    disponible: true
  }
}

