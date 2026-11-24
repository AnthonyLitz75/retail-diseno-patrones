/**
 * @file admin-inicio.js
 * Panel del personal (spec 17 y decisiones de T09): Inicio del Administrador en #/inicio.
 * - Tres fuentes que cargan y fallan por separado: GET /api/admin/reportes/resumen,
 *   GET /api/productos/gestion y GET /api/admin/auditoria?tamano=5. «Reintentar» recarga solo
 *   su fuente. «Requiere tu atención» combina resumen y gestión.
 * - «Descargar reporte (CSV)» usa solicitarCsv (administracion.js) sin fechas y guarda el
 *   archivo desde el panel; admin-reportes.js no se toca.
 * Las funciones renderizar* son puras (texto escapado); montar() las pinta y cablea eventos.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { REPORTES_CSV, solicitarCsv } from "../../administracion/administracion.js";
import { SIN_VALOR, renderizarCargando, renderizarErrorBloque, renderizarKpi } from "./piezas-inicio.js";
import { actividadReciente, estadosPedidos, filasAtencion, indicadoresAdmin, TAMANO_ACTIVIDAD } from "./admin-logica.js";
import { guardarArchivo } from "../utilidades-panel.js";

const NO_CARGADO = "No se pudo cargar";
const FUENTE = Object.freeze({ RESUMEN: "resumen", GESTION: "gestion", AUDITORIA: "auditoria" });
const ETIQUETAS_INDICADORES = Object.freeze(["Ventas netas", "Pedidos vendidos", "Reclamos escalados", "Valor del inventario"]);
const REPORTE_INICIO = "ventas";

// ---------- Marcado (puro) ----------

/** Indicadores ya calculados (indicadoresAdmin) o null si el resumen falló. */
export function renderizarIndicadoresAdmin(indicadores) {
  if (!indicadores) return ETIQUETAS_INDICADORES.map((e) => renderizarKpi(e, SIN_VALOR, NO_CARGADO)).join("");
  return indicadores.map(({ etiqueta, valor, detalle }) => renderizarKpi(etiqueta, valor, detalle)).join("");
}

/** «Requiere tu atención» a partir de filasAtencion: filas, luego fallos; o «Nada pendiente». */
export function renderizarAtencion({ filas, fallos }) {
  if (!filas.length && !fallos.length) return '<p class="panel-vacio">Nada pendiente por ahora.</p>';
  const items = filas.map((f) => html`<li class="panel-atencion">
  <div class="panel-atencion-texto"><p class="panel-atencion-titulo">${f.texto}</p><p class="panel-atencion-detalle">${f.detalle}</p></div>
  <a class="panel-boton panel-boton-secundario" href="${seguro(f.ruta)}">${f.enlace}</a>
</li>`);
  const errores = fallos.map((f) => html`<li class="panel-atencion panel-atencion-fallo">
  <p class="mb-0">${f.texto}</p>
  <button type="button" class="panel-boton panel-boton-secundario" data-reintentar="${f.fuente}">Reintentar</button>
</li>`);
  return html`<ul class="panel-lista-atencion">${seguro([...items, ...errores].join(""))}</ul>`;
}

/** Barras de estadosPedidos con texto y número; la barra visual va oculta a lectores. */
export function renderizarPedidosPorEstado({ total, barras }) {
  if (total === 0 || !barras.length) return '<p class="panel-vacio">Aún no hay pedidos.</p>';
  return barras.map((b) => html`<div class="panel-estado-fila">
  <p class="panel-estado-nombre">${b.nombre}</p>
  <div class="panel-barra" aria-hidden="true"><div class="panel-barra-relleno panel-estado-${b.color}" style="width: ${b.porcentaje}%"></div></div>
  <p class="panel-estado-numero">${b.cantidad}</p>
</div>`).join("");
}

/** Actividad reciente (actividadReciente) o su texto de vacío. */
export function renderizarActividad(items) {
  if (!items.length) return '<p class="panel-vacio">Aún no hay actividad registrada.</p>';
  const filas = items.map((i) => html`<li class="panel-actividad"><p class="panel-actividad-titulo">${i.titulo}</p><p class="panel-actividad-detalle">${i.detalle}</p></li>`);
  return html`<ul class="panel-lista-actividad">${seguro(filas.join(""))}</ul>`;
}

/** Estructura completa del Inicio con los bloques en estado «Cargando…». */
export function renderizarInicioAdmin() {
  const cargando = seguro(renderizarCargando());
  return html`<div class="panel-inicio">
  <header class="panel-encabezado panel-encabezado-acciones">
    <div>
      <h1 class="panel-titulo">Inicio</h1>
      <p class="panel-apoyo">Resumen de la tienda y lo que necesita tu atención.</p>
    </div>
    <div class="panel-acciones-encabezado">
      <button type="button" id="inicio-descargar-csv" class="panel-boton panel-boton-secundario">Descargar reporte (CSV)</button>
      <a class="panel-boton panel-boton-principal" href="#/cuentas?alta=1">Crear cuenta del personal</a>
    </div>
  </header>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${cargando}</section>
  <div class="panel-inicio-rejilla">
    <div class="panel-inicio-lateral">
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-atencion">
        <h2 id="inicio-titulo-atencion" class="panel-subtitulo">Requiere tu atención</h2>
        <div id="inicio-atencion" aria-busy="true">${cargando}</div>
      </section>
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-estados">
        <h2 id="inicio-titulo-estados" class="panel-subtitulo">Pedidos por estado</h2>
        <div id="inicio-estados" aria-busy="true">${cargando}</div>
      </section>
    </div>
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-actividad">
      <div class="panel-bloque-cabecera">
        <h2 id="inicio-titulo-actividad" class="panel-subtitulo">Actividad reciente</h2>
        <a class="panel-enlace" href="#/auditoria">Ver toda la auditoría</a>
      </div>
      <div id="inicio-actividad" aria-busy="true">${cargando}</div>
    </section>
  </div>
</div>`;
}

// ---------- Montaje (DOM) ----------

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function, mostrarToast: Function } }} contexto
 * @returns {{ alMostrar: () => Promise<void> }}
 */
export function montar(contenedor, { servicios }) {
  const { apiRequest, mostrarToast } = servicios;
  contenedor.innerHTML = renderizarInicioAdmin();
  const buscar = (id) => contenedor.querySelector(`#${id}`);
  const zonaIndicadores = buscar("inicio-indicadores");
  const zonaAtencion = buscar("inicio-atencion");
  const zonaEstados = buscar("inicio-estados");
  const zonaActividad = buscar("inicio-actividad");
  const botonCsv = buscar("inicio-descargar-csv");

  /** null = no cargado o con error. */
  let resumen = null;
  let productos = null;

  const ocupado = (zona, valor) => (valor ? zona.setAttribute("aria-busy", "true") : zona.removeAttribute("aria-busy"));

  function pintarAtencion() {
    zonaAtencion.innerHTML = renderizarAtencion(filasAtencion({ resumen, productos }));
    ocupado(zonaAtencion, false);
  }

  async function cargarResumen() {
    ocupado(zonaIndicadores, true);
    ocupado(zonaEstados, true);
    try {
      const respuesta = await apiRequest("/api/admin/reportes/resumen");
      resumen = await respuesta.json();
      zonaIndicadores.innerHTML = renderizarIndicadoresAdmin(indicadoresAdmin(resumen));
      zonaEstados.innerHTML = renderizarPedidosPorEstado(estadosPedidos(resumen.pedidosPorEstado));
    } catch {
      resumen = null;
      zonaIndicadores.innerHTML = renderizarIndicadoresAdmin(null);
      zonaEstados.innerHTML = renderizarErrorBloque(FUENTE.RESUMEN);
    } finally {
      ocupado(zonaIndicadores, false);
      ocupado(zonaEstados, false);
    }
  }

  async function cargarGestion() {
    try {
      const respuesta = await apiRequest("/api/productos/gestion");
      productos = await respuesta.json();
    } catch {
      productos = null;
    }
  }

  async function cargarActividad() {
    ocupado(zonaActividad, true);
    try {
      const respuesta = await apiRequest(`/api/admin/auditoria?tamano=${TAMANO_ACTIVIDAD}`);
      zonaActividad.innerHTML = renderizarActividad(actividadReciente(await respuesta.json()));
    } catch {
      zonaActividad.innerHTML = renderizarErrorBloque(FUENTE.AUDITORIA);
    } finally {
      ocupado(zonaActividad, false);
    }
  }

  const CARGAS = { [FUENTE.RESUMEN]: cargarResumen, [FUENTE.GESTION]: cargarGestion, [FUENTE.AUDITORIA]: cargarActividad };

  async function recargar(fuente) {
    ocupado(zonaAtencion, fuente !== FUENTE.AUDITORIA);
    await CARGAS[fuente]?.();
    if (fuente !== FUENTE.AUDITORIA) pintarAtencion();
  }

  async function descargarCsv() {
    botonCsv.disabled = true;
    try {
      const respuesta = await solicitarCsv(apiRequest, REPORTE_INICIO, "");
      await guardarArchivo(respuesta, REPORTES_CSV[REPORTE_INICIO].archivo);
    } catch (error) {
      mostrarToast(error.message, "error");
    } finally {
      botonCsv.disabled = false;
    }
  }

  botonCsv.addEventListener("click", () => void descargarCsv());
  contenedor.addEventListener("click", (evento) => {
    const reintentar = evento.target.closest("[data-reintentar]");
    if (reintentar) void recargar(reintentar.dataset.reintentar);
  });

  return {
    async alMostrar() {
      ocupado(zonaAtencion, true);
      await Promise.all([cargarResumen(), cargarGestion(), cargarActividad()]);
      pintarAtencion();
    },
  };
}
