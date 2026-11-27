/**
 * @file pedidos-filtros.js
 * Filtrado operativo, pestañas por estado, buscador, skeletons, vacío y error para pedidos.
 */

import { crearElemento } from "../utilidades/dom.js";
import { ESTADO_PEDIDO } from "../utilidades/constantes.js";

export const ESTADOS_FILTRO_PEDIDOS = Object.freeze([
  "TODOS",
  ESTADO_PEDIDO.PENDIENTE,
  ESTADO_PEDIDO.EN_PREPARACION,
  ESTADO_PEDIDO.DESPACHADO,
  ESTADO_PEDIDO.ENTREGADO,
]);

const ETIQUETAS_FILTRO_PEDIDOS = Object.freeze({
  TODOS: "Todos",
  [ESTADO_PEDIDO.PENDIENTE]: "Pendientes",
  [ESTADO_PEDIDO.EN_PREPARACION]: "En preparación",
  [ESTADO_PEDIDO.DESPACHADO]: "Despachados",
  [ESTADO_PEDIDO.ENTREGADO]: "Entregados",
});

function normalizarTextoPedido(valor) {
  return String(valor ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Calcula los totales por estado para las pestañas operativas de pedidos. */
export function contarPedidosOperativos(pedidos) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  const conteos = {
    TODOS: lista.length,
    [ESTADO_PEDIDO.PENDIENTE]: 0,
    [ESTADO_PEDIDO.EN_PREPARACION]: 0,
    [ESTADO_PEDIDO.DESPACHADO]: 0,
    [ESTADO_PEDIDO.ENTREGADO]: 0,
  };
  for (const pedido of lista) {
    if (pedido?.estado && Object.hasOwn(conteos, pedido.estado)) {
      conteos[pedido.estado] += 1;
    }
  }
  return conteos;
}

/** Filtra los pedidos operativos por estado y búsqueda de #pedido o cliente. */
export function filtrarPedidosOperativos(pedidos, { estado = "TODOS", texto = "" } = {}) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  const estadoActivo = ESTADOS_FILTRO_PEDIDOS.includes(estado) ? estado : "TODOS";
  const consulta = normalizarTextoPedido(texto);
  const consultaId = consulta.replace(/^#/, "");

  return lista.filter((pedido) => {
    if (estadoActivo !== "TODOS" && pedido?.estado !== estadoActivo) return false;
    if (!consulta) return true;
    const idTexto = normalizarTextoPedido(pedido?.idPedido);
    const etiquetaPedido = normalizarTextoPedido(`pedido #${pedido?.idPedido ?? ""}`);
    const cliente = normalizarTextoPedido(pedido?.clienteNombre);
    const correo = normalizarTextoPedido(pedido?.clienteCorreo);
    return (
      (Boolean(consultaId) && idTexto.includes(consultaId)) ||
      etiquetaPedido.includes(consulta) ||
      cliente.includes(consulta) ||
      correo.includes(consulta)
    );
  });
}

/** Skeletons de carga inicial para la vista de pedidos del panel. */
export function crearSkeletonsPedidos(cantidad = 3) {
  const lista = crearElemento("ul", "panel-esqueleto-lista");
  lista.setAttribute?.("aria-hidden", "true");
  for (let i = 0; i < cantidad; i += 1) {
    const fila = crearElemento("li", "panel-esqueleto-fila");
    fila.append(
      crearElemento("span", "panel-esqueleto panel-esqueleto-titulo"),
      crearElemento("span", "panel-esqueleto panel-esqueleto-accion"),
    );
    lista.append(fila);
  }
  return lista;
}

/** Recuadro vacío con botón «Limpiar filtros» cuando el filtro no devuelve coincidencias. */
export function crearVacioFiltrosPedidos(alLimpiar) {
  const caja = crearElemento("div", "panel-recuadro-vacio");
  const tituloVacio = crearElemento("p", "panel-recuadro-titulo mb-1", "No hay pedidos con esos filtros");
  const ayuda = crearElemento("p", "mb-3", "Prueba quitando el filtro de estado o limpiando la búsqueda.");
  const botonReset = crearElemento("button", "panel-boton panel-boton-secundario", "Limpiar filtros");
  botonReset.id = "limpiar-filtros-pedidos";
  botonReset.type = "button";
  botonReset.addEventListener("click", alLimpiar);
  caja.append(tituloVacio, ayuda, botonReset);
  return caja;
}

/** Caja de error con botón «Reintentar» al fallar la carga de pedidos o atención. */
export function crearErrorPedidos(
  alReintentar,
  mensaje = "No se pudieron obtener los pedidos en este momento.",
) {
  const errorCaja = crearElemento("div", "panel-error");
  const mensajeError = crearElemento("p", "mb-0", mensaje);
  const botonReintentar = crearElemento("button", "panel-boton panel-boton-secundario", "Reintentar");
  botonReintentar.type = "button";
  botonReintentar.addEventListener("click", alReintentar);
  errorCaja.append(mensajeError, botonReintentar);
  return errorCaja;
}

/** Crea la barra operativa de pestañas por estado + buscador por #pedido o cliente. */
export function crearBarraFiltrosPedidos({
  estadoInicial = "TODOS",
  alCambiarEstado,
  alCambiarBusqueda,
}) {
  const barra = crearElemento("div", "panel-productos-barra mb-3");
  barra.id = "barra-filtros-pedidos";

  const pestanas = crearElemento("div", "panel-productos-pestanas");
  pestanas.setAttribute?.("role", "tablist");
  pestanas.setAttribute?.("aria-label", "Filtrar pedidos por estado");

  const botonesFiltro = new Map();
  for (const estadoClave of ESTADOS_FILTRO_PEDIDOS) {
    const boton = crearElemento(
      "button",
      "panel-productos-pestana",
      `${ETIQUETAS_FILTRO_PEDIDOS[estadoClave]} (0)`,
    );
    boton.type = "button";
    if (boton.dataset) boton.dataset.estadoPedido = estadoClave;
    boton.setAttribute?.("data-estado-pedido", estadoClave);
    boton.setAttribute?.("role", "tab");
    boton.setAttribute?.("aria-selected", estadoClave === estadoInicial ? "true" : "false");
    boton.addEventListener("click", () => alCambiarEstado(estadoClave));
    botonesFiltro.set(estadoClave, boton);
    pestanas.append(boton);
  }

  const buscador = crearElemento("div", "panel-productos-buscador");
  const etiqueta = crearElemento("label", "visually-hidden", "Buscar pedido por número o cliente");
  etiqueta.htmlFor = "buscar-pedidos-panel";
  const inputBusqueda = crearElemento("input", "form-control");
  inputBusqueda.id = "buscar-pedidos-panel";
  inputBusqueda.type = "search";
  inputBusqueda.placeholder = "Buscar #pedido o cliente…";
  inputBusqueda.autocomplete = "off";

  const botonLimpiar = crearElemento("button", "panel-productos-limpiar", "Limpiar");
  botonLimpiar.id = "limpiar-busqueda-pedidos";
  botonLimpiar.type = "button";
  botonLimpiar.hidden = true;

  inputBusqueda.addEventListener("input", () => alCambiarBusqueda(inputBusqueda.value));
  botonLimpiar.addEventListener("click", () => {
    alCambiarBusqueda("");
    inputBusqueda.focus?.();
  });

  buscador.append(etiqueta, inputBusqueda, botonLimpiar);
  barra.append(pestanas, buscador);

  return {
    barra,
    actualizar({ conteos, estadoActivo, textoBusqueda }) {
      barra.hidden = false;
      for (const [estadoClave, boton] of botonesFiltro.entries()) {
        const activo = estadoClave === estadoActivo;
        boton.textContent = `${ETIQUETAS_FILTRO_PEDIDOS[estadoClave]} (${conteos[estadoClave] ?? 0})`;
        boton.classList?.toggle("esta-activo", activo);
        boton.setAttribute?.("aria-selected", activo ? "true" : "false");
      }
      if (inputBusqueda.value !== textoBusqueda) inputBusqueda.value = textoBusqueda;
      botonLimpiar.hidden = !textoBusqueda;
    },
  };
}
