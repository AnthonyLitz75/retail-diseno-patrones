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
import { SIN_VALOR, renderizarCargando, renderizarErrorBloque, renderizarKpi, cuadroIcono } from "./piezas-inicio.js";
import {
  actividadReciente, estadosPedidos, fechaDeHoy, filasAtencion, indicadoresAdmin, resumenAtencion, resumenPedidos, TAMANO_ACTIVIDAD,
} from "./admin-logica.js";
import { guardarArchivo } from "../utilidades-panel.js";
import { icono } from "../iconos.js";
import { claseRol } from "../roles-visual.js";

const NO_CARGADO = "No se pudo cargar";
const FUENTE = Object.freeze({ RESUMEN: "resumen", GESTION: "gestion", AUDITORIA: "auditoria" });
const ETIQUETAS_INDICADORES = Object.freeze(["Ventas netas", "Pedidos vendidos", "Reclamos escalados", "Valor del inventario"]);
const REPORTE_INICIO = "ventas";

// ---------- Marcado (puro) ----------

/** Icono y color de cada indicador, por etiqueta (el resumen caído no los lleva). */
const ICONO_INDICADOR = Object.freeze({
  "Ventas netas": ["reportes", "azul"],
  "Pedidos vendidos": ["pedidos", "verde"],
  "Reclamos escalados": ["incidencias", "gris"],
  "Valor del inventario": ["inventario", "cielo"],
});

/**
 * Indicadores ya calculados (indicadoresAdmin) o null si el resumen falló. Cada tarjeta lleva un
 * cuadro de icono; «Reclamos escalados» con alerta pasa a estado de alerta (ámbar), con su detalle
 * y, aparte, el enlace «Atender» a Incidencias.
 */
export function renderizarIndicadoresAdmin(indicadores) {
  if (!indicadores) return ETIQUETAS_INDICADORES.map((e) => renderizarKpi(e, SIN_VALOR, NO_CARGADO)).join("");
  return indicadores.map(({ etiqueta, valor, detalle, alerta, enlace }) => {
    const [nombreIcono, tono] = ICONO_INDICADOR[etiqueta] ?? ["inicio", "gris"];
    if (alerta) {
      return html`<article class="panel-kpi panel-kpi-alerta">
  ${seguro(cuadroIcono("incidencias", "alerta"))}
  <div class="panel-kpi-cuerpo">
    <p class="panel-kpi-etiqueta">${etiqueta}</p>
    <p class="panel-kpi-valor">${valor}</p>
    <p class="panel-kpi-detalle">${detalle}</p>
    <a class="panel-kpi-enlace" href="${enlace}">Atender</a>
  </div>
</article>`;
    }
    return html`<article class="panel-kpi panel-kpi-icono">
  ${seguro(cuadroIcono(nombreIcono, tono))}
  <div class="panel-kpi-cuerpo">
    <p class="panel-kpi-etiqueta">${etiqueta}</p>
    <p class="panel-kpi-valor">${valor}</p>
    <p class="panel-kpi-detalle">${detalle}</p>
  </div>
</article>`;
  }).join("");
}

/** Icono de cada fila de «Requiere tu atención» (el tono llega con la fila). */
const ICONO_ATENCION = Object.freeze({ escalados: "incidencias", stock: "inventario", preparacion: "pedidos" });

/**
 * «Requiere tu atención» a partir de filasAtencion: filas (por gravedad, cada una con su icono de
 * 40 px; solo la primera lleva el botón relleno), luego fallos; o «Nada pendiente».
 */
export function renderizarAtencion({ filas, fallos }) {
  if (!filas.length && !fallos.length) return '<p class="panel-vacio">Nada pendiente por ahora.</p>';
  const items = filas.map((f, i) => html`<li class="panel-atencion">
  ${seguro(cuadroIcono(ICONO_ATENCION[f.clave] ?? "pedidos", f.tono ?? "azul", " panel-icono-atencion"))}
  <div class="panel-atencion-texto"><p class="panel-atencion-titulo">${f.texto}</p><p class="panel-atencion-detalle">${f.detalle}</p></div>
  <a class="panel-boton ${i === 0 ? "panel-boton-principal" : "panel-boton-secundario"}" href="${seguro(f.ruta)}">${f.enlace}</a>
</li>`);
  const errores = fallos.map((f) => html`<li class="panel-atencion panel-atencion-fallo">
  <p class="mb-0">${f.texto}</p>
  <button type="button" class="panel-boton panel-boton-secundario" data-reintentar="${f.fuente}">Reintentar</button>
</li>`);
  return html`<ul class="panel-lista-atencion">${seguro([...items, ...errores].join(""))}</ul>`;
}

/**
 * «Pedidos por estado»: barra segmentada (decorativa, aria-hidden) y una casilla por estado con
 * su cuadrado de color, nombre y número. Solo estados con pedidos.
 */
export function renderizarPedidosPorEstado({ total, barras }) {
  if (total === 0 || !barras.length) return '<p class="panel-vacio">Aún no hay pedidos.</p>';
  const segmentos = barras.map((b) => html`<span class="panel-segmento panel-estado-${b.color}" style="flex-grow: ${b.cantidad}"></span>`).join("");
  const casillas = barras.map((b) => html`<li class="panel-estado-casilla"><span class="panel-estado-cuadro panel-estado-${b.color}" aria-hidden="true"></span><span class="panel-estado-nombre">${b.nombre}</span><span class="panel-estado-numero">${b.cantidad}</span></li>`).join("");
  return html`<div class="panel-segmentos" aria-hidden="true">${seguro(segmentos)}</div>
<ul class="panel-estado-casillas">${seguro(casillas)}</ul>`;
}

/**
 * Actividad reciente (actividadReciente) o su texto de vacío. Cada registro: círculo con las
 * iniciales (color por rol), título, «{usuario} · {rol}» y la fecha en su propia línea.
 */
export function renderizarActividad(items) {
  if (!items.length) return '<p class="panel-vacio">Aún no hay actividad registrada.</p>';
  const filas = items.map((i) => {
    const lineas = i.fecha
      ? html`<p class="panel-actividad-detalle panel-actividad-actor" title="${i.actor}">${i.actor}</p>
    <p class="panel-actividad-detalle panel-actividad-fecha">${i.fecha}</p>`
      : html`<p class="panel-actividad-detalle">${i.detalle}</p>`;
    return html`<li class="panel-actividad"><span class="panel-avatar-rol ${claseRol(i.rol)}" aria-hidden="true">${i.iniciales ?? "?"}</span>
  <div class="panel-actividad-cuerpo">
    <p class="panel-actividad-titulo">${i.titulo}</p>
    ${seguro(lineas)}
  </div></li>`;
  });
  return html`<ul class="panel-lista-actividad">${seguro(filas.join(""))}</ul>`;
}

/** Atajos en 2 × 2 (columna derecha): ruta, texto, icono y color. */
const ATAJOS = Object.freeze([
  { ruta: "#/productos?nuevo=1", texto: "Nuevo producto", icono: "productos", tono: "azul" },
  { ruta: "#/categorias?alta=1", texto: "Nueva categoría", icono: "categorias", tono: "verde" },
  { ruta: "#/reportes", texto: "Ver reportes", icono: "reportes", tono: "cielo" },
  { ruta: "#/auditoria", texto: "Auditoría", icono: "auditoria", tono: "ambar" },
]);

function renderizarAtajos() {
  return ATAJOS.map((a) => `<a class="panel-atajo" href="${a.ruta}">${cuadroIcono(a.icono, a.tono)}<span>${a.texto}</span></a>`).join("");
}

/**
 * Estructura completa del Inicio con los bloques en estado «Cargando…».
 * @param {{ hoy?: Date }} [opciones] hoy: la fecha del encabezado (para probar)
 */
export function renderizarInicioAdmin({ hoy = new Date() } = {}) {
  const cargando = seguro(renderizarCargando());
  return html`<div class="panel-inicio">
  <header class="panel-encabezado panel-encabezado-acciones">
    <div>
      <p class="panel-fecha">${fechaDeHoy(hoy)}</p>
      <h1 class="panel-titulo">Inicio</h1>
      <p class="panel-apoyo">Resumen de la tienda y lo que necesita tu atención.</p>
    </div>
    <div class="panel-acciones-encabezado">
      <button type="button" id="inicio-descargar-csv" class="panel-boton panel-boton-secundario">${seguro(icono("descarga"))}<span>Descargar reporte (CSV)</span></button>
      <a class="panel-boton panel-boton-principal" href="#/cuentas?alta=1">${seguro(icono("mas"))}<span>Crear cuenta del personal</span></a>
    </div>
  </header>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${cargando}</section>
  <div class="panel-inicio-rejilla panel-inicio-rejilla-admin">
    <div class="panel-inicio-lateral">
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-atencion">
        <div class="panel-bloque-cabecera">
          <h2 id="inicio-titulo-atencion" class="panel-subtitulo">Requiere tu atención</h2>
          <span id="inicio-atencion-resumen" class="panel-resumen-cabecera"></span>
        </div>
        <div id="inicio-atencion" aria-busy="true">${cargando}</div>
      </section>
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-estados">
        <div class="panel-bloque-cabecera">
          <h2 id="inicio-titulo-estados" class="panel-subtitulo">Pedidos por estado</h2>
          <span id="inicio-estados-resumen" class="panel-resumen-cabecera"></span>
        </div>
        <div id="inicio-estados" aria-busy="true">${cargando}</div>
      </section>
    </div>
    <div class="panel-inicio-lateral">
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-atajos">
        <h2 id="inicio-titulo-atajos" class="panel-subtitulo">Atajos</h2>
        <div class="panel-atajos">${seguro(renderizarAtajos())}</div>
      </section>
      <section class="panel-tarjeta" aria-labelledby="inicio-titulo-actividad">
        <div class="panel-bloque-cabecera">
          <h2 id="inicio-titulo-actividad" class="panel-subtitulo">Actividad reciente</h2>
          <a class="panel-enlace" href="#/auditoria">Ver toda la auditoría</a>
        </div>
        <div id="inicio-actividad" aria-busy="true">${cargando}</div>
      </section>
    </div>
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
  const resumenAtencionEl = buscar("inicio-atencion-resumen");
  const resumenEstadosEl = buscar("inicio-estados-resumen");
  const zonaActividad = buscar("inicio-actividad");
  const botonCsv = buscar("inicio-descargar-csv");

  /** null = no cargado o con error. */
  let resumen = null;
  let productos = null;

  const ocupado = (zona, valor) => (valor ? zona.setAttribute("aria-busy", "true") : zona.removeAttribute("aria-busy"));

  function pintarAtencion() {
    const atencion = filasAtencion({ resumen, productos });
    zonaAtencion.innerHTML = renderizarAtencion(atencion);
    resumenAtencionEl.textContent = resumenAtencion(atencion.filas);
    ocupado(zonaAtencion, false);
  }

  async function cargarResumen() {
    ocupado(zonaIndicadores, true);
    ocupado(zonaEstados, true);
    try {
      const respuesta = await apiRequest("/api/admin/reportes/resumen");
      resumen = await respuesta.json();
      zonaIndicadores.innerHTML = renderizarIndicadoresAdmin(indicadoresAdmin(resumen));
      const estados = estadosPedidos(resumen.pedidosPorEstado);
      zonaEstados.innerHTML = renderizarPedidosPorEstado(estados);
      resumenEstadosEl.textContent = estados.total > 0 ? resumenPedidos(estados.total) : "";
    } catch {
      resumen = null;
      zonaIndicadores.innerHTML = renderizarIndicadoresAdmin(null);
      zonaEstados.innerHTML = renderizarErrorBloque(FUENTE.RESUMEN);
      resumenEstadosEl.textContent = "";
    } finally {
      ocupado(zonaIndicadores, false);
      ocupado(zonaEstados, false);
      // Contadores «Pedidos» e «Incidencias» del menú (null si la fuente falló).
      servicios.actualizarContadores?.({ resumen });
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
