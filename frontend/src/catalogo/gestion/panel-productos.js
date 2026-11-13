/**
 * @file panel-productos.js
 * Vista "Productos" del personal (boceto "Panel de personal - productos"): tabla con
 * búsqueda, categoría, pestañas Activos / Desactivados / Stock bajo, paginación y el menú
 * "Gestionar" de cada producto. Reemplaza la lista suelta de desactivados: reactivar es
 * una acción más de la pestaña "Desactivados".
 */

import { crearElemento as el } from "../../utilidades/dom.js";
import { formatoPrecio } from "../../utilidades/formato.js";
import { etiquetarCeldas } from "../../utilidades/tabla-apilable.js";
import { crearMenuAcciones } from "../../utilidades/menu-acciones.js";
import { crearControlesPaginacionKardex } from "../../inventario/inventario-vista.js";
import { accionesPersonalProducto } from "../componentes/tarjeta-producto.js";
import { cambiarEstadoProducto, listarProductosGestion } from "./gestion-producto.js";
import { ROLES_CATALOGO, ROLES_INVENTARIO } from "../../utilidades/constantes.js";

/** Mismo umbral que las tarjetas de la tienda ("Quedan N"). */
export const UMBRAL_STOCK_BAJO = 5;
export const PRODUCTOS_POR_PAGINA = 10;
export const PESTANAS_PRODUCTOS = Object.freeze([
  { clave: "activos", etiqueta: "Activos" },
  { clave: "desactivados", etiqueta: "Desactivados" },
  { clave: "stock-bajo", etiqueta: "Stock bajo" },
]);
const COLUMNAS = ["Producto", "Categoría", "Precio", "Stock", "Estado", "Acciones"];

const esActivo = (producto) => producto.activo !== false;
const tieneStockBajo = (producto) => esActivo(producto) && producto.stock <= UMBRAL_STOCK_BAJO;
const normalizar = (texto) => String(texto ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function contarPestanas(productos = []) {
  return {
    activos: productos.filter(esActivo).length,
    desactivados: productos.filter((p) => !esActivo(p)).length,
    "stock-bajo": productos.filter(tieneStockBajo).length,
  };
}

/** "32 activos · 4 desactivados · 4 con stock bajo" */
export function resumenProductos(productos = []) {
  const c = contarPestanas(productos);
  return `${c.activos} activos · ${c.desactivados} desactivados · ${c["stock-bajo"]} con stock bajo`;
}

/** Filtra por pestaña, categoría y texto (nombre o código, sin importar tildes). */
export function filtrarProductosGestion(productos = [], { pestana = "activos", categoria = "", texto = "" } = {}) {
  const buscado = normalizar(texto);
  return productos
    .filter((p) => (pestana === "desactivados" ? !esActivo(p) : pestana === "stock-bajo" ? tieneStockBajo(p) : esActivo(p)))
    .filter((p) => !categoria || p.categoria === categoria)
    .filter((p) => !buscado || normalizar(p.nombre).includes(buscado) || normalizar(p.sku).includes(buscado))
    .sort((a, b) => (pestana === "stock-bajo" ? a.stock - b.stock : 0) || String(a.sku ?? "").localeCompare(String(b.sku ?? "")));
}

export function paginarLista(lista, pagina = 1, tamano = PRODUCTOS_POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(lista.length / tamano));
  const actual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (actual - 1) * tamano;
  return { items: lista.slice(inicio, inicio + tamano), pagina: actual, totalPaginas, inicio };
}

/**
 * @param {object} opciones
 * @param {Function} opciones.apiRequest
 * @param {() => object} opciones.obtenerUsuario sesión actual (para las acciones por rol)
 * @param {() => object} opciones.obtenerCallbacks modales de ficha, precio, stock y movimientos
 * @param {Function} [opciones.confirmar] confirmación antes de desactivar
 * @param {Function} [opciones.mostrarToast]
 * @param {Function} [opciones.alCambiarEstado] tras activar o desactivar (recargar la tienda)
 */
export function crearPanelProductos({
  apiRequest,
  obtenerUsuario = () => null,
  obtenerCallbacks = () => ({}),
  confirmar = async () => true,
  mostrarToast = null,
  alCambiarEstado = null,
}) {
  const seccion = el("div", "panel-productos mt-4");

  const barra = el("div", "panel-productos-barra");
  const busqueda = el("input", "form-control");
  busqueda.type = "search";
  busqueda.id = "buscar-gestion-productos";
  busqueda.placeholder = "Buscar por nombre o código";
  busqueda.setAttribute("aria-label", "Buscar productos por nombre o código");
  const categoria = el("select", "form-select");
  categoria.id = "categoria-gestion-productos";
  categoria.setAttribute("aria-label", "Filtrar por categoría");
  categoria.append(new Option("Todas las categorías", ""));
  const pestanas = el("div", "panel-productos-pestanas");
  pestanas.setAttribute("role", "group");
  pestanas.setAttribute("aria-label", "Estado de los productos");
  barra.append(busqueda, categoria, pestanas);

  const estado = el("p", "small text-secondary mt-3 mb-2");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");

  const tabla = el("table", "table align-middle tabla-apilable mb-0 tabla-gestion-productos");
  const cabecera = el("thead");
  const filaCabecera = el("tr");
  COLUMNAS.forEach((nombre) => {
    const th = el("th", nombre === "Precio" || nombre === "Stock" ? "text-end" : "", nombre === "Acciones" ? "" : nombre);
    th.scope = "col";
    if (nombre === "Acciones") th.append(el("span", "visually-hidden", "Acciones"));
    filaCabecera.append(th);
  });
  cabecera.append(filaCabecera);
  const cuerpo = el("tbody");
  tabla.append(cabecera, cuerpo);
  // Sin table-responsive: su overflow recortaba el menú "Gestionar"; en celular la tabla ya se apila.
  const envoltura = el("div", "panel-productos-tabla");
  envoltura.append(tabla);

  const pie = el("div", "d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2");
  const rango = el("span", "small text-secondary");
  const paginacion = el("nav", "d-flex align-items-center gap-2");
  paginacion.setAttribute("aria-label", "Páginas de productos");
  pie.append(rango, paginacion);

  seccion.append(barra, estado, envoltura, pie);

  let productos = [];
  let pestanaActual = "activos";
  let paginaActual = 1;

  function pintarPestanas() {
    const conteo = contarPestanas(productos);
    pestanas.replaceChildren(...PESTANAS_PRODUCTOS.map(({ clave, etiqueta }) => {
      const boton = el("button", "panel-productos-pestana", `${etiqueta} · ${conteo[clave]}`);
      boton.type = "button";
      boton.dataset.pestana = clave;
      boton.setAttribute("aria-pressed", String(clave === pestanaActual));
      boton.addEventListener("click", () => {
        pestanaActual = clave;
        paginaActual = 1;
        pintar();
      });
      return boton;
    }));
  }

  function pintarCategorias() {
    const elegida = categoria.value;
    const nombres = [...new Set(productos.map((p) => p.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    categoria.replaceChildren(new Option("Todas las categorías", ""), ...nombres.map((n) => new Option(n, n)));
    categoria.value = nombres.includes(elegida) ? elegida : "";
  }

  async function cambiarEstado(producto, activo) {
    if (!activo) {
      const seguro = await confirmar({
        titulo: "Desactivar producto",
        mensaje: `"${producto.nombre}" dejará de verse en la tienda. Los pedidos anteriores no cambian y puedes reactivarlo cuando quieras.`,
        textoBoton: "Desactivar",
        claseBoton: "btn-danger",
      });
      if (!seguro) return;
    }
    try {
      await cambiarEstadoProducto(apiRequest, producto.id, activo);
      mostrarToast?.(activo ? `"${producto.nombre}" vuelve a la tienda.` : `"${producto.nombre}" se desactivó.`, activo ? "exito" : "info");
      await cargar();
      await alCambiarEstado?.();
    } catch (error) {
      mostrarToast?.(`No se pudo ${activo ? "reactivar" : "desactivar"}: ${error.message}`, "error");
    }
  }

  function crearFila(producto) {
    const fila = el("tr");
    const usuario = obtenerUsuario();
    // Un solo bloque: en celular la celda apilada es flex y cada hijo sería una columna.
    const ficha = el("div");
    ficha.append(el("span", "d-block fw-semibold", producto.nombre), el("span", "d-block small text-secondary", producto.sku || "Sin código"));
    const nombre = el("td");
    nombre.append(ficha);
    const stock = el("td", `text-end fw-semibold ${producto.stock <= UMBRAL_STOCK_BAJO ? "text-warning-emphasis" : ""}`, String(producto.stock));
    const estadoCelda = el("td");
    estadoCelda.append(el("span", `badge ${esActivo(producto) ? "text-bg-success" : "text-bg-secondary"}`, esActivo(producto) ? "Activo" : "Desactivado"));

    const acciones = esActivo(producto)
      ? accionesPersonalProducto(producto, {
        puedeGestionarInventario: ROLES_INVENTARIO.includes(usuario?.rol),
        puedeGestionarCatalogo: ROLES_CATALOGO.includes(usuario?.rol),
        callbacks: obtenerCallbacks(),
      })
      : [];
    if (ROLES_CATALOGO.includes(usuario?.rol)) {
      acciones.push(esActivo(producto)
        ? { texto: "Desactivar", peligro: true, alElegir: () => cambiarEstado(producto, false) }
        : { texto: "Reactivar", alElegir: () => cambiarEstado(producto, true) });
    }
    const celdaAcciones = el("td", "text-end");
    if (acciones.length > 0) {
      celdaAcciones.append(crearMenuAcciones({ nombreAccesible: `Gestionar ${producto.nombre}`, acciones }));
    }

    fila.append(nombre, el("td", "", producto.categoria || "—"), el("td", "text-end text-nowrap", formatoPrecio(producto.precio)),
      stock, estadoCelda, celdaAcciones);
    etiquetarCeldas(fila, COLUMNAS);
    return fila;
  }

  function pintar() {
    pintarPestanas();
    const filtrados = filtrarProductosGestion(productos, { pestana: pestanaActual, categoria: categoria.value, texto: busqueda.value });
    const pagina = paginarLista(filtrados, paginaActual);
    paginaActual = pagina.pagina;
    cuerpo.replaceChildren(...pagina.items.map(crearFila));
    estado.textContent = filtrados.length === 0 ? "No hay productos con esos filtros." : "";
    rango.textContent = filtrados.length === 0
      ? ""
      : `Mostrando ${pagina.inicio + 1}–${pagina.inicio + pagina.items.length} de ${filtrados.length}`;
    paginacion.hidden = pagina.totalPaginas <= 1;
    paginacion.replaceChildren(...crearControlesPaginacionKardex({
      paginaActual: pagina.pagina,
      totalPaginas: pagina.totalPaginas,
      tieneAnterior: pagina.pagina > 1,
      tieneSiguiente: pagina.pagina < pagina.totalPaginas,
    }, (nueva) => {
      paginaActual = nueva;
      pintar();
    }));
    const resumen = typeof document !== "undefined" ? document.querySelector("#resumen-gestion-productos") : null;
    if (resumen) resumen.textContent = resumenProductos(productos);
  }

  busqueda.addEventListener("input", () => {
    paginaActual = 1;
    pintar();
  });
  categoria.addEventListener("change", () => {
    paginaActual = 1;
    pintar();
  });

  async function cargar() {
    estado.className = "small text-secondary mt-3 mb-2";
    estado.textContent = "Cargando productos…";
    try {
      productos = await listarProductosGestion(apiRequest);
      pintarCategorias();
      pintar();
    } catch (error) {
      cuerpo.replaceChildren();
      estado.className = "small text-danger mt-3 mb-2";
      estado.textContent = `No se pudieron cargar los productos. ${error.message}`;
    }
  }

  return { element: seccion, cargar };
}
