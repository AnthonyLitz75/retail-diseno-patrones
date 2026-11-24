/**
 * @file soporte-inicio.js
 * Panel del personal (spec 16 y decisiones P2, P7, P8, P9 y de T08): Inicio de Soporte.
 * - Dos fuentes que cargan y fallan por separado: GET /api/soporte/reclamos y
 *   GET /api/soporte/devoluciones (sin filtro). «Reintentar» recarga solo su fuente.
 * - «Atender» es la única acción con un clic (PUT …/tomar). El resto de acciones navega a la
 *   bandeja: la decisión y la recepción de devoluciones tienen sus propios formularios.
 * - «Buscar pedido» valida el número y abre #/consulta-pedido?pedido={n}.
 * Las funciones renderizar* son puras (texto escapado); montar() las pinta y cablea eventos.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { tomarReclamo } from "../../atencion/atencion.js";
import { SIN_VALOR, renderizarCargando, renderizarErrorBloque, renderizarKpi } from "./piezas-inicio.js";
import {
  accionDevolucionInicio,
  accionReclamoInicio,
  devolucionesParaInicio,
  indicadoresDevoluciones,
  indicadoresReclamos,
  insigniaDevolucion,
  insigniaReclamo,
  productoDevolucion,
  reclamosParaInicio,
  resumirMotivo,
  MAX_FILAS_SOPORTE,
} from "./soporte-logica.js";
import { conectarBusquedaPedido, renderizarBusquedaPedido } from "./busqueda-pedido.js";

const NO_CARGADO = "No se pudo cargar";
const FUENTE = Object.freeze({ RECLAMOS: "reclamos", DEVOLUCIONES: "devoluciones" });
const MENSAJE_TOMADO = "Reclamo en atención.";
const PREFIJO_BUSQUEDA = "inicio";

const ENCABEZADO_ACCION = '<th scope="col"><span class="visually-hidden">Acción</span></th>';

// ---------- Marcado (puro) ----------

/**
 * @param {{ reclamos: { abiertos, enAtencion, escalados }|null, devoluciones: { porAtender }|null }} datos
 */
export function renderizarIndicadoresSoporte({ reclamos = null, devoluciones = null } = {}) {
  return [
    reclamos ? renderizarKpi("Reclamos abiertos", reclamos.abiertos, "Esperan primera respuesta")
      : renderizarKpi("Reclamos abiertos", SIN_VALOR, NO_CARGADO),
    reclamos ? renderizarKpi("En atención", reclamos.enAtencion, "En curso")
      : renderizarKpi("En atención", SIN_VALOR, NO_CARGADO),
    reclamos ? renderizarKpi("Escalados", reclamos.escalados, "Con el administrador")
      : renderizarKpi("Escalados", SIN_VALOR, NO_CARGADO),
    devoluciones ? renderizarKpi("Devoluciones por atender", devoluciones.porAtender, "Esperan decisión")
      : renderizarKpi("Devoluciones por atender", SIN_VALOR, NO_CARGADO),
  ].join("");
}

function insignia({ texto, variante }) {
  return html`<span class="panel-insignia panel-insignia-${variante}">${texto}</span>`;
}

function tabla(columnas, filas) {
  const encabezados = columnas.map((c) => html`<th scope="col">${c}</th>`).join("");
  return html`<div class="panel-tabla-contenedor">
  <table class="panel-tabla">
    <thead><tr>${seguro(encabezados)}${seguro(ENCABEZADO_ACCION)}</tr></thead>
    <tbody>${seguro(filas.join(""))}</tbody>
  </table>
</div>`;
}

function enlaceAccion(texto, ruta) {
  return html`<a class="panel-boton panel-boton-secundario" href="${seguro(ruta)}">${texto}</a>`;
}

/**
 * Hasta 5 reclamos no resueltos, del más antiguo al más reciente.
 * @param {Array<object>} reclamos
 * @param {number} usuarioId agente en sesión (decide «Responder» o «Ver detalle»)
 */
export function renderizarTablaReclamos(reclamos, usuarioId) {
  const lista = reclamosParaInicio(reclamos).slice(0, MAX_FILAS_SOPORTE);
  if (!lista.length) return '<p class="panel-vacio">No hay reclamos abiertos.</p>';
  const filas = lista.map((r) => {
    const accion = accionReclamoInicio(r, usuarioId);
    const control = accion.tipo === "tomar"
      ? html`<button type="button" class="panel-boton panel-boton-principal" data-tomar-reclamo="${r.id}">${accion.texto}</button>`
      : enlaceAccion(accion.texto, accion.ruta);
    return html`<tr>
  <th scope="row">#${r.pedidoId}</th>
  <td>${resumirMotivo(r.motivo)}</td>
  <td>${seguro(insignia(insigniaReclamo(r.estado)))}</td>
  <td>${seguro(control)}</td>
</tr>`;
  });
  return tabla(["Pedido", "Motivo", "Estado"], filas);
}

/** Hasta 5 devoluciones SOLICITADA o APROBADA; sus acciones solo navegan (P2). */
export function renderizarTablaDevoluciones(devoluciones) {
  const lista = devolucionesParaInicio(devoluciones).slice(0, MAX_FILAS_SOPORTE);
  if (!lista.length) return '<p class="panel-vacio">No hay devoluciones por atender.</p>';
  const filas = lista.map((d) => {
    const accion = accionDevolucionInicio(d);
    return html`<tr>
  <th scope="row">#${d.pedidoId}</th>
  <td>${productoDevolucion(d)}</td>
  <td>${seguro(insignia(insigniaDevolucion(d.estado)))}</td>
  <td>${seguro(enlaceAccion(accion.texto, accion.ruta))}</td>
</tr>`;
  });
  return tabla(["Pedido", "Producto", "Estado"], filas);
}

/** Estructura completa del Inicio con los bloques en estado «Cargando…». */
export function renderizarInicioSoporte() {
  const cargando = seguro(renderizarCargando());
  return html`<div class="panel-inicio">
  <header class="panel-encabezado panel-encabezado-acciones">
    <div>
      <h1 class="panel-titulo">Inicio</h1>
      <p class="panel-apoyo">Casos abiertos de clientes, ordenados por antigüedad.</p>
    </div>
    ${seguro(renderizarBusquedaPedido(PREFIJO_BUSQUEDA))}
  </header>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${cargando}</section>
  <div class="panel-inicio-columnas">
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-reclamos">
      <div class="panel-bloque-cabecera">
        <h2 id="inicio-titulo-reclamos" class="panel-subtitulo">Reclamos</h2>
        <a class="panel-enlace" href="#/reclamos">Ver todos</a>
      </div>
      <div id="inicio-reclamos" aria-busy="true">${cargando}</div>
    </section>
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-devoluciones">
      <div class="panel-bloque-cabecera">
        <h2 id="inicio-titulo-devoluciones" class="panel-subtitulo">Devoluciones</h2>
        <a class="panel-enlace" href="#/devoluciones">Ver todas</a>
      </div>
      <div id="inicio-devoluciones" aria-busy="true">${cargando}</div>
    </section>
  </div>
</div>`;
}

// ---------- Montaje (DOM) ----------

/**
 * @param {HTMLElement} contenedor
 * @param {{ servicios: { apiRequest: Function, mostrarToast: Function, estado: object, navegar: Function } }} contexto
 * @returns {{ alMostrar: () => Promise<void> }}
 */
export function montar(contenedor, { servicios }) {
  const { apiRequest, mostrarToast, estado, navegar } = servicios;
  contenedor.innerHTML = renderizarInicioSoporte();
  const buscar = (id) => contenedor.querySelector(`#${id}`);
  const zonaIndicadores = buscar("inicio-indicadores");
  const zonaReclamos = buscar("inicio-reclamos");
  const zonaDevoluciones = buscar("inicio-devoluciones");
  const usuarioId = () => estado.usuarioSesion?.idUsuario;

  /** null = no cargado o con error. */
  let reclamos = null;
  let devoluciones = null;

  const ocupado = (zona, valor) => (valor ? zona.setAttribute("aria-busy", "true") : zona.removeAttribute("aria-busy"));

  function pintarIndicadores() {
    zonaIndicadores.innerHTML = renderizarIndicadoresSoporte({
      reclamos: reclamos ? indicadoresReclamos(reclamos) : null,
      devoluciones: devoluciones ? indicadoresDevoluciones(devoluciones) : null,
    });
    ocupado(zonaIndicadores, false);
  }

  async function cargarReclamos() {
    ocupado(zonaReclamos, true);
    try {
      const respuesta = await apiRequest("/api/soporte/reclamos");
      reclamos = await respuesta.json();
      zonaReclamos.innerHTML = renderizarTablaReclamos(reclamos, usuarioId());
    } catch {
      reclamos = null;
      zonaReclamos.innerHTML = renderizarErrorBloque(FUENTE.RECLAMOS);
    } finally {
      ocupado(zonaReclamos, false);
    }
  }

  async function cargarDevoluciones() {
    ocupado(zonaDevoluciones, true);
    try {
      const respuesta = await apiRequest("/api/soporte/devoluciones");
      devoluciones = await respuesta.json();
      zonaDevoluciones.innerHTML = renderizarTablaDevoluciones(devoluciones);
    } catch {
      devoluciones = null;
      zonaDevoluciones.innerHTML = renderizarErrorBloque(FUENTE.DEVOLUCIONES);
    } finally {
      ocupado(zonaDevoluciones, false);
    }
  }

  async function recargar(fuente) {
    await (fuente === FUENTE.DEVOLUCIONES ? cargarDevoluciones() : cargarReclamos());
    pintarIndicadores();
  }

  /** «Atender»: PUT …/tomar. Salga bien o mal se recarga (otro agente pudo tomarlo antes). */
  async function atender(boton) {
    boton.disabled = true;
    try {
      await tomarReclamo(apiRequest, Number(boton.dataset.tomarReclamo));
      mostrarToast(MENSAJE_TOMADO, "exito");
    } catch (error) {
      mostrarToast(error.message, "error");
    }
    await recargar(FUENTE.RECLAMOS);
  }

  contenedor.addEventListener("click", (evento) => {
    const reintentar = evento.target.closest("[data-reintentar]");
    if (reintentar) {
      void recargar(reintentar.dataset.reintentar);
      return;
    }
    const tomar = evento.target.closest("[data-tomar-reclamo]");
    if (tomar && !tomar.disabled) void atender(tomar);
  });

  conectarBusquedaPedido(contenedor, PREFIJO_BUSQUEDA, navegar);

  return {
    async alMostrar() {
      ocupado(zonaIndicadores, true);
      await Promise.all([cargarReclamos(), cargarDevoluciones()]);
      pintarIndicadores();
    },
  };
}
