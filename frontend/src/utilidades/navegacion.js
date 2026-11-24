import { ROL } from "./constantes.js"
export const VISTAS_DISPONIBLES = {
  tienda: { id: 'vista-tienda', tabId: 'tab-tienda' },
  pedidos: { id: 'vista-pedidos', tabId: 'tab-pedidos' },
  inventario: { id: 'vista-inventario', tabId: 'tab-inventario' },
  productos: { id: 'vista-productos', tabId: 'tab-productos' },
  administracion: { id: 'vista-administracion', tabId: 'tab-administracion' },
  consultas: { id: 'vista-consultas', tabId: 'tab-consultas' },
  soporte: { id: 'vista-soporte', tabId: 'tab-soporte' },
  atencion: { id: 'vista-atencion', tabId: 'tab-atencion' }
}

/**
 * Vistas de la tienda por rol. El personal (ADMIN, VENDEDOR, ALMACEN, SOPORTE) trabaja en el
 * panel (panel.html, T11): en la tienda solo ve la tienda, como un visitante con sesión.
 */
export function determinarVistasPorRol(rol) {
  switch (rol) {
    case ROL.CLIENTE:
      return ['tienda', 'pedidos', 'atencion']
    default:
      return ['tienda']
  }
}

export function obtenerVistaPorDefecto() {
  return 'tienda'
}

export function obtenerEtiquetaPestaña(vista, rol) {
  const etiquetas = {
    tienda: rol === ROL.ALMACEN ? 'Catálogo' : 'Tienda',
    pedidos: rol === ROL.CLIENTE ? 'Mis compras' : 'Gestión de pedidos',
    productos: 'Productos',
    inventario: 'Inventario y kardex',
    administracion: 'Administración',
    consultas: 'Consultas de clientes',
    soporte: 'Atención al cliente',
    atencion: 'Mi atención'
  }
  return etiquetas[vista] || vista
}

/** El personal (no el cliente) con más de un módulo usa el menú lateral en escritorio. */
export function usaMenuLateral(rol, vistas = determinarVistasPorRol(rol)) {
  return Boolean(rol) && rol !== ROL.CLIENTE && vistas.length > 1
}

export function esVistaPermitida(vista, rol) {
  const permitidas = determinarVistasPorRol(rol)
  return permitidas.includes(vista)
}


/** Rutas de la SPA que abren directamente una vista (spec 007, T003). */
const VISTA_POR_HASH = { '#/pedidos': 'pedidos' }

/**
 * Vista con la que arranca la sesión: la que pide la URL si el rol la tiene (así un enlace
 * o un retorno del login a #/pedidos no se pierde), y si no, la vista por defecto del rol.
 */
export function obtenerVistaInicial (rol, hash = '') {
  const solicitada = Object.hasOwn(VISTA_POR_HASH, hash) ? VISTA_POR_HASH[hash] : null
  return solicitada && esVistaPermitida(solicitada, rol) ? solicitada : obtenerVistaPorDefecto(rol)
}
