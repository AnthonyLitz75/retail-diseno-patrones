/**
 * @file soporte-vista.js
 * Spec 006 (T012, T020, US7): portal de Soporte con la bandeja de reclamos (tomar,
 * responder, resolver, escalar), la bandeja de devoluciones (aprobar o rechazar y registrar
 * la recepción con casillas de reposición) y el contexto del pedido. El backend decide;
 * esta vista solo ofrece las acciones que el estado permite.
 */

import {
  consultarContextoPedido,
  decidirDevolucion,
  escalarReclamo,
  ESTADOS_FILTRO_DEVOLUCION,
  ESTADOS_FILTRO_RECLAMO,
  etiquetaEstadoDevolucion,
  etiquetaEstadoReclamo,
  listarBandejaDevoluciones,
  listarBandejaReclamos,
  recibirDevolucion,
  responderReclamo,
  tomarReclamo,
} from "../atencion/atencion.js";
import { formatoPrecio } from "../utilidades/formato.js";

/** Acciones de Soporte sobre un reclamo según su estado y responsable. */
export function accionesReclamo(reclamo, usuarioId) {
  if (reclamo.estado === "ABIERTO") return ["tomar"];
  if (reclamo.estado === "EN_ATENCION") {
    return Number(reclamo.soporteId) === Number(usuarioId) ? ["responder", "escalar"] : ["otroAgente"];
  }
  return [];
}

/** Acción de Soporte sobre una devolución según su estado. */
export function accionDevolucion(devolucion) {
  return { SOLICITADA: "decidir", APROBADA: "recibir" }[devolucion.estado] || null;
}

function el(etiqueta, clase = "", texto = "") {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== "") nodo.textContent = texto;
  return nodo;
}

function boton(texto, clase = "btn btn-outline-primary btn-sm", tipo = "button") {
  const b = el("button", clase, texto);
  b.type = tipo;
  return b;
}

function badge({ texto, clase }) {
  return el("span", `badge rounded-pill ${clase}`, texto);
}

function fecha(valor) {
  const d = valor ? new Date(valor) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString("es-PE") : "";
}

function selectorEstados(id, estados, etiquetaTodos) {
  const select = el("select", "form-select form-select-sm w-auto");
  select.id = id;
  select.setAttribute("aria-label", etiquetaTodos);
  select.append(new Option(etiquetaTodos, ""));
  estados.forEach((estado) => select.append(new Option(estado.replaceAll("_", " "), estado)));
  return select;
}

function tarjetaBandeja(titulo, select) {
  const seccion = el("section", "card shadow-sm mb-4");
  const cuerpo = el("div", "card-body");
  const cabecera = el("div", "d-flex flex-wrap align-items-center justify-content-between gap-2");
  const actualizar = boton("Actualizar");
  const controles = el("div", "d-flex gap-2 align-items-center");
  controles.append(select, actualizar);
  cabecera.append(el("h2", "h5 mb-0", titulo), controles);
  const estado = el("p", "text-secondary small mt-3 mb-2");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");
  const lista = el("div", "list-group");
  cuerpo.append(cabecera, estado, lista);
  seccion.append(cuerpo);
  return { seccion, actualizar, estado, lista };
}

export function configurarPortalSoporte({ apiRequest, obtenerEstado, contenedor, mostrarToast }) {
  if (!contenedor) return { cargar: async () => {} };

  const panelContexto = el("section", "card shadow-sm mb-4 border-primary");
  panelContexto.hidden = true;
  const filtroReclamos = selectorEstados("filtro-reclamos-soporte", ESTADOS_FILTRO_RECLAMO, "Pendientes");
  const filtroDevoluciones = selectorEstados("filtro-devoluciones-soporte", ESTADOS_FILTRO_DEVOLUCION, "Por atender");
  const reclamos = tarjetaBandeja("Reclamos de clientes", filtroReclamos);
  const devoluciones = tarjetaBandeja("Devoluciones", filtroDevoluciones);
  contenedor.replaceChildren(panelContexto, reclamos.seccion, devoluciones.seccion);

  const usuarioId = () => obtenerEstado?.()?.usuarioSesion?.idUsuario;
  const esSoporte = () => obtenerEstado?.()?.usuarioSesion?.rol === "SOPORTE";

  async function ejecutar(accion, mensaje, control, estadoEl, recargar) {
    if (control) control.disabled = true;
    try {
      await accion();
      mostrarToast?.(mensaje, "exito");
      await recargar();
    } catch (error) {
      if (estadoEl) {
        estadoEl.className = "small text-danger mb-0 mt-1";
        estadoEl.textContent = error.message;
      }
      if (control) control.disabled = false;
    }
  }

  // ---------- Contexto del pedido (US7) ----------

  async function mostrarContexto(pedidoId) {
    panelContexto.hidden = false;
    panelContexto.replaceChildren(el("div", "card-body text-secondary small", `Cargando el pedido #${pedidoId}...`));
    try {
      const contexto = await consultarContextoPedido(apiRequest, pedidoId);
      panelContexto.replaceChildren(renderizarContexto(contexto));
    } catch (error) {
      panelContexto.replaceChildren(el("div", "card-body text-danger small", `No se pudo cargar el pedido. ${error.message}`));
    }
    panelContexto.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }

  function renderizarContexto({ pedido, pago, reclamos: previos = [], devoluciones: devs = [] }) {
    const cuerpo = el("div", "card-body");
    const cabecera = el("div", "d-flex justify-content-between align-items-start gap-2");
    cabecera.append(el("h2", "h5", `Pedido #${pedido.idPedido} · ${pedido.estado.replaceAll("_", " ")}`));
    const cerrar = boton("Cerrar", "btn-close");
    cerrar.setAttribute("aria-label", "Cerrar el contexto del pedido");
    cerrar.textContent = "";
    cerrar.addEventListener("click", () => { panelContexto.hidden = true; });
    cabecera.append(cerrar);
    cuerpo.append(cabecera);

    const datos = el("dl", "row small mb-2");
    const fila = (t, v) => { datos.append(el("dt", "col-sm-3", t), el("dd", "col-sm-9 mb-1", v)); };
    fila("Cliente", `${pedido.clienteNombre} (${pedido.clienteCorreo || ""})`);
    fila("Fecha y total", `${fecha(pedido.creadoEn)} · ${formatoPrecio(pedido.total)}`);
    fila("Pago", pago
      ? `${pago.estado} · ${formatoPrecio(pago.monto)} · reembolsado ${formatoPrecio(pago.montoReembolsado)}`
      : "Sin pago registrado");
    fila("Envío", pedido.envio
      ? `${pedido.envio.transportista} · ${pedido.envio.codigoSeguimiento}${pedido.envio.entregadoEn ? ` · entregado ${fecha(pedido.envio.entregadoEn)}` : ""}`
      : "Sin despacho");
    fila("Productos", (pedido.productos || [])
      .map((p) => `${p.cantidad} × ${p.nombreProducto} (${formatoPrecio(p.precioUnitario)})`).join("; "));
    fila("Historial", (pedido.historial || []).map((h) => h.estado.replaceAll("_", " ")).join(" → "));
    fila("Atenciones", `${previos.length} reclamo(s): ${previos.map((r) => `#${r.id} ${r.estado}`).join(", ") || "ninguno"}; `
      + `${devs.length} devolución(es): ${devs.map((d) => `#${d.id} ${d.estado}`).join(", ") || "ninguna"}`);
    cuerpo.append(datos);
    return cuerpo;
  }

  function botonContexto(pedidoId) {
    const b = boton(`Ver pedido #${pedidoId}`, "btn btn-link btn-sm px-0");
    b.addEventListener("click", () => void mostrarContexto(pedidoId));
    return b;
  }

  // ---------- Reclamos (T012) ----------

  function formularioReclamo(reclamo, { etiqueta, placeholder, conCasilla, alEnviar, textoBoton }) {
    const form = el("form", "mt-2");
    const texto = el("textarea", "form-control form-control-sm");
    texto.id = `${etiqueta}-${reclamo.id}`;
    texto.rows = 2;
    texto.maxLength = 2000;
    texto.required = true;
    texto.placeholder = placeholder;
    const label = el("label", "form-label small fw-semibold mb-1", textoBoton);
    label.htmlFor = texto.id;
    const pie = el("div", "d-flex flex-wrap align-items-center gap-3 mt-2");
    let casilla = null;
    if (conCasilla) {
      const envoltura = el("div", "form-check mb-0");
      casilla = el("input", "form-check-input");
      casilla.type = "checkbox";
      casilla.id = `resuelto-${reclamo.id}`;
      casilla.checked = true;
      const labelCasilla = el("label", "form-check-label small", "Marcar como resuelto");
      labelCasilla.htmlFor = casilla.id;
      envoltura.append(casilla, labelCasilla);
      pie.append(envoltura);
    }
    const enviar = boton(textoBoton, "btn btn-primary btn-sm", "submit");
    pie.prepend(enviar);
    const estado = el("p", "small mb-0 mt-1");
    estado.setAttribute("role", "status");
    form.append(label, texto, pie, estado);
    form.addEventListener("submit", (evento) => {
      evento.preventDefault();
      alEnviar(texto.value, casilla ? casilla.checked : false, enviar, estado);
    });
    return form;
  }

  function tarjetaReclamo(reclamo) {
    const item = el("article", "list-group-item");
    const cabecera = el("div", "d-flex flex-wrap align-items-center gap-2");
    cabecera.append(
      el("span", "fw-semibold", `Reclamo #${reclamo.id}`),
      badge(etiquetaEstadoReclamo(reclamo.estado)),
      el("span", "small text-secondary", fecha(reclamo.creadoEn)),
    );
    item.append(cabecera, el("p", "fw-semibold small mb-1 mt-2", reclamo.motivo), el("p", "small mb-1", reclamo.descripcion));
    if (reclamo.respuesta) item.append(el("p", "small text-secondary mb-1", `Respuesta: ${reclamo.respuesta}`));
    if (reclamo.motivoEscalamiento) item.append(el("p", "small text-secondary mb-1", `Escalado: ${reclamo.motivoEscalamiento}`));
    if (reclamo.resolucionAdmin) item.append(el("p", "small text-secondary mb-1", `Administrador: ${reclamo.resolucionAdmin}`));
    item.append(botonContexto(reclamo.pedidoId));

    if (!esSoporte()) return item;
    const recargar = () => cargarReclamos();
    for (const accion of accionesReclamo(reclamo, usuarioId())) {
      if (accion === "tomar") {
        const tomar = boton("Tomar reclamo", "btn btn-primary btn-sm d-block mt-2");
        const estado = el("p", "small mb-0");
        tomar.addEventListener("click", () => void ejecutar(
          () => tomarReclamo(apiRequest, reclamo.id), `Reclamo #${reclamo.id} asignado a ti.`, tomar, estado, recargar));
        item.append(tomar, estado);
      } else if (accion === "responder") {
        item.append(formularioReclamo(reclamo, {
          etiqueta: "respuesta", placeholder: "Respuesta para el cliente", conCasilla: true, textoBoton: "Responder",
          alEnviar: (texto, resuelto, control, estado) => void ejecutar(
            () => responderReclamo(apiRequest, reclamo.id, texto, resuelto),
            resuelto ? `Reclamo #${reclamo.id} resuelto.` : `Respuesta enviada al cliente.`, control, estado, recargar),
        }));
      } else if (accion === "escalar") {
        const detalles = el("details", "mt-2");
        detalles.append(el("summary", "small text-danger", "Escalar al administrador"));
        detalles.append(formularioReclamo(reclamo, {
          etiqueta: "escalar", placeholder: "Por qué necesita un administrador", conCasilla: false, textoBoton: "Escalar",
          alEnviar: (texto, _resuelto, control, estado) => void ejecutar(
            () => escalarReclamo(apiRequest, reclamo.id, texto), `Reclamo #${reclamo.id} escalado.`, control, estado, recargar),
        }));
        item.append(detalles);
      } else if (accion === "otroAgente") {
        item.append(el("p", "small text-secondary mb-0 mt-2", "Lo atiende otro agente de soporte."));
      }
    }
    return item;
  }

  async function cargarBandeja(bandeja, listar, filtro, tarjeta, nombre) {
    bandeja.estado.className = "text-secondary small mt-3 mb-2";
    bandeja.estado.textContent = `Cargando ${nombre}...`;
    try {
      const elementos = await listar(apiRequest, filtro.value);
      bandeja.lista.replaceChildren(...elementos.map(tarjeta));
      bandeja.estado.textContent = elementos.length ? `${nombre[0].toUpperCase()}${nombre.slice(1)}: ${elementos.length}` : `No hay ${nombre} en esta vista.`;
    } catch (error) {
      bandeja.estado.className = "text-danger small mt-3 mb-2";
      bandeja.estado.textContent = `No se pudieron cargar los ${nombre}. ${error.message}`;
    }
  }

  const cargarReclamos = () => cargarBandeja(reclamos, listarBandejaReclamos, filtroReclamos, tarjetaReclamo, "reclamos");

  // ---------- Devoluciones (T020) ----------

  function tablaLineas(devolucion, conCasillas) {
    const tabla = el("table", "table table-sm small align-middle mb-2");
    const encabezado = el("tr");
    ["Producto", "Cantidad", "Reembolso", ...(conCasillas ? ["¿Apta para venta?"] : [])]
      .forEach((t) => encabezado.append(el("th", "", t)));
    const thead = el("thead");
    thead.append(encabezado);
    const tbody = el("tbody");
    const casillas = [];
    for (const linea of devolucion.lineas || []) {
      const fila = el("tr");
      fila.append(el("td", "", linea.nombreProducto), el("td", "", String(linea.cantidad)), el("td", "", formatoPrecio(linea.subtotalReembolso)));
      if (conCasillas) {
        const celda = el("td");
        const casilla = el("input", "form-check-input");
        casilla.type = "checkbox";
        casilla.checked = true;
        casilla.setAttribute("aria-label", `${linea.nombreProducto} vuelve al stock`);
        casillas.push({ detalleDevolucionId: linea.id, casilla });
        celda.append(casilla);
        fila.append(celda);
      } else if (devolucion.estado === "CERRADA") {
        fila.lastChild.textContent += linea.reintegrarStock ? " · repuesta" : " · no apta";
      }
      tbody.append(fila);
    }
    tabla.append(thead, tbody);
    return { tabla, casillas };
  }

  function tarjetaDevolucion(devolucion) {
    const item = el("article", "list-group-item");
    const cabecera = el("div", "d-flex flex-wrap align-items-center gap-2");
    cabecera.append(
      el("span", "fw-semibold", `Devolución #${devolucion.id}`),
      badge(etiquetaEstadoDevolucion(devolucion.estado)),
      el("span", "small text-secondary", `${fecha(devolucion.creadoEn)} · ${formatoPrecio(devolucion.importeReembolso)}`),
    );
    item.append(cabecera, el("p", "small mb-1 mt-2", `Motivo: ${devolucion.motivo}`));
    if (devolucion.observacion) item.append(el("p", "small text-secondary mb-1", `Observación: ${devolucion.observacion}`));

    const accion = esSoporte() ? accionDevolucion(devolucion) : null;
    const { tabla, casillas } = tablaLineas(devolucion, accion === "recibir");
    item.append(tabla, botonContexto(devolucion.pedidoId));
    const recargar = () => cargarDevoluciones();

    if (accion === "decidir") {
      const form = el("form", "mt-2");
      const observacion = el("input", "form-control form-control-sm mb-2");
      observacion.maxLength = 2000;
      observacion.placeholder = "Observación para el cliente (opcional)";
      observacion.setAttribute("aria-label", `Observación de la devolución ${devolucion.id}`);
      const aprobar = boton("Aprobar", "btn btn-success btn-sm");
      const rechazar = boton("Rechazar", "btn btn-outline-danger btn-sm");
      const estado = el("p", "small mb-0 mt-1");
      const decidir = (aprobada, control) => void ejecutar(
        () => decidirDevolucion(apiRequest, devolucion.id, aprobada, observacion.value),
        `Devolución #${devolucion.id} ${aprobada ? "aprobada" : "rechazada"}.`, control, estado, recargar);
      aprobar.addEventListener("click", () => decidir(true, aprobar));
      rechazar.addEventListener("click", () => decidir(false, rechazar));
      const botones = el("div", "d-flex gap-2");
      botones.append(aprobar, rechazar);
      form.append(observacion, botones, estado);
      item.append(form);
    } else if (accion === "recibir") {
      const form = el("form", "mt-2 d-flex flex-wrap align-items-center gap-2");
      const escenario = el("select", "form-select form-select-sm w-auto");
      escenario.setAttribute("aria-label", "Resultado del reembolso simulado");
      escenario.append(new Option("Reembolso simulado: aprobado", ""), new Option("Reembolso simulado: rechazado", "PRUEBA_RECHAZADA"));
      const cerrar = boton("Registrar recepción y reembolsar", "btn btn-primary btn-sm", "submit");
      const estado = el("p", "small mb-0 w-100");
      form.append(escenario, cerrar, estado);
      form.addEventListener("submit", (evento) => {
        evento.preventDefault();
        const lineas = casillas.map((c) => ({ detalleDevolucionId: c.detalleDevolucionId, reintegrarStock: c.casilla.checked }));
        void ejecutar(() => recibirDevolucion(apiRequest, devolucion.id, lineas, escenario.value),
          `Devolución #${devolucion.id} cerrada y reembolsada.`, cerrar, estado, recargar);
      });
      item.append(form);
    }
    return item;
  }

  const cargarDevoluciones = () => cargarBandeja(devoluciones, listarBandejaDevoluciones, filtroDevoluciones, tarjetaDevolucion, "devoluciones");

  reclamos.actualizar.addEventListener("click", () => void cargarReclamos());
  filtroReclamos.addEventListener("change", () => void cargarReclamos());
  devoluciones.actualizar.addEventListener("click", () => void cargarDevoluciones());
  filtroDevoluciones.addEventListener("change", () => void cargarDevoluciones());

  async function cargar() {
    if (!esSoporte()) return;
    await Promise.all([cargarReclamos(), cargarDevoluciones()]);
  }

  return { cargar, mostrarContexto };
}
