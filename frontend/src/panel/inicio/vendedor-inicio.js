/**
 * @file vendedor-inicio.js
 * Panel del personal (spec 15 y decisiones de T07; Fase 1 UI/UX): Inicio del Vendedor en #/inicio.
 * - Dos fuentes que cargan y fallan por separado: GET /api/productos/gestion (indicadores de
 *   productos, tabla de stock bajo y barras del catálogo) y GET /api/vendedor/preguntas
 *   (indicador de preguntas y bloque de consultas). «Reintentar» recarga solo su fuente.
 * - «Ajustar stock» abre el modal-stock.js existente (configurado una vez en el panel); tras
 *   guardar, el aviso de cambios recarga la fuente de gestión.
 * Las funciones renderizar* son puras (texto escapado); montar() las pinta y cablea eventos.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import {
  SIN_VALOR,
  cuadroIcono,
  renderizarErrorBloque,
  renderizarKpi,
  renderizarSkeletonsKpi,
  renderizarSkeletonsLista,
} from "./piezas-inicio.js";
import { fechaDeHoy } from "./admin-logica.js";
import { esperaDe } from "./soporte-logica.js";
import { icono } from "../iconos.js";
import {
  desgloseCatalogo,
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

function tarjetaKpiVendedor(etiqueta, valor, detalle, nombreIcono, tono, { alerta = false, enlace = null } = {}) {
  const clase = alerta ? "panel-kpi panel-kpi-alerta" : "panel-kpi panel-kpi-icono";
  const enlaceHtml = enlace ? html`<a class="panel-kpi-enlace" href="${seguro(enlace.ruta)}">${enlace.texto}</a>` : "";
  return html`<article class="${clase}">
  ${seguro(cuadroIcono(nombreIcono, alerta ? "alerta" : tono))}
  <div class="panel-kpi-cuerpo">
    <p class="panel-kpi-etiqueta">${etiqueta}</p>
    <p class="panel-kpi-valor">${valor}</p>
    <p class="panel-kpi-detalle">${detalle}</p>
    ${seguro(enlaceHtml)}
  </div>
</article>`;
}

/**
 * @param {{ productos: { activos, desactivados, stockBajo }|null, preguntas: { pendientes }|null }} datos
 */
export function renderizarIndicadoresVendedor({ productos = null, preguntas = null } = {}) {
  const tarjetas = productos
    ? [
      tarjetaKpiVendedor("Productos activos", productos.activos, "Visibles en la tienda", "productos", "azul"),
      tarjetaKpiVendedor("Desactivados", productos.desactivados, "Ocultos para los clientes", "inventario", "gris"),
      productos.stockBajo > 0
        ? tarjetaKpiVendedor("Stock bajo", productos.stockBajo, "Por debajo del mínimo", "incidencias", "alerta",
          { alerta: true, enlace: { ruta: "#/productos?pestana=stock-bajo", texto: "Reponer ahora" } })
        : tarjetaKpiVendedor("Stock bajo", productos.stockBajo, "Por debajo del mínimo", "verificacion", "verde"),
    ]
    : [
      renderizarKpi("Productos activos", SIN_VALOR, NO_CARGADO),
      renderizarKpi("Desactivados", SIN_VALOR, NO_CARGADO),
      renderizarKpi("Stock bajo", SIN_VALOR, NO_CARGADO),
    ];

  tarjetas.push(preguntas
    ? tarjetaKpiVendedor("Preguntas pendientes", preguntas.pendientes, detallePreguntas(preguntas.pendientes),
      "consultas", preguntas.pendientes > 0 ? "ambar" : "verde")
    : renderizarKpi("Preguntas pendientes", SIN_VALOR, NO_CARGADO));

  return tarjetas.join("");
}

function celdaProductoStock(producto) {
  const partes = [producto?.sku, producto?.categoria].filter(Boolean);
  if (!partes.length) return html`<th scope="row">${producto.nombre}</th>`;
  return html`<th scope="row"><span class="panel-stock-nombre">${producto.nombre}</span><span class="panel-stock-meta">${partes.join(" · ")}</span></th>`;
}

/**
 * Tabla de stock bajo (hasta MAX_FILAS_STOCK_BAJO filas) con «Ver los {total}».
 * @param {Array<object>} lista productos ya ordenados por productosStockBajo
 * @param {number} total total de productos con stock bajo
 */
export function renderizarTablaStockBajo(lista, total) {
  if (!lista.length) {
    return `<div class="panel-vacio-ok">
  ${cuadroIcono("verificacion", "verde")}
  <p>Ningún producto con stock bajo.</p>
</div>`;
  }
  const filas = lista.slice(0, MAX_FILAS_STOCK_BAJO).map((p) => {
    const { texto, variante } = estadoStockBajo(p.stock);
    const claseBoton = Number(p.stock) <= 0 ? "panel-boton-principal" : "panel-boton-secundario";
    return html`<tr>
  ${seguro(celdaProductoStock(p))}
  <td class="panel-num">${p.stock}</td>
  <td><span class="panel-insignia panel-insignia-${variante}">${texto}</span></td>
  <td><button type="button" class="panel-boton ${claseBoton}" data-ajustar-stock="${p.id}">Ajustar stock</button></td>
</tr>`;
  });
  return html`<p class="panel-bloque-enlace"><a class="panel-enlace" href="#/productos?pestana=stock-bajo">${textoVerStockBajo(total)}</a></p>
<div class="panel-tabla-contenedor">
  <table class="panel-tabla panel-tabla-stock">
    <thead><tr><th scope="col">Producto</th><th scope="col" class="panel-num">Stock</th><th scope="col">Estado</th><th scope="col"><span class="visually-hidden">Acción</span></th></tr></thead>
    <tbody>${seguro(filas.join(""))}</tbody>
  </table>
</div>`;
}

function etiquetaEsperaConsulta(creadaEn, ahora) {
  if (!creadaEn) return "";
  const espera = esperaDe(creadaEn, ahora);
  if (espera.horas == null) return "";
  return html`<span class="panel-espera panel-espera-${espera.nivel}">${seguro(icono("reloj"))}${espera.texto}</span>`;
}

/** Las 3 preguntas pendientes más antiguas o el recuadro «No hay preguntas pendientes». */
export function renderizarConsultas(preguntas, productos, ahora = new Date()) {
  if (!preguntas.length) {
    return `<div class="panel-recuadro-vacio">
  <p class="panel-recuadro-titulo">No hay preguntas pendientes</p>
  <p class="mb-0">Cuando un cliente pregunte por un producto, aparecerá aquí para que lo respondas.</p>
</div>`;
  }
  const items = preguntasMasAntiguas(preguntas).map((p, i) => {
    const cliente = p?.clienteNombre ? html`<span class="panel-consulta-cliente">· ${p.clienteNombre}</span>` : "";
    const espera = etiquetaEsperaConsulta(p?.creadaEn, ahora);
    const claseBoton = i === 0 ? "panel-boton-principal" : "panel-boton-secundario";
    const rutaResponder = p?.idConsulta != null ? `#/consultas?consulta=${p.idConsulta}` : "#/consultas";
    return html`<li class="panel-consulta">
  <div class="panel-consulta-texto">
    <div class="panel-consulta-cabecera">
      <p class="panel-consulta-producto">${nombreProductoPregunta(p, productos)}</p>
      ${seguro(cliente)}
      ${seguro(espera)}
    </div>
    <p class="panel-consulta-pregunta">${resumirTexto(p.pregunta)}</p>
  </div>
  <a class="panel-boton ${claseBoton}" href="${seguro(rutaResponder)}">Responder</a>
</li>`;
  });
  return html`<p class="panel-bloque-enlace"><a class="panel-enlace" href="#/consultas">Ver todas</a></p>
<ul class="panel-lista-consultas">${seguro(items.join(""))}</ul>`;
}

/** Distribución segmentada del catálogo por salud de stock, reutilizando .panel-segmentos y .panel-estado-casillas. */
export function renderizarCatalogo(datos) {
  const { total, segmentos } = desgloseCatalogo(datos);
  if (total === 0) return '<p class="panel-vacio">Aún no hay productos.</p>';
  const barras = segmentos
    .filter((s) => s.cantidad > 0)
    .map((s) => html`<span class="panel-segmento panel-estado-${s.color}" style="flex-grow: ${s.cantidad}"></span>`)
    .join("");
  const casillas = segmentos
    .map((s) => html`<li class="panel-estado-casilla"><span class="panel-estado-cuadro panel-estado-${s.color}" aria-hidden="true"></span><a class="panel-estado-nombre panel-estado-enlace" href="${seguro(s.ruta)}">${s.nombre}</a><span class="panel-estado-numero">${s.cantidad}</span></li>`)
    .join("");
  return html`<div class="panel-segmentos" aria-hidden="true">${seguro(barras)}</div>
<ul class="panel-estado-casillas">${seguro(casillas)}</ul>`;
}

/**
 * Estructura completa del Inicio con los bloques en estado skeleton de carga inicial.
 * @param {{ hoy?: Date }} [opciones] hoy: la fecha del encabezado (para probar)
 */
export function renderizarInicioVendedor({ hoy = new Date() } = {}) {
  const skeletonsKpi = seguro(renderizarSkeletonsKpi(4));
  const skeletonsBloque = seguro(renderizarSkeletonsLista(3));
  const skeletonsCatalogo = seguro(renderizarSkeletonsLista(2));
  return html`<div class="panel-inicio">
  <header class="panel-encabezado panel-encabezado-acciones">
    <div>
      <p class="panel-fecha">${fechaDeHoy(hoy)}</p>
      <h1 class="panel-titulo">Inicio</h1>
      <p class="panel-apoyo">Tu catálogo y lo que conviene reponer o responder hoy.</p>
    </div>
    <div class="panel-acciones-encabezado">
      <a class="panel-boton panel-boton-secundario" href="#/productos">${seguro(icono("productos"))}<span>Ver catálogo</span></a>
      <a class="panel-boton panel-boton-principal" href="#/productos?nuevo=1">${seguro(icono("mas"))}<span>Nuevo producto</span></a>
    </div>
  </header>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${skeletonsKpi}</section>
  <div class="panel-inicio-rejilla">
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-stock-bajo">
      <h2 id="inicio-titulo-stock-bajo" class="panel-subtitulo">Productos con stock bajo</h2>
      <div id="inicio-stock-bajo" aria-busy="true">${skeletonsBloque}</div>
    </section>
    <div class="panel-inicio-lateral">
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-consultas">
        <h2 id="inicio-titulo-consultas" class="panel-subtitulo">Consultas de clientes</h2>
        <div id="inicio-consultas" aria-busy="true">${skeletonsBloque}</div>
      </section>
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-catalogo">
        <div class="panel-bloque-cabecera">
          <h2 id="inicio-titulo-catalogo" class="panel-subtitulo">Catálogo</h2>
          <a class="panel-enlace" href="#/productos">Administrar productos</a>
        </div>
        <div id="inicio-catalogo" aria-busy="true">${skeletonsCatalogo}</div>
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
      zonaCatalogo.innerHTML = renderizarCatalogo(productos);
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
