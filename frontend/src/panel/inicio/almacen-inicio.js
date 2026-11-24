/**
 * @file almacen-inicio.js
 * Panel del personal (spec 14 y decisiones P3/P4): Inicio de Almacén en #/inicio.
 * - Indicadores, cola de pedidos en tres columnas, stock crítico y entrada rápida de mercadería.
 * - Preparar y entregar reutilizan ejecutarActualizacionEstadoPedido (un clic, como hoy);
 *   despachar abre #modal-despacho con crearFormularioDespacho.
 * - Cada bloque carga y falla por separado, con «Reintentar». Sin datos de ejemplo.
 * Las funciones renderizar* son puras (texto escapado); montar() las pinta y cablea eventos.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { formatoPrecio } from "../../utilidades/formato.js";
import { crearFormularioDespacho, ejecutarActualizacionEstadoPedido } from "../../pedidos/pedidos-vista.js";
import {
  ESTADOS_COLA,
  agruparPedidosPorEstado,
  calcularIndicadoresAlmacen,
  etiquetaStock,
  resumenArticulos,
  stockCritico,
  validarEntrada,
  MAX_MOTIVO_ENTRADA,
} from "./almacen-logica.js";
import { SIN_VALOR, renderizarCargando, renderizarErrorBloque, renderizarKpi } from "./piezas-inicio.js";

/** Botón de acción de cada tarjeta según el estado del pedido (spec 14). */
export const ACCION_POR_ESTADO = Object.freeze({
  PENDIENTE: Object.freeze({ accion: "preparar", texto: "Empezar a preparar" }),
  EN_PREPARACION: Object.freeze({ accion: "despachar", texto: "Marcar como despachado" }),
  DESPACHADO: Object.freeze({ accion: "entregar", texto: "Marcar como entregado" }),
});

/** Título y color de la insignia de cada columna de la cola. */
const COLUMNAS = Object.freeze({
  PENDIENTE: { titulo: "Pendientes", variante: "ambar" },
  EN_PREPARACION: { titulo: "En preparación", variante: "azul" },
  DESPACHADO: { titulo: "Despachados", variante: "verde" },
});

const MENSAJE_ENTRADA_OK = "Entrada registrada";

// Piezas compartidas con los Inicios de los demás roles (se reexportan para sus pruebas).
export { renderizarCargando, renderizarErrorBloque };
const kpi = renderizarKpi;

// ---------- Marcado (puro) ----------

/**
 * Cuatro indicadores (decisión P4). Si una fuente no cargó, sus indicadores muestran «—».
 * @param {{ pedidos: object|null, productos: object|null }} datos
 */
export function renderizarIndicadores({ pedidos = null, productos = null } = {}) {
  const sinDatos = "Sin datos";
  return [
    pedidos
      ? kpi("Por preparar", pedidos.porPreparar, `${pedidos.pendientes} pendientes · ${pedidos.enPreparacion} en preparación`)
      : kpi("Por preparar", SIN_VALOR, sinDatos),
    pedidos ? kpi("Despachados", pedidos.despachados, "En camino al cliente") : kpi("Despachados", SIN_VALOR, sinDatos),
    productos ? kpi("Stock bajo", productos.stockBajo, "Por debajo del mínimo") : kpi("Stock bajo", SIN_VALOR, sinDatos),
    productos
      ? kpi("Unidades en almacén", productos.unidades, `${productos.productosActivos} productos activos`)
      : kpi("Unidades en almacén", SIN_VALOR, sinDatos),
  ].join("");
}

export function renderizarTarjetaPedido(pedido) {
  const accion = ACCION_POR_ESTADO[pedido.estado];
  const boton = accion
    ? html`<button type="button" class="panel-boton panel-boton-accion" data-accion="${accion.accion}" data-pedido="${pedido.idPedido}">${accion.texto}</button>`
    : "";
  return html`<li><article class="panel-pedido">
  <p class="panel-pedido-numero">Pedido #${pedido.idPedido}</p>
  <p class="panel-pedido-detalle">${resumenArticulos(pedido)}</p>
  <p class="panel-pedido-monto">${seguro(formatoPrecio(pedido.total))}</p>
  ${seguro(boton)}
</article></li>`;
}

function cabeceraColumna(estado, contador) {
  const { titulo, variante } = COLUMNAS[estado];
  return html`<h3 class="panel-cola-titulo">${titulo} <span class="panel-insignia panel-insignia-${variante}">${contador}</span></h3>`;
}

/** Columna de la cola con su contador; «Sin pedidos» si está vacía. */
export function renderizarColumna(estado, pedidos) {
  const contenido = pedidos.length
    ? html`<ul class="panel-cola-lista">${seguro(pedidos.map(renderizarTarjetaPedido).join(""))}</ul>`
    : '<p class="panel-vacio">Sin pedidos</p>';
  return html`<section class="panel-cola-columna" aria-label="${COLUMNAS[estado].titulo}">
  ${seguro(cabeceraColumna(estado, pedidos.length))}
  ${seguro(contenido)}
</section>`;
}

function renderizarColumnaCargando(estado) {
  return html`<section class="panel-cola-columna" aria-label="${COLUMNAS[estado].titulo}">
  <h3 class="panel-cola-titulo">${COLUMNAS[estado].titulo}</h3>
  ${seguro(renderizarCargando())}
</section>`;
}

/** Lista de stock crítico (ya filtrada por stockCritico) o el texto del bloque si está vacía. */
export function renderizarStockCritico(lista) {
  if (!lista.length) return '<p class="panel-vacio">Todo el stock está sobre el mínimo.</p>';
  const filas = lista.map((p) => {
    const { texto, variante } = etiquetaStock(p.stock);
    return html`<li class="panel-fila-stock"><span>${p.nombre}</span><span class="panel-insignia panel-insignia-${variante}">${texto}</span></li>`;
  });
  return html`<ul class="panel-lista-stock">${seguro(filas.join(""))}</ul>`;
}

/** Estructura completa del Inicio con los bloques en estado «Cargando…». */
export function renderizarInicioAlmacen() {
  return html`<div class="panel-inicio">
  <header class="panel-encabezado">
    <h1 class="panel-titulo">Inicio</h1>
    <p class="panel-apoyo">Pedidos por preparar y mercadería que necesita reposición.</p>
  </header>
  <nav class="panel-chips-rapidos" aria-label="Accesos rápidos">
    <a class="panel-chip" href="#/inicio">Inicio</a>
    <a class="panel-chip" href="#/pedidos">Pedidos</a>
    <a class="panel-chip" href="#/inventario">Kardex</a>
  </nav>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${seguro(renderizarCargando())}</section>
  <div class="panel-inicio-rejilla">
    <section class="panel-tarjeta panel-bloque-cola" aria-labelledby="inicio-titulo-cola">
      <div class="panel-bloque-cabecera">
        <h2 id="inicio-titulo-cola" class="panel-subtitulo">Cola de pedidos</h2>
        <a class="panel-enlace" href="#/pedidos">Ver todos</a>
      </div>
      <div id="inicio-cola" class="panel-cola" aria-busy="true">${seguro(ESTADOS_COLA.map(renderizarColumnaCargando).join(""))}</div>
    </section>
    <div class="panel-inicio-lateral">
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-stock">
        <h2 id="inicio-titulo-stock" class="panel-subtitulo">Stock crítico</h2>
        <div id="inicio-stock" aria-busy="true">${seguro(renderizarCargando())}</div>
      </section>
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-entrada">
        <h2 id="inicio-titulo-entrada" class="panel-subtitulo">Entrada rápida de mercadería</h2>
        <form id="inicio-form-entrada" class="panel-formulario" novalidate>
          <label for="inicio-producto-entrada" class="form-label">Producto</label>
          <select id="inicio-producto-entrada" class="form-select" required>
            <option value="">Selecciona un producto</option>
          </select>
          <label for="inicio-cantidad-entrada" class="form-label">Cantidad</label>
          <input id="inicio-cantidad-entrada" class="form-control" type="number" min="1" step="1" inputmode="numeric" required>
          <label for="inicio-motivo-entrada" class="form-label">Motivo</label>
          <input id="inicio-motivo-entrada" class="form-control" type="text" maxlength="${MAX_MOTIVO_ENTRADA}" required>
          <div id="inicio-errores-entrada" class="panel-errores-formulario" role="alert"></div>
          <button id="inicio-registrar-entrada" class="panel-boton panel-boton-principal" type="submit">Registrar entrada</button>
          <p class="panel-ayuda">Queda registrada en el kardex con tu usuario y la fecha.</p>
        </form>
      </section>
    </div>
  </div>
</div>`;
}

// ---------- Montaje (DOM) ----------

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function, mostrarToast: Function, estado: object, Modal?: object } }} contexto
 * @returns {{ alMostrar: () => Promise<void> }}
 */
export function montar(contenedor, { servicios }) {
  const { apiRequest, mostrarToast, estado, Modal } = servicios;
  contenedor.innerHTML = renderizarInicioAlmacen();
  const buscar = (id) => contenedor.querySelector(`#${id}`);
  const zonaIndicadores = buscar("inicio-indicadores");
  const zonaCola = buscar("inicio-cola");
  const zonaStock = buscar("inicio-stock");
  const formulario = buscar("inicio-form-entrada");
  const campoProducto = buscar("inicio-producto-entrada");
  const campoCantidad = buscar("inicio-cantidad-entrada");
  const campoMotivo = buscar("inicio-motivo-entrada");
  const zonaErrores = buscar("inicio-errores-entrada");
  const botonEntrada = buscar("inicio-registrar-entrada");
  const CAMPOS = { producto: campoProducto, cantidad: campoCantidad, motivo: campoMotivo };

  /** null = no cargado o con error; así los indicadores muestran «—». */
  let pedidos = null;
  let productos = null;

  const ocupado = (zona, valor) => (valor ? zona.setAttribute("aria-busy", "true") : zona.removeAttribute("aria-busy"));

  function pintarIndicadores() {
    const calculo = calcularIndicadoresAlmacen(pedidos ?? [], productos ?? []);
    zonaIndicadores.innerHTML = renderizarIndicadores({
      pedidos: pedidos ? calculo : null,
      productos: productos ? calculo : null,
    });
    ocupado(zonaIndicadores, false);
  }

  async function cargarPedidos() {
    ocupado(zonaCola, true);
    try {
      const respuesta = await apiRequest("/api/pedidos/operativos");
      pedidos = await respuesta.json();
      const grupos = agruparPedidosPorEstado(pedidos);
      zonaCola.innerHTML = ESTADOS_COLA.map((e) => renderizarColumna(e, grupos[e])).join("");
    } catch {
      pedidos = null;
      zonaCola.innerHTML = renderizarErrorBloque("pedidos");
    } finally {
      ocupado(zonaCola, false);
    }
  }

  function poblarSelectorProductos() {
    const elegido = campoProducto.value;
    const opciones = [...(productos ?? [])].sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), "es"));
    campoProducto.replaceChildren(new Option("Selecciona un producto", ""),
      ...opciones.map((p) => new Option(p.nombre, String(p.id))));
    if (opciones.some((p) => String(p.id) === elegido)) campoProducto.value = elegido;
  }

  async function cargarProductos() {
    ocupado(zonaStock, true);
    try {
      const respuesta = await apiRequest("/api/productos");
      productos = await respuesta.json();
      zonaStock.innerHTML = renderizarStockCritico(stockCritico(productos));
    } catch {
      productos = null;
      zonaStock.innerHTML = renderizarErrorBloque("productos");
    } finally {
      ocupado(zonaStock, false);
      poblarSelectorProductos();
    }
  }

  async function recargarPedidos() {
    await cargarPedidos();
    pintarIndicadores();
  }

  async function recargarProductos() {
    await cargarProductos();
    pintarIndicadores();
  }

  /** Mismo modal y formulario que pedidos-controlador.js (spec 007, T013). */
  function abrirDespacho(pedido) {
    const modal = document.querySelector("#modal-despacho");
    const destino = modal?.querySelector("#modal-despacho-formulario");
    if (!modal || !destino || !Modal) return;
    const instancia = Modal.getOrCreateInstance(modal);
    modal.querySelector("#modal-despacho-titulo").textContent = `Registrar despacho del pedido #${pedido.idPedido}`;
    destino.replaceChildren(crearFormularioDespacho(pedido, async ({ transportista, codigoSeguimiento, boton }) => {
      const resultado = await ejecutarActualizacionEstadoPedido({
        apiRequest, pedidoId: pedido.idPedido, accion: "despachar", boton,
        datos: { transportista, codigoSeguimiento }, alActualizar: recargarPedidos, mostrarToast,
      });
      if (resultado?.ok) instancia.hide();
    }));
    instancia.show();
    modal.addEventListener("shown.bs.modal", () => destino.querySelector("input")?.focus(), { once: true });
  }

  function ejecutarAccion(boton) {
    const pedidoId = Number(boton.dataset.pedido);
    const accion = boton.dataset.accion;
    if (accion === "despachar") {
      const pedido = (pedidos ?? []).find((p) => Number(p.idPedido) === pedidoId);
      if (pedido) abrirDespacho(pedido);
      return;
    }
    // Si la API responde error, ejecutarActualizacionEstadoPedido muestra el toast y no se
    // recarga la cola: la tarjeta se queda en su columna.
    void ejecutarActualizacionEstadoPedido({
      apiRequest, pedidoId, accion, boton, alActualizar: recargarPedidos, mostrarToast,
    });
  }

  contenedor.addEventListener("click", (evento) => {
    const reintentar = evento.target.closest("[data-reintentar]");
    if (reintentar) {
      void (reintentar.dataset.reintentar === "pedidos" ? recargarPedidos() : recargarProductos());
      return;
    }
    const accion = evento.target.closest("[data-accion]");
    if (accion) ejecutarAccion(accion);
  });

  function mostrarErrores(errores) {
    zonaErrores.replaceChildren(...Object.values(errores).map((texto) => {
      const parrafo = document.createElement("p");
      parrafo.className = "mb-0";
      parrafo.textContent = texto;
      return parrafo;
    }));
    for (const [campo, elemento] of Object.entries(CAMPOS)) {
      if (errores[campo]) elemento.setAttribute("aria-invalid", "true");
      else elemento.removeAttribute("aria-invalid");
    }
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const resultado = validarEntrada({
      productoId: campoProducto.value, cantidad: campoCantidad.value, motivo: campoMotivo.value,
    });
    if (!resultado.valido) {
      mostrarErrores(resultado.errores);
      return;
    }
    mostrarErrores({});
    botonEntrada.disabled = true;
    botonEntrada.setAttribute("aria-busy", "true");
    try {
      await apiRequest("/api/inventario/entradas", { method: "POST", json: resultado.cuerpo });
      mostrarToast(MENSAJE_ENTRADA_OK, "exito");
      campoCantidad.value = "";
      campoMotivo.value = "";
      // El módulo de inventario volverá a pedir los productos al mostrarse (stock nuevo).
      estado.productosInventario = [];
      await recargarProductos();
    } catch (error) {
      // Los datos escritos se conservan para corregir y reenviar.
      mostrarErrores({ servidor: error.message });
    } finally {
      botonEntrada.disabled = false;
      botonEntrada.removeAttribute("aria-busy");
    }
  });

  return {
    async alMostrar() {
      ocupado(zonaIndicadores, true);
      await Promise.all([cargarPedidos(), cargarProductos()]);
      pintarIndicadores();
    },
  };
}
