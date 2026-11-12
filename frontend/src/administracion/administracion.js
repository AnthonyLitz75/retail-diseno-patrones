import { formatoPrecio } from "../utilidades/formato.js";

export async function listarCuentas(apiRequest) {
  return (await apiRequest("/api/admin/usuarios")).json();
}

export async function registrarPersonal(apiRequest, datos) {
  return apiRequest("/api/admin/usuarios", { method: "POST", json: datos });
}

export async function cambiarRol(apiRequest, id, rol) {
  return apiRequest(`/api/admin/usuarios/${id}/rol`, {
    method: "PATCH",
    json: { rol },
  });
}

export async function desactivarCuenta(apiRequest, id) {
  return apiRequest(`/api/admin/usuarios/${id}/desactivar`, { method: "PUT" });
}

export async function listarCategoriasAdmin(apiRequest) {
  return (await apiRequest("/api/admin/categorias")).json();
}

export async function crearCategoria(apiRequest, nombre) {
  return apiRequest("/api/admin/categorias", {
    method: "POST",
    json: { nombre },
  });
}

export async function actualizarCategoria(apiRequest, id, nombre) {
  return apiRequest(`/api/admin/categorias/${id}`, {
    method: "PUT",
    json: { nombre },
  });
}

export async function cambiarEstadoCategoria(apiRequest, id, activa) {
  return apiRequest(`/api/admin/categorias/${id}/estado`, {
    method: "PATCH",
    json: { activa },
  });
}

export function crearParametrosReporte(desde, hasta) {
  if (desde && hasta && desde > hasta) {
    throw new TypeError(
      "La fecha inicial no puede ser posterior a la fecha final.",
    );
  }
  // Contrato 007: fechas yyyy-MM-dd; el backend cubre el día completo en hora de Lima.
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  return parametros.toString();
}

/** Reportes CSV disponibles (spec 007, US7). El inventario es una foto: no usa fechas. */
export const REPORTES_CSV = {
  ventas: { archivo: "ventas.csv", conFechas: true },
  inventario: { archivo: "inventario.csv", conFechas: false },
  movimientos: { archivo: "movimientos.csv", conFechas: true },
};

export function solicitarCsv(apiRequest, tipo, consulta) {
  const reporte = REPORTES_CSV[tipo];
  if (!reporte) throw new TypeError(`Reporte desconocido: ${tipo}`);
  const filtro = reporte.conFechas && consulta ? `?${consulta}` : "";
  return apiRequest(`/api/admin/reportes/${reporte.archivo}${filtro}`);
}

function soles(valor) {
  return formatoPrecio(valor ?? 0);
}

function resumirConteo(conteo, vacio) {
  return Object.entries(conteo || {})
    .map(([clave, cantidad]) => `${clave.replaceAll("_", " ")}: ${cantidad}`)
    .join(" · ") || vacio;
}

/** Tarjetas del panel de supervisión (RF05) como pares [etiqueta, valor]. */
export function tarjetasResumen(resumen) {
  return [
    ["Ventas netas (sin cancelados)", soles(resumen.ventasNetas)],
    ["Pedidos vendidos", resumen.pedidosVendidos ?? 0],
    ["Pedidos por estado", resumirConteo(resumen.pedidosPorEstado, "Sin pedidos")],
    ["Reclamos escalados abiertos", resumen.escalados ?? 0],
    ["Productos activos", resumen.productosActivos ?? 0],
    ["Unidades en stock", resumen.unidadesEnStock ?? 0],
    ["Valor del inventario", soles(resumen.valorInventario)],
    ["Movimientos", resumirConteo(resumen.movimientos, "Sin movimientos")],
  ];
}

/**
 * Los cuatro indicadores de la cabecera de Administración (boceto del panel), sin rango de
 * fechas: lo que el administrador revisa primero al entrar.
 * @returns {{etiqueta: string, valor: string, nota: string}[]}
 */
export function indicadoresDestacados(resumen = {}) {
  const pendientes = resumen.pedidosPorEstado?.PENDIENTE ?? 0;
  const escalados = resumen.escalados ?? 0;
  return [
    { etiqueta: "Ventas netas", valor: soles(resumen.ventasNetas), nota: "Sin pedidos cancelados" },
    {
      etiqueta: "Pedidos vendidos",
      valor: String(resumen.pedidosVendidos ?? 0),
      nota: pendientes === 1 ? "1 pendiente de preparar" : `${pendientes} pendientes de preparar`,
    },
    {
      etiqueta: "Reclamos escalados",
      valor: String(escalados),
      nota: escalados === 0 ? "Ninguno abierto" : "Abiertos, revisa Incidencias",
    },
    {
      etiqueta: "Valor del inventario",
      valor: soles(resumen.valorInventario),
      nota: `${resumen.unidadesEnStock ?? 0} unidades · ${resumen.productosActivos ?? 0} productos`,
    },
  ];
}

export async function cargarResumenAdmin(apiRequest, consulta) {
  return (
    await apiRequest(
      `/api/admin/reportes/resumen${consulta ? `?${consulta}` : ""}`,
    )
  ).json();
}
