/**
 * @file soporte-inicio.js
 * Panel del personal (spec 16 y decisiones P2, P7, P8, P9 y de T08; rediseño v6): Inicio de Soporte.
 * - Dos fuentes que cargan y fallan por separado: GET /api/soporte/reclamos y
 *   GET /api/soporte/devoluciones (sin filtro). «Reintentar» recarga solo su fuente.
 * - «Tu cola de reclamos» (ABIERTO y tus EN_ATENCION) con la espera de cada caso; debajo,
 *   «En manos de otros». «Atender» es la única acción con un clic (PUT …/tomar); el resto navega.
 * - «Buscar pedido» valida el número y abre #/consulta-pedido?pedido={n}.
 * Las funciones renderizar* son puras (texto escapado); montar() las pinta y cablea eventos.
 */

import { html, seguro } from "../../utilidades/seguridad.js";
import { tomarReclamo } from "../../atencion/atencion.js";
import { icono } from "../iconos.js";
import { plural } from "../utilidades-panel.js";
import { fechaDeHoy } from "./admin-logica.js";
import { SIN_VALOR, cuadroIcono, renderizarCargando, renderizarErrorBloque, renderizarKpi } from "./piezas-inicio.js";
import {
  accionDevolucionInicio,
  accionReclamoInicio,
  colaReclamos,
  devolucionesParaInicio,
  esperaDe,
  indicadoresDevoluciones,
  indicadoresReclamos,
  insigniaDevolucion,
  insigniaReclamo,
  productoDevolucion,
  reclamosEnManosDeOtros,
  resumirMotivo,
  MAX_FILAS_SOPORTE,
} from "./soporte-logica.js";
import { conectarBusquedaPedido, renderizarBusquedaPedido } from "./busqueda-pedido.js";
import { crearContextosPedido } from "../pantallas/contextos-pedido.js";

const NO_CARGADO = "No se pudo cargar";
const FUENTE = Object.freeze({ RECLAMOS: "reclamos", DEVOLUCIONES: "devoluciones" });
const MENSAJE_TOMADO = "Reclamo en atención.";
const PREFIJO_BUSQUEDA = "inicio";

const ENCABEZADO_ACCION = '<th scope="col"><span class="visually-hidden">Acción</span></th>';

// ---------- Marcado (puro) ----------

function tarjetaKpi(etiqueta, valor, detalle, nombreIcono, tono, urgente = false) {
  return html`<article class="panel-kpi ${urgente ? "panel-kpi-urgente" : "panel-kpi-icono"}">
  ${seguro(cuadroIcono(nombreIcono, tono))}
  <div class="panel-kpi-cuerpo">
    <p class="panel-kpi-etiqueta">${etiqueta}</p>
    <p class="panel-kpi-valor">${valor}</p>
    <p class="panel-kpi-detalle">${detalle}</p>
  </div>
</article>`;
}

/**
 * @param {{ reclamos: ReturnType<typeof indicadoresReclamos>|null, devoluciones: ReturnType<typeof indicadoresDevoluciones>|null }} datos
 */
export function renderizarIndicadoresSoporte({ reclamos = null, devoluciones = null } = {}) {
  const tarjetas = [];
  if (reclamos) {
    const urgente = reclamos.masDe48h > 0;
    tarjetas.push(
      tarjetaKpi("Reclamos abiertos", reclamos.abiertos,
        urgente ? `${plural(reclamos.masDe48h, "lleva", "llevan")} más de 48 h` : "Esperan primera respuesta",
        "reclamos", urgente ? "urgente" : "rojo", urgente),
      tarjetaKpi("En atención", reclamos.enAtencion,
        `${plural(reclamos.propios, "tuyo", "tuyos")} · ${reclamos.deOtros} de otros`, "consultas", "azul"),
      tarjetaKpi("Escalados", reclamos.escalados, "Con la administración", "incidencias", "ambar"),
    );
  } else {
    tarjetas.push(
      renderizarKpi("Reclamos abiertos", SIN_VALOR, NO_CARGADO),
      renderizarKpi("En atención", SIN_VALOR, NO_CARGADO),
      renderizarKpi("Escalados", SIN_VALOR, NO_CARGADO),
    );
  }
  tarjetas.push(devoluciones
    ? tarjetaKpi("Devoluciones por atender", devoluciones.porAtender,
      `${devoluciones.porEvaluar} por evaluar · ${devoluciones.porRecibir} por recibir`, "devoluciones", "verde")
    : renderizarKpi("Devoluciones por atender", SIN_VALOR, NO_CARGADO));
  return tarjetas.join("");
}

function insignia({ texto, variante }) {
  return html`<span class="panel-insignia panel-insignia-${variante}">${texto}</span>`;
}

/** Etiqueta de espera con icono de reloj; el color sube de normal a ámbar (24 h) y rojo (48 h). */
export function etiquetaEspera(creadoEn, ahora) {
  const espera = esperaDe(creadoEn, ahora);
  return html`<span class="panel-espera panel-espera-${espera.nivel}">${seguro(icono("reloj"))}${espera.texto}</span>`;
}

function celdaClienteMotivo(reclamo, nombres) {
  const motivo = html`<span class="panel-reclamos-motivo">${resumirMotivo(reclamo.motivo)}</span>`;
  // El DTO de reclamo no trae el nombre del cliente: sale del contexto del pedido (nombres), la
  // misma fuente que usa la bandeja de Reclamos. Mientras no llega, solo el motivo.
  const nombre = nombres.get(reclamo.pedidoId);
  return nombre ? html`<span class="panel-reclamos-cliente">${nombre}</span>${seguro(motivo)}` : motivo;
}

/**
 * Tu cola: hasta 5 reclamos (ABIERTO y tus EN_ATENCION), del más antiguo al más reciente.
 * Solo la primera fila lleva el botón primario.
 * @param {Array<object>} reclamos
 * @param {number} usuarioId agente en sesión
 * @param {Date} [ahora]
 * @param {Map<number, string>} [nombres] pedidoId → nombre del cliente
 */
export function renderizarColaReclamos(reclamos, usuarioId, ahora = new Date(), nombres = new Map()) {
  const lista = colaReclamos(reclamos, usuarioId).slice(0, MAX_FILAS_SOPORTE);
  if (!lista.length) return '<p class="panel-vacio">No tienes reclamos pendientes.</p>';
  const filas = lista.map((r, i) => {
    const accion = accionReclamoInicio(r, usuarioId);
    const clase = `panel-boton ${i === 0 ? "panel-boton-principal" : "panel-boton-secundario"}`;
    const control = accion.tipo === "tomar"
      ? html`<button type="button" class="${clase}" data-tomar-reclamo="${r.id}">${accion.texto}</button>`
      : html`<a class="${clase}" href="${seguro(accion.ruta)}">${accion.texto}</a>`;
    return html`<tr data-cliente-pedido="${r.pedidoId}">
  <th scope="row">#${r.pedidoId}</th>
  <td>${seguro(celdaClienteMotivo(r, nombres))}</td>
  <td>${seguro(etiquetaEspera(r.creadoEn, ahora))}</td>
  <td>${seguro(insignia(insigniaReclamo(r.estado)))}</td>
  <td>${seguro(control)}</td>
</tr>`;
  });
  const columnas = ["Pedido", "Cliente y motivo", "Espera", "Estado"].map((c) => html`<th scope="col">${c}</th>`).join("");
  return html`<div class="panel-tabla-contenedor">
  <table class="panel-tabla panel-reclamos-cola">
    <thead><tr>${seguro(columnas)}${seguro(ENCABEZADO_ACCION)}</tr></thead>
    <tbody>${seguro(filas.join(""))}</tbody>
  </table>
</div>`;
}

/** Bloque «En manos de otros»; cadena vacía si no hay ninguno. */
export function renderizarEnManosDeOtros(reclamos, usuarioId, nombres = new Map()) {
  const lista = reclamosEnManosDeOtros(reclamos, usuarioId).slice(0, MAX_FILAS_SOPORTE);
  if (!lista.length) return "";
  const filas = lista.map((r) => {
    const quien = r.estado === "ESCALADO"
      ? "Decide la administración"
      : r.agenteNombre ? `Lo atiende ${r.agenteNombre}` : "Lo atiende otro agente";
    const nombre = nombres.get(r.pedidoId);
    return html`<li class="panel-otros-fila" data-otros-pedido="${r.pedidoId}">
    <div class="panel-otros-texto">
      <p class="panel-otros-titulo">${nombre ? `#${r.pedidoId} · ${nombre}` : `#${r.pedidoId}`}</p>
      <p class="panel-otros-motivo">${resumirMotivo(r.motivo)}</p>
      <p class="panel-otros-detalle">${quien}</p>
    </div>
    ${seguro(insignia(insigniaReclamo(r.estado)))}
    <a class="panel-enlace" href="${seguro(`#/reclamos?id=${r.id}`)}">Ver detalle</a>
  </li>`;
  });
  return html`<section class="panel-otros" aria-labelledby="inicio-titulo-otros">
  <h3 id="inicio-titulo-otros" class="panel-otros-cabecera">En manos de otros</h3>
  <ul class="panel-otros-lista">${seguro(filas.join(""))}</ul>
</section>`;
}

/** Hasta 5 devoluciones SOLICITADA o APROBADA; sus acciones solo navegan (P2). */
export function renderizarDevolucionesPorAtender(devoluciones, ahora = new Date(), nombres = new Map()) {
  const lista = devolucionesParaInicio(devoluciones).slice(0, MAX_FILAS_SOPORTE);
  if (!lista.length) {
    return html`<div class="panel-vacio-ok">${seguro(cuadroIcono("verificacion", "verde"))}<p>Todo al día: no hay devoluciones por atender.</p></div>`;
  }
  const filas = lista.map((d) => {
    const accion = accionDevolucionInicio(d);
    const nombre = nombres.get(d.pedidoId);
    const cliente = nombre ? ` · ${nombre}` : "";
    return html`<li class="panel-devolucion-fila" data-devolucion-pedido="${d.pedidoId}">
    ${seguro(cuadroIcono("pedidos", "azul", " panel-icono-atencion"))}
    <div class="panel-devolucion-texto">
      <p class="panel-atencion-titulo">Pedido #${d.pedidoId}${cliente}</p>
      <p class="panel-atencion-detalle">${productoDevolucion(d)}</p>
    </div>
    ${seguro(etiquetaEspera(d.creadoEn, ahora))}
    ${seguro(insignia(insigniaDevolucion(d.estado)))}
    <a class="panel-boton panel-boton-secundario" href="${seguro(accion.ruta)}">${accion.texto}</a>
  </li>`;
  });
  return html`<ul class="panel-devolucion-lista">${seguro(filas.join(""))}</ul>`;
}

/**
 * Estructura completa del Inicio con los bloques en estado «Cargando…».
 * @param {{ hoy?: Date }} [opciones] hoy: la fecha del encabezado (para probar)
 */
export function renderizarInicioSoporte({ hoy = new Date() } = {}) {
  const cargando = seguro(renderizarCargando());
  return html`<div class="panel-inicio">
  <header class="panel-encabezado panel-encabezado-acciones">
    <div>
      <p class="panel-fecha">${fechaDeHoy(hoy)}</p>
      <h1 class="panel-titulo">Inicio</h1>
      <p class="panel-apoyo">Casos abiertos de clientes, ordenados por antigüedad.</p>
    </div>
    ${seguro(renderizarBusquedaPedido(PREFIJO_BUSQUEDA))}
  </header>
  <section id="inicio-indicadores" class="panel-kpis" aria-label="Indicadores" aria-busy="true">${cargando}</section>
  <div class="panel-inicio-columnas">
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-reclamos">
      <div class="panel-bloque-cabecera">
        <h2 id="inicio-titulo-reclamos" class="panel-subtitulo">Tu cola de reclamos</h2>
        <a class="panel-enlace" href="#/reclamos">Ver todos</a>
      </div>
      <p class="panel-apoyo panel-reclamos-ayuda">Lo más antiguo primero. Pasadas 24 h la espera se marca en ámbar y pasadas 48 h en rojo.</p>
      <div id="inicio-reclamos" aria-busy="true">${cargando}</div>
    </section>
    <section class="panel-tarjeta" aria-labelledby="inicio-titulo-devoluciones">
      <div class="panel-bloque-cabecera">
        <h2 id="inicio-titulo-devoluciones" class="panel-subtitulo">Devoluciones por atender</h2>
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
  // Nombres de los clientes: salen del contexto del pedido, igual que en las bandejas.
  const contextos = crearContextosPedido(apiRequest);
  const nombres = contextos.nombres;

  function pintarReclamos() {
    zonaReclamos.innerHTML = renderizarColaReclamos(reclamos, usuarioId(), new Date(), nombres)
      + renderizarEnManosDeOtros(reclamos, usuarioId(), nombres);
  }

  function pintarDevoluciones() {
    zonaDevoluciones.innerHTML = renderizarDevolucionesPorAtender(devoluciones, new Date(), nombres);
  }

  /** Inserta los nombres en el DOM ya pintado sin reconstruir botones ni perder clics. */
  function actualizarNombresEnDom() {
    zonaReclamos.querySelectorAll("tr[data-cliente-pedido]").forEach((fila) => {
      const nombre = nombres.get(Number(fila.dataset.clientePedido));
      const celda = fila.querySelector("td");
      if (!nombre || !celda || celda.querySelector(".panel-reclamos-cliente")) return;
      const span = document.createElement("span");
      span.className = "panel-reclamos-cliente";
      span.textContent = nombre;
      celda.prepend(span);
    });
    zonaReclamos.querySelectorAll("li[data-otros-pedido]").forEach((item) => {
      const id = Number(item.dataset.otrosPedido);
      const nombre = nombres.get(id);
      const titulo = item.querySelector(".panel-otros-titulo");
      if (nombre && titulo) titulo.textContent = `#${id} · ${nombre}`;
    });
    zonaDevoluciones.querySelectorAll("li[data-devolucion-pedido]").forEach((item) => {
      const id = Number(item.dataset.devolucionPedido);
      const nombre = nombres.get(id);
      const titulo = item.querySelector(".panel-atencion-titulo");
      if (nombre && titulo) titulo.textContent = `Pedido #${id} · ${nombre}`;
    });
  }

  /** Pide los nombres de los pedidos que se ven y los aplica sin reemplazar innerHTML. */
  async function cargarNombres() {
    const ids = [
      ...(reclamos ? colaReclamos(reclamos, usuarioId()).slice(0, MAX_FILAS_SOPORTE) : []),
      ...(reclamos ? reclamosEnManosDeOtros(reclamos, usuarioId()).slice(0, MAX_FILAS_SOPORTE) : []),
      ...(devoluciones ? devolucionesParaInicio(devoluciones).slice(0, MAX_FILAS_SOPORTE) : []),
    ].map((e) => e.pedidoId);
    await contextos.cargar(ids);
    actualizarNombresEnDom();
  }

  const ocupado = (zona, valor) => (valor ? zona.setAttribute("aria-busy", "true") : zona.removeAttribute("aria-busy"));

  function pintarIndicadores() {
    zonaIndicadores.innerHTML = renderizarIndicadoresSoporte({
      reclamos: reclamos ? indicadoresReclamos(reclamos, usuarioId()) : null,
      devoluciones: devoluciones ? indicadoresDevoluciones(devoluciones) : null,
    });
    ocupado(zonaIndicadores, false);
  }

  async function cargarReclamos() {
    ocupado(zonaReclamos, true);
    try {
      const respuesta = await apiRequest("/api/soporte/reclamos");
      reclamos = await respuesta.json();
      pintarReclamos();
    } catch {
      reclamos = null;
      zonaReclamos.innerHTML = renderizarErrorBloque(FUENTE.RECLAMOS);
    } finally {
      ocupado(zonaReclamos, false);
      // Contador «Reclamos» del menú (null si la fuente falló).
      servicios.actualizarContadores?.({ reclamos });
    }
  }

  async function cargarDevoluciones() {
    ocupado(zonaDevoluciones, true);
    try {
      const respuesta = await apiRequest("/api/soporte/devoluciones");
      devoluciones = await respuesta.json();
      pintarDevoluciones();
    } catch {
      devoluciones = null;
      zonaDevoluciones.innerHTML = renderizarErrorBloque(FUENTE.DEVOLUCIONES);
    } finally {
      ocupado(zonaDevoluciones, false);
      // Contador «Devoluciones» del menú (null si la fuente falló).
      servicios.actualizarContadores?.({ devoluciones });
    }
  }

  async function recargar(fuente) {
    await (fuente === FUENTE.DEVOLUCIONES ? cargarDevoluciones() : cargarReclamos());
    pintarIndicadores();
    await cargarNombres();
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
      await cargarNombres();
    },
  };
}
