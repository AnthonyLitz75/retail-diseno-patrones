/**
 * @file iconos.js
 * Panel del personal (spec 11): íconos SVG en línea, definidos una sola vez. Trazo 1.8,
 * stroke="currentColor", viewBox 24×24. Son decorativos: van con aria-hidden y el texto
 * de la entrada o del botón da el nombre accesible.
 */

/** Trazados interiores de cada ícono, por nombre (los del menú, «tienda» y «cerrar-sesion»). */
export const ICONOS = Object.freeze({
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  pedidos: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5"/><path d="M12 12v9"/>',
  productos: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  inventario: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M3 15h18"/><path d="M9 4v16"/>',
  categorias: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cuentas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  reportes: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M3 20h18"/>',
  auditoria: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  incidencias: '<path d="M12 3 2 20h20z"/><path d="M12 9.5v4.5"/><path d="M12 17h.01"/>',
  consultas: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.4A8 8 0 1 1 21 12z"/><path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.9c0 1.6-2.2 2-2.2 3.3"/><path d="M12 16.5h.01"/>',
  reclamos: '<path d="M4 4h16v12H8l-4 4z"/><path d="M12 7.5v4"/><path d="M12 14h.01"/>',
  devoluciones: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  "consulta-pedido": '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  descarga: '<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/>',
  mas: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  verificacion: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>',
  pagado: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18"/><path d="M7 15h3"/>',
  preparacion: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5"/><path d="M12 12v9"/>',
  despacho: '<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  entrega: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  cancelar: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/>',
  tienda: '<path d="M3 9.5 4.7 4h14.6L21 9.5"/><path d="M3 9.5a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12.5V20h14v-7.5"/><path d="M10 20v-4.5h4V20"/>',
  "cerrar-sesion": '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
});

/**
 * SVG decorativo del ícono pedido; cadena vacía si no existe.
 * @param {string} nombre
 * @returns {string}
 */
export function icono(nombre) {
  if (!Object.hasOwn(ICONOS, nombre)) return "";
  return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONOS[nombre]}</svg>`;
}
