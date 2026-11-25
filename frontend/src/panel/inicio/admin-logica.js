/**
 * @file admin-logica.js
 * Panel del personal (spec 17 y decisiones de T09): cálculos del Inicio del Administrador.
 * Funciones puras, sin DOM ni red. Reutiliza indicadoresDestacados (valores ya formateados),
 * contarPestanas (stock bajo, como en T07) y describirActor (usuario · rol de la auditoría).
 */

import { indicadoresDestacados } from "../../administracion/administracion.js";
import { describirActor } from "../../administracion/auditoria-vista.js";
import { contarPestanas } from "../../catalogo/gestion/panel-productos.js";
import { formatearFechaHora, plural } from "../utilidades-panel.js";

export const TAMANO_ACTIVIDAD = 5;

/** Orden de las barras de «Pedidos por estado» (spec 17). */
export const ORDEN_ESTADOS_PEDIDO = Object.freeze(["PENDIENTE", "EN_PREPARACION", "DESPACHADO", "ENTREGADO", "CANCELADO"]);

const NOMBRE_ESTADO = Object.freeze({
  PENDIENTE: "Pendiente",
  EN_PREPARACION: "En preparación",
  DESPACHADO: "Despachado",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado",
});

/** Clave de color de cada estado (variables --panel-estado-* de panel.css). */
const COLOR_ESTADO = Object.freeze({
  PENDIENTE: "pendiente",
  EN_PREPARACION: "en-preparacion",
  DESPACHADO: "despachado",
  ENTREGADO: "entregado",
  CANCELADO: "cancelado",
});
const COLOR_OTRO = "otro";

const PORCENTAJE_TOTAL = 100;

/**
 * Los cuatro indicadores (spec 17). Los valores salen de indicadoresDestacados, que ya formatea
 * los importes; los detalles son los de la spec.
 */
export function indicadoresAdmin(resumen) {
  const [ventas, vendidos, escalados, inventario] = indicadoresDestacados(resumen);
  return [
    { etiqueta: "Ventas netas", valor: ventas.valor, detalle: "Sin pedidos cancelados" },
    { etiqueta: "Pedidos vendidos", valor: vendidos.valor, detalle: "No incluye cancelados" },
    {
      etiqueta: "Reclamos escalados",
      valor: escalados.valor,
      detalle: (resumen.escalados ?? 0) === 0 ? "Ninguno abierto" : "Esperan al administrador",
    },
    { etiqueta: "Valor del inventario", valor: inventario.valor, detalle: `${plural(resumen.unidadesEnStock ?? 0, "unidad", "unidades")} · ${plural(resumen.productosActivos ?? 0, "producto", "productos")}` },
  ];
}

/**
 * «Requiere tu atención»: filas que aplican (stock bajo, escalados, pedidos en preparación) y,
 * por cada fuente que no cargó (null), su línea de fallo.
 * @param {{ resumen: object|null, productos: Array<object>|null }} datos
 */
export function filasAtencion({ resumen, productos }) {
  const filas = [];
  const fallos = [];
  if (productos) {
    const stockBajo = contarPestanas(productos)["stock-bajo"];
    if (stockBajo > 0) {
      filas.push({ texto: `${plural(stockBajo, "producto con stock bajo", "productos con stock bajo")}`, detalle: "Revisa el inventario antes de que se agoten", enlace: "Ver inventario", ruta: "#/inventario" });
    }
  }
  if (resumen) {
    const escalados = resumen.escalados ?? 0;
    if (escalados > 0) {
      filas.push({ texto: `${plural(escalados, "reclamo escalado", "reclamos escalados")}`, detalle: "Soporte pidió tu intervención", enlace: "Ver incidencias", ruta: "#/incidencias" });
    }
    const enPreparacion = resumen.pedidosPorEstado?.EN_PREPARACION ?? 0;
    if (enPreparacion > 0) {
      filas.push({ texto: `${plural(enPreparacion, "pedido en preparación", "pedidos en preparación")}`, detalle: "Almacén los está atendiendo", enlace: "Ver pedidos", ruta: "#/pedidos" });
    }
  }
  if (!productos) fallos.push({ texto: "No se pudo comprobar stock.", fuente: "gestion" });
  if (!resumen) fallos.push({ texto: "No se pudo comprobar pedidos y reclamos.", fuente: "resumen" });
  return { filas, fallos };
}

/**
 * Barras de «Pedidos por estado»: solo estados > 0, en ORDEN_ESTADOS_PEDIDO y, al final, los
 * códigos que la spec no nombra (tal cual, en color neutro). Ancho sobre el total de pedidos.
 */
export function estadosPedidos(pedidosPorEstado) {
  const conteo = pedidosPorEstado && typeof pedidosPorEstado === "object" ? pedidosPorEstado : {};
  const total = Object.values(conteo).reduce((suma, n) => suma + (Number(n) || 0), 0);
  const desconocidos = Object.keys(conteo).filter((codigo) => !ORDEN_ESTADOS_PEDIDO.includes(codigo));
  const barras = [...ORDEN_ESTADOS_PEDIDO, ...desconocidos]
    .filter((codigo) => (Number(conteo[codigo]) || 0) > 0)
    .map((codigo) => {
      const cantidad = Number(conteo[codigo]);
      return {
        codigo,
        nombre: NOMBRE_ESTADO[codigo] ?? codigo,
        cantidad,
        porcentaje: (cantidad / total) * PORCENTAJE_TOTAL,
        color: COLOR_ESTADO[codigo] ?? COLOR_OTRO,
      };
    });
  return { total, barras };
}

/**
 * Las acciones más recientes de GET /api/admin/auditoria?tamano=5 (el backend ya ordena de la
 * más reciente a la más antigua). Título: la etiqueta que manda el backend o el código.
 * @param {{ items?: Array<object> }|null} pagina
 */
export function actividadReciente(pagina) {
  const items = Array.isArray(pagina?.items) ? pagina.items : [];
  return items.slice(0, TAMANO_ACTIVIDAD).map((registro) => ({
    titulo: registro.accionEtiqueta || registro.accion,
    detalle: `${describirActor(registro)} · ${formatearFechaHora(registro.fecha)}`,
    // Por separado para que la vista deje la fecha en una sola línea (white-space: nowrap).
    actor: describirActor(registro),
    fecha: formatearFechaHora(registro.fecha),
  }));
}
