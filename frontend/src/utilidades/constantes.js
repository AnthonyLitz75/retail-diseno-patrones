/**
 * @file constantes.js
 * Roles, estados de pedido, eventos del sistema y constantes globales de Píxel Andino.
 * Los grupos de roles deciden qué se muestra u oculta en la interfaz: quien autoriza
 * cada petición es siempre el backend (SecurityConfig).
 */

export const ROL = Object.freeze({
  CLIENTE: "CLIENTE",
  ADMIN: "ADMIN",
  VENDEDOR: "VENDEDOR",
  ALMACEN: "ALMACEN",
  SOPORTE: "SOPORTE",
});

/** Todos los roles, en el orden en que se ofrecen al administrador. */
export const ROLES = Object.freeze(Object.values(ROL));

/** Editan fichas y precios del catálogo. */
export const ROLES_CATALOGO = Object.freeze([ROL.ADMIN, ROL.VENDEDOR]);

/** Ven inventario, kardex y ajustan stock. */
export const ROLES_INVENTARIO = Object.freeze([ROL.ADMIN, ROL.VENDEDOR, ROL.ALMACEN]);

/** Preparan, despachan y entregan pedidos; registran entradas de mercadería. */
export const ROLES_OPERACION = Object.freeze([ROL.ADMIN, ROL.ALMACEN]);

export const ESTADO_PEDIDO = Object.freeze({
  PENDIENTE: "PENDIENTE",
  EN_PREPARACION: "EN_PREPARACION",
  DESPACHADO: "DESPACHADO",
  ENTREGADO: "ENTREGADO",
  CANCELADO: "CANCELADO",
});

/** Nombres de eventos personalizados del DOM para comunicación desacoplada. */
export const EVENTOS = Object.freeze({
  PEDIDO_CONFIRMADO: "retail:pedido-confirmado",
  PRODUCTO_CREADO: "retail:producto-creado",
  CARRITO_ACTUALIZADO: "retail:carrito-actualizado",
});

/** Vistas y módulos de la SPA. */
export const VISTAS = Object.freeze({
  CATALOGO: "catalogo",
  PRODUCTOS: "productos",
  PEDIDOS: "pedidos",
  INVENTARIO: "inventario",
  ADMINISTRACION: "administracion",
  SOPORTE: "soporte",
});

/** Tipos de notificaciones toast. */
export const TIPO_TOAST = Object.freeze({
  EXITO: "exito",
  ERROR: "error",
  ADVERTENCIA: "advertencia",
  INFO: "info",
});
