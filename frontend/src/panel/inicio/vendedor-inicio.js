/**
 * @file vendedor-inicio.js
 * Panel del personal (spec 15 y decisiones de T07): Inicio del Vendedor en #/inicio.
 * - Dos fuentes que cargan y fallan por separado: GET /api/productos/gestion (indicadores de
 *   productos, tabla de stock bajo y barras del catálogo) y GET /api/vendedor/preguntas
 *   (indicador de preguntas y bloque de consultas). «Reintentar» recarga solo su fuente.
 * - «Ajustar stock» abre el modal-stock.js existente (configurado una vez en el panel); tras
 *   guardar, el aviso de cambios recarga la fuente de gestión.
 * Las funciones renderizar* son puras (texto escapado); montar() las pinta y cablea eventos.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { SIN_VALOR, renderizarCargando, renderizarErrorBloque, renderizarKpi } from "./piezas-inicio.js";
import {
  barrasCatalogo,
  detallePreguntas,
  textoVerStockBajo,
  estadoStockBajo,
  indicadoresProductos,
  nombreProductoPregunta,
  preguntasMasAntiguas,
  productosStockBajo,
  resumirTexto,
  MAX_FILAS_STOCK_BAJO,
} from "./vendedor-logica.js";

const NO_CARGADO = "No se pudo cargar";
const FUENTE = Object.freeze({ GESTION: "gestion", PREGUNTAS: "preguntas" });

// ---------- Marcado (puro) ----------

/**
 * @param {{ productos: { activos, desactivados, stockBajo }|null, preguntas: { pendientes }|null }} datos
 */
export function renderizarIndicadoresVendedor({ productos = null, preguntas = null } = {}) {
  return [
    productos ? renderizarKpi("Productos activos", productos.activos, "Visibles en la tienda")
      : renderizarKpi("Productos activos", SIN_VALOR, NO_CARGADO),
    productos ? renderizarKpi("Desactivados", productos.desactivados, "Ocultos para los clientes")
      : renderizarKpi("Desactivados", SIN_VALOR, NO_CARGADO),
    productos ? renderizarKpi("Stock bajo", productos.stockBajo, "Por debajo del mínimo")
      : renderizarKpi("Stock bajo", SIN_VALOR, NO_CARGADO),
    preguntas ? renderizarKpi("Preguntas pendientes", preguntas.pendientes, detallePreguntas(preguntas.pendientes))
      : renderizarKpi("Preguntas pendientes", SIN_VALOR, NO_CARGADO),
  ].join("");
}

/**
 * Tabla de stock bajo (hasta MAX_FILAS_STOCK_BAJO filas) con «Ver los {total}».
 * @param {Array<object>} lista productos ya ordenados por productosStockBajo
 * @param {number} total total de productos con stock bajo
 */
export function renderizarTablaStockBajo(lista, total) {
  if (!lista.length) return '<p class="panel-vacio">Ningún producto con stock bajo.</p>';
  const filas = lista.slice(0, MAX_FILAS_STOCK_BAJO).map((p) => {
    const { texto, variante } = estadoStockBajo(p.stock);
    return html`<tr>
  <th scope="row">${p.nombre}</th>
  <td class="panel-num">${p.stock}</td>
  <td><span class="panel-insignia panel-insignia-${variante}">${texto}</span></td>
  <td><button type="button" class="panel-boton panel-boton-secundario" data-ajustar-stock="${p.id}">Ajustar stock</button></td>
</tr>`;
  });
  return html`<p class="panel-bloque-enlace"><a class="panel-enlace" href="#/productos">${textoVerStockBajo(total)}</a></p>
<div class="panel-tabla-contenedor">
  <table class="panel-tabla panel-tabla-stock">
    <thead><tr><th scope="col">Producto</th><th scope="col" class="panel-num">Stock</th><th scope="col">Estado</th><th scope="col"><span class="visually-hidden">Acción</span></th></tr></thead>
    <tbody>${seguro(filas.join(""))}</tbody>
  </table>
</div>`;
}

/** Las 3 preguntas pendientes más antiguas o el recuadro «No hay preguntas pendientes». */
export function renderizarConsultas(preguntas, productos) {
  if (!preguntas.length) {
    return `<div class="panel-recuadro-vacio">
  <p class="panel-recuadro-titulo">No hay preguntas pendientes</p>
  <p class="mb-0">Cuando un cliente pregunte por un producto, aparecerá aquí para que lo respondas.</p>
</div>`;
  }
  const items = preguntasMasAntiguas(preguntas).map((p) => html`<li class="panel-consulta">
  <div class="panel-consulta-texto">
    <p class="panel-consulta-producto">${nombreProductoPregunta(p, productos)}</p>
    <p class="panel-consulta-pregunta">${resumirTexto(p.pregunta)}</p>
  </div>
  <a class="panel-boton panel-boton-secundario" href="#/consultas">Responder</a>
</li>`);
  return html`<p class="panel-bloque-enlace"><a class="panel-enlace" href="#/consultas">Ver todas</a></p>
<ul class="panel-lista-consultas">${seguro(items.join(""))}</ul>`;
}

function barra(etiqueta, { cantidad, porcentaje }, color) {
  return html`<div class="panel-barra-fila">
  <p class="panel-barra-etiqueta">${etiqueta}</p>
  <div class="panel-barra" aria-hidden="true"><div class="panel-barra-relleno panel-barra-${color}" style="width: ${porcentaje}%"></div></div>
  <p class="panel-barra-cantidad">${cantidad}</p>
</div>`;
}

/** Barras proporcionales de activos y desactivados, con su texto. */
export function renderizarCatalogo(conteo) {
  const barras = barrasCatalogo(conteo);
  const vacio = barras.total === 0 ? '<p class="panel-vacio">Aún no hay productos.</p>' : "";
  return [
    barra("Activos", barras.activos, "verde"),
    barra("Desactivados", barras.desactivados, "gris"),
    vacio,
  ].join("");
}

/** Estructura completa del Inicio con los bloques en estado «Cargando…». */
export function renderizarInicioVendedor() {
  const cargando = seguro(renderizarCargando());
  return html`<div class="panel-inicio">
  <header class="panel-encabezado panel-encabezado-acciones">
    <div>
      <h1 class="panel-titulo">Inicio</h1>
      <p class="panel-apoyo">Tu catálogo y lo que conviene reponer o responder hoy.</p>
    </div>
    <div class="panel-acciones-encabezado">
      <a class="panel-boton panel-boton-secundario" href="#/productos">Ver catálogo</a>
      <a class="panel-boton panel-boton-principal" href="#/productos?nuevo=1">Nuevo producto</a>
    </div>
  </header>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${cargando}</section>
  <div class="panel-inicio-rejilla">
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-stock-bajo">
      <h2 id="inicio-titulo-stock-bajo" class="panel-subtitulo">Productos con stock bajo</h2>
      <div id="inicio-stock-bajo" aria-busy="true">${cargando}</div>
    </section>
    <div class="panel-inicio-lateral">
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-consultas">
        <h2 id="inicio-titulo-consultas" class="panel-subtitulo">Consultas de clientes</h2>
        <div id="inicio-consultas" aria-busy="true">${cargando}</div>
      </section>
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-catalogo">
        <div class="panel-bloque-cabecera">
          <h2 id="inicio-titulo-catalogo" class="panel-subtitulo">Catálogo</h2>
          <a class="panel-enlace" href="#/productos">Administrar productos</a>
        </div>
        <div id="inicio-catalogo" aria-busy="true">${cargando}</div>
      </section>
    </div>
  </div>
</div>`;
}

// ---------- Montaje (DOM) ----------

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function, modalesProducto?: { abrirModalStock: Function },
 *   cambiosProductos?: { suscribir: Function } } }} contexto
 * @returns {{ alMostrar: () => Promise<void> }}
 */
export function montar(contenedor, { servicios }) {
  const { apiRequest, modalesProducto, cambiosProductos } = servicios;
  contenedor.innerHTML = renderizarInicioVendedor();
  const buscar = (id) => contenedor.querySelector(`#${id}`);
  const zonaIndicadores = buscar("inicio-indicadores");
  const zonaStock = buscar("inicio-stock-bajo");
  const zonaConsultas = buscar("inicio-consultas");
  const zonaCatalogo = buscar("inicio-catalogo");

  /** null = no cargado o con error. */
  let productos = null;
  let preguntas = null;

  const ocupado = (zona, valor) => (valor ? zona.setAttribute("aria-busy", "true") : zona.removeAttribute("aria-busy"));

  function pintarIndicadores() {
    zonaIndicadores.innerHTML = renderizarIndicadoresVendedor({
      productos: productos ? indicadoresProductos(productos) : null,
      preguntas: preguntas ? { pendientes: preguntas.length } : null,
    });
    ocupado(zonaIndicadores, false);
  }

  function pintarConsultas() {
    if (preguntas) zonaConsultas.innerHTML = renderizarConsultas(preguntas, productos ?? []);
  }

  async function cargarGestion() {
    ocupado(zonaStock, true);
    ocupado(zonaCatalogo, true);
    try {
      const respuesta = await apiRequest("/api/productos/gestion");
      productos = await respuesta.json();
      const bajos = productosStockBajo(productos);
      zonaStock.innerHTML = renderizarTablaStockBajo(bajos, bajos.length);
      zonaCatalogo.innerHTML = renderizarCatalogo(indicadoresProductos(productos));
    } catch {
      productos = null;
      zonaStock.innerHTML = renderizarErrorBloque(FUENTE.GESTION);
      zonaCatalogo.innerHTML = renderizarErrorBloque(FUENTE.GESTION);
    } finally {
      ocupado(zonaStock, false);
      ocupado(zonaCatalogo, false);
      // Los nombres de producto de las consultas pueden salir de la lista de gestión.
      pintarConsultas();
    }
  }

  async function cargarPreguntas() {
    ocupado(zonaConsultas, true);
    try {
      const respuesta = await apiRequest("/api/vendedor/preguntas");
      preguntas = await respuesta.json();
      pintarConsultas();
    } catch {
      preguntas = null;
      zonaConsultas.innerHTML = renderizarErrorBloque(FUENTE.PREGUNTAS);
    } finally {
      ocupado(zonaConsultas, false);
      // Contador «Consultas de clientes» del menú (null si la fuente falló).
      servicios.actualizarContadores?.({ preguntas });
    }
  }

  async function recargar(fuente) {
    await (fuente === FUENTE.PREGUNTAS ? cargarPreguntas() : cargarGestion());
    pintarIndicadores();
  }

  contenedor.addEventListener("click", (evento) => {
    const reintentar = evento.target.closest("[data-reintentar]");
    if (reintentar) {
      void recargar(reintentar.dataset.reintentar);
      return;
    }
    const ajustar = evento.target.closest("[data-ajustar-stock]");
    if (ajustar) {
      const producto = (productos ?? []).find((p) => String(p.id) === ajustar.dataset.ajustarStock);
      if (producto) modalesProducto?.abrirModalStock(producto);
    }
  });

  // Tras guardar en un modal de producto (o cualquier otro cambio), se recarga la gestión.
  cambiosProductos?.suscribir(() => void recargar(FUENTE.GESTION));

  return {
    async alMostrar() {
      ocupado(zonaIndicadores, true);
      await Promise.all([cargarGestion(), cargarPreguntas()]);
      pintarIndicadores();
    },
  };
}
