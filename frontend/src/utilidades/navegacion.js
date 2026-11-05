export const VISTAS_DISPONIBLES = {
  tienda: { id: 'vista-tienda', tabId: 'tab-tienda' },
  pedidos: { id: 'vista-pedidos', tabId: 'tab-pedidos' },
  inventario: { id: 'vista-inventario', tabId: 'tab-inventario' },
  administracion: { id: 'vista-administracion', tabId: 'tab-administracion' },
  consultas: { id: 'vista-consultas', tabId: 'tab-consultas' }
}

export function determinarVistasPorRol(rol) {
  switch (rol) {
    case 'ADMIN':
      return ['administracion', 'tienda', 'pedidos', 'inventario']
    case 'ALMACEN':
      return ['pedidos', 'inventario', 'tienda']
    case 'VENDEDOR':
      return ['tienda', 'consultas', 'pedidos', 'inventario']
    case 'CLIENTE':
      return ['tienda', 'pedidos']
    default:
      return ['tienda']
  }
}

export function obtenerVistaPorDefecto(rol) {
  switch (rol) {
    case 'ADMIN':
      return 'administracion'
    case 'ALMACEN':
      return 'pedidos'
    default:
      return 'tienda'
  }
}

export function obtenerEtiquetaPestaña(vista, rol) {
  const etiquetas = {
    tienda: rol === 'ALMACEN' ? 'Catálogo' : 'Tienda',
    pedidos: rol === 'CLIENTE' ? 'Mis compras' : 'Gestión de pedidos',
    inventario: 'Inventario y kardex',
    administracion: 'Administración',
    consultas: 'Consultas de clientes'
  }
  return etiquetas[vista] || vista
}

export function esVistaPermitida(vista, rol) {
  const permitidas = determinarVistasPorRol(rol)
  return permitidas.includes(vista)
}

