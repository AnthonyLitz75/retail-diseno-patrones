/**
 * Módulo de Vista de Pedidos y Seguimiento para Píxel Andino Tech Store.
 * Renderiza tarjetas de pedidos con auditoría de estados, stepper visual,
 * miniaturas de productos, formulario de despacho y sanitización anti-XSS.
 */

import { html, seguro } from "../utilidades/seguridad.js";
import { formatoPrecio } from "../utilidades/formato.js";
import { renderizarStepperPedido } from "./pedidos-stepper.js";
import {
  asignarImagenConRespaldo,
  resolverImagenProducto,
} from "../catalogo/componentes/imagen-producto.js";
import { ROL, ROLES_OPERACION, ESTADO_PEDIDO } from "../utilidades/constantes.js";

/**
 * Retorna la clase semántica de Bootstrap para el badge de estado del pedido.
 *
 * @param {string} estadoPedido - Clave de estado
 * @returns {string} Clase CSS de badge
 */
export function claseEstadoPedido(estadoPedido) {
  return (
    {
      PENDIENTE: "text-bg-warning",
      EN_PREPARACION: "text-bg-primary",
      DESPACHADO: "text-bg-info",
      ENTREGADO: "text-bg-success",
      CANCELADO: "text-bg-secondary",
    }[estadoPedido] || "text-bg-secondary"
  );
}

/**
 * Crea una tarjeta DOM individual para un pedido con sanitización de campos dinámicos.
 *
 * @param {object} pedido - Datos del pedido
 * @param {object} opciones - Opciones de rol y callbacks
 * @returns {HTMLElement} Elemento article con la tarjeta del pedido
 */
export function crearTarjetaPedido(
  pedido,
  {
    esCliente = false,
    usuarioSesion = null,
    onActualizarEstado = null,
    onCancelarPedido = null,
    crearAtencion = null,
    onAbrirDespacho = null,
  } = {},
) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "order-card mb-4";
  tarjeta.id = `pedido-${pedido.idPedido}`;

  // 1. Cabecera estructurada
  const fecha = new Date(pedido.creadoEn).toLocaleString("es-PE");
  const estadoLimpio = pedido.estado ? pedido.estado.replaceAll("_", " ") : "";
  const cabecera = document.createElement("header");
  cabecera.className =
    "order-card-header d-flex flex-wrap justify-content-between align-items-center gap-3";
  cabecera.innerHTML = html`
    <div class="d-flex flex-wrap align-items-center gap-2">
      <span class="badge bg-dark-subtle text-dark border px-2.5 py-1.5 fw-bold">Pedido #${Number(pedido.idPedido)}</span>
      <span class="badge rounded-pill ${claseEstadoPedido(pedido.estado)} px-3 py-1.5 fw-semibold">${estadoLimpio}</span>
      <span class="small text-secondary ms-1">· ${fecha}</span>
    </div>
    <div class="text-end">
      <span class="small text-secondary d-block">Total pagado</span>
      <span class="fs-5 fw-bold text-primary">${formatoPrecio(pedido.total)}</span>
    </div>
  `;

  // 2. Cuerpo de la tarjeta
  const cuerpo = document.createElement("div");
  cuerpo.className = "order-card-body";

  // Si es empleado de almacén/vendedor/admin, mostrar datos del cliente sanitizados
  if (!esCliente && pedido.clienteNombre) {
    const clienteInfo = document.createElement("div");
    clienteInfo.className =
      "p-2 mb-3 bg-light rounded-3 small text-secondary d-flex align-items-center gap-2 border";
    clienteInfo.innerHTML = html`
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-badge text-primary" viewBox="0 0 16 16">
        <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
        <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.5z"/>
      </svg>
      <span>Cliente: <strong class="text-dark">${pedido.clienteNombre}</strong> (${pedido.clienteCorreo || ""})</span>
    `;
    cuerpo.append(clienteInfo);
  }

  // 3. Stepper Visual del Patrón State
  const stepperContenedor = document.createElement("div");
  stepperContenedor.innerHTML = renderizarStepperPedido(pedido.estado);
  cuerpo.append(stepperContenedor);

  // 4. Información de Envío (con sanitización XSS)
  if (pedido.envio) {
    const envioBox = document.createElement("div");
    envioBox.className = "order-shipping-box";
    const esEntregado = pedido.estado === ESTADO_PEDIDO.ENTREGADO;
    const estadoTexto = esEntregado ? "Entregado" : "Despachado";
    const estadoBadgeClass = esEntregado ? "bg-primary-subtle text-primary border-primary-subtle" : "bg-success-subtle text-success border-success-subtle";
    const fechaTexto = esEntregado && pedido.envio.entregadoEn
      ? html`<span class="small text-secondary d-block">Entregado el: ${new Date(pedido.envio.entregadoEn).toLocaleString("es-PE")}</span>`
      : "";
    envioBox.innerHTML = html`
      <div class="d-flex align-items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-truck flex-shrink-0" viewBox="0 0 16 16">
          <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-4 0 1 1 0 0 1-1-1V3.5zM1.5 3a.5.5 0 0 0-.5.5v7c0 .179.094.336.236.425a2 2 0 0 1 2.528 0 .5.5 0 0 0 .236-.425V3.5a.5.5 0 0 0-.5-.5h-2zm9.5 0H2v8.075a2 2 0 0 1 1 .925h6a2 2 0 0 1 1-.925V3zm1 3v2h2.55l-1.6-2H12zm2.55 3H12v2h2.5a.5.5 0 0 0 .5-.5V9.5a.5.5 0 0 0-.45-.5zM3 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </svg>
        <div>
          <span class="small fw-bold d-block text-success-emphasis">${esEntregado ? "Envío entregado con " : "Envío en camino con "} ${pedido.envio.transportista || ""}</span>
          <span class="small text-secondary">Código de seguimiento: <strong class="font-monospace text-dark">${pedido.envio.codigoSeguimiento || ""}</strong></span>
          ${fechaTexto}
        </div>
      </div>
      <span class="badge ${estadoBadgeClass} border px-2 py-1">${estadoTexto}</span>
    `;
    // Boceto "Mis compras": copiar el código para pegarlo en la web del transportista.
    if (pedido.envio.codigoSeguimiento) {
      envioBox.querySelector?.("strong.font-monospace")?.after?.(" ", crearBotonCopiarCodigo(pedido.envio.codigoSeguimiento));
    }
    cuerpo.append(envioBox);
  }

  // 5. Lista de Productos con Miniaturas Fotográficas
  if (Array.isArray(pedido.productos) && pedido.productos.length > 0) {
    const productosContenedor = document.createElement("div");
    productosContenedor.className = "order-products-list mt-3 pt-3 border-top";
    const productosTitulo = document.createElement("h6");
    productosTitulo.className =
      "small fw-bold text-secondary text-uppercase mb-2";
    productosTitulo.textContent = `Productos en este pedido (${pedido.productos.length})`;
    productosContenedor.append(productosTitulo);

    for (const producto of pedido.productos) {
      const filaProd = document.createElement("div");
      filaProd.className = "order-product-item";

      const imagenUrl = resolverImagenProducto({
        nombre: producto.nombreProducto,
      });
      const thumb = document.createElement("div");
      thumb.className = "order-product-thumb";
      if (imagenUrl) {
        const img = document.createElement("img");
        asignarImagenConRespaldo(img, imagenUrl);
        img.alt = producto.nombreProducto || "Producto";
        thumb.append(img);
      } else {
        thumb.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.6" class="text-primary">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        `;
      }

      const datosProd = document.createElement("div");
      datosProd.className = "flex-grow-1 min-w-0";
      const cantidad = Number(producto.cantidad) || 1;
      datosProd.innerHTML = html`
        <div class="fw-semibold small text-dark text-truncate">${producto.nombreProducto || ""}</div>
        <div class="small text-muted">${cantidad} unidad${cantidad > 1 ? "es" : ""} × ${formatoPrecio(producto.precioUnitario)}</div>
      `;

      const subtotalProd = document.createElement("div");
      subtotalProd.className = "fw-bold small text-primary text-end";
      subtotalProd.textContent = formatoPrecio(producto.subtotal);

      filaProd.append(thumb, datosProd, subtotalProd);
      productosContenedor.append(filaProd);
    }
    cuerpo.append(productosContenedor);
  }

  // 6. Historial de Estados (Auditoría Timeline con sanitización)
  if (Array.isArray(pedido.historial) && pedido.historial.length > 0) {
    const historial = document.createElement("details");
    historial.className = "order-timeline-details";
    const resumenHistorial = document.createElement("summary");
    resumenHistorial.innerHTML = html`<span>Historial de estados y auditoría (${pedido.historial.length} eventos)</span>`;

    const listaEventos = document.createElement("ul");
    listaEventos.className = "order-timeline-list";
    for (const evento of pedido.historial) {
      const fechaEvento = new Date(evento.fecha).toLocaleString("es-PE");
      const itemEvento = document.createElement("li");
      itemEvento.className = "order-timeline-item";
      const estadoEv = evento.estado ? evento.estado.replaceAll("_", " ") : "";
      itemEvento.innerHTML = html`
        <div class="fw-semibold text-dark">${estadoEv}</div>
        <div class="text-secondary">${evento.comentario || ""}</div>
        <div class="text-muted small">${evento.responsable || ""} · ${fechaEvento}</div>
      `;
      listaEventos.append(itemEvento);
    }
    historial.append(resumenHistorial, listaEventos);
    cuerpo.append(historial);
  }

  // 6b. Atención postventa del cliente (spec 006): reclamos y devoluciones
  if (esCliente && typeof crearAtencion === "function") {
    const atencion = crearAtencion(pedido);
    if (atencion) cuerpo.append(atencion);
  }

  // 7. Acciones según Rol y Estado del Pedido
  const transicionesAlmacen = {
    PENDIENTE: { accion: "preparar", etiqueta: "Marcar en preparación" },
    EN_PREPARACION: {
      accion: "despachar",
      etiqueta: "Marcar como despachado",
    },
    DESPACHADO: { accion: "entregar", etiqueta: "Registrar entrega" },
  };
  const transicion = transicionesAlmacen[pedido.estado];

  const puedeCancelar =
    (esCliente || usuarioSesion?.rol === ROL.VENDEDOR) &&
    pedido.estado === ESTADO_PEDIDO.PENDIENTE;

  if (puedeCancelar) {
    const botonCancelar = document.createElement("button");
    botonCancelar.type = "button";
    botonCancelar.className =
      "btn btn-outline-danger btn-sm rounded-pill px-3 mt-3 align-self-start";
    botonCancelar.textContent = esCliente
      ? "Cancelar pedido"
      : "Cancelar pedido (Soporte ventas)";
    botonCancelar.addEventListener("click", () => {
      onCancelarPedido?.(pedido, botonCancelar);
    });
    cuerpo.append(botonCancelar);
  }

  const esStaffOperativo = ROLES_OPERACION.includes(usuarioSesion?.rol);
  if (!esCliente && esStaffOperativo && transicion) {
    if (transicion.accion === "despachar" && typeof onAbrirDespacho === "function") {
      // Spec 007 (T013): el despacho se registra en un modal con foco y etiquetas propias.
      const botonDespacho = document.createElement("button");
      botonDespacho.type = "button";
      botonDespacho.className =
        "btn btn-primary btn-sm rounded-pill px-4 mt-3 shadow-sm align-self-start";
      botonDespacho.textContent = "Registrar despacho…";
      botonDespacho.addEventListener("click", () => onAbrirDespacho(pedido));
      cuerpo.append(botonDespacho);
    } else if (transicion.accion === "despachar") {
      cuerpo.append(
        crearFormularioDespacho(pedido, ({ transportista, codigoSeguimiento, boton }) => {
          onActualizarEstado?.(pedido.idPedido, "despachar", boton, {
            transportista,
            codigoSeguimiento,
          });
        }),
      );
    } else {
      const botonEstado = document.createElement("button");
      botonEstado.type = "button";
      botonEstado.className =
        "btn btn-primary btn-sm rounded-pill px-4 mt-3 shadow-sm align-self-start";
      botonEstado.textContent = transicion.etiqueta;
      botonEstado.addEventListener("click", () => {
        onActualizarEstado?.(pedido.idPedido, transicion.accion, botonEstado);
      });
      cuerpo.append(botonEstado);
    }
  }

  tarjeta.append(cabecera, cuerpo);
  return tarjeta;
}

/**
 * Renderiza el listado completo de pedidos en el contenedor DOM o su estado vacío.
 *
 * @param {Array<object>} pedidos - Colección de pedidos
 * @param {object} opciones - Opciones de renderizado y contenedor
 */
export function mostrarPedidos(
  pedidos,
  {
    esCliente = false,
    usuarioSesion = null,
    listaPedidos = document.querySelector("#lista-pedidos"),
    estadoPedidos = document.querySelector("#estado-pedidos"),
    onActualizarEstado = null,
    onCancelarPedido = null,
    crearAtencion = null,
    onAbrirDespacho = null,
    onExplorarCatalogo = null,
  } = {},
) {
  if (!listaPedidos) return;

  listaPedidos.replaceChildren();
  if (estadoPedidos) {
    estadoPedidos.className = "text-secondary";
  }

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    if (estadoPedidos) {
      estadoPedidos.textContent = "";
      estadoPedidos.classList.add("d-none");
    }

    const rol = usuarioSesion?.rol;
    const vacio = document.createElement("div");
    vacio.className = "text-center py-5 px-3 bg-light rounded-4 border my-3";
    const botonExplorar = esCliente
      ? seguro(
          '<button type="button" class="btn btn-primary rounded-pill px-4 shadow-sm" id="btn-ir-tienda-pedidos-vacio">Explorar catálogo</button>',
        )
      : "";
    vacio.innerHTML = html`
      <div class="empty-state-icon mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h5 class="fw-bold text-dark mb-1">${
        esCliente
          ? "Todavía no tienes compras registradas"
          : ROLES_OPERACION.includes(rol)
            ? "No hay pedidos por preparar, despachar o entregar"
            : "No hay pedidos pendientes en esta cola"
      }</h5>
      <p class="text-secondary small mb-4">${
        esCliente
          ? "Cuando realices tu primera compra en Píxel Andino, podrás realizar el seguimiento en tiempo real desde aquí."
          : rol === ROL.VENDEDOR
            ? "Como vendedor, aquí atiendes los pedidos nuevos en estado PENDIENTE para soporte o cancelación comercial. Actualmente todos los pedidos de la tienda ya fueron atendidos o no hay compras pendientes."
            : "Los pedidos de los clientes aparecerán en este panel según su estado de despacho."
      }</p>
      ${botonExplorar}
    `;

    if (esCliente && typeof onExplorarCatalogo === "function") {
      vacio
        .querySelector("#btn-ir-tienda-pedidos-vacio")
        ?.addEventListener("click", onExplorarCatalogo);
    }
    listaPedidos.append(vacio);
    return;
  }

  if (estadoPedidos) {
    estadoPedidos.classList.remove("d-none");
    estadoPedidos.textContent = `Pedidos encontrados: ${pedidos.length}`;
  }

  // Boceto "Mis pedidos": filtros por estado con su conteo (solo si hay más de un estado).
  const filtros = contarPedidosPorFiltro(pedidos);
  if (filtros.length > 2) {
    listaPedidos.append(crearFiltrosPedidos(filtros, listaPedidos, estadoPedidos));
  }

  for (const pedido of pedidos) {
    const tarjeta = crearTarjetaPedido(pedido, {
      esCliente,
      usuarioSesion,
      onActualizarEstado,
      onCancelarPedido,
      crearAtencion,
      onAbrirDespacho,
    });
    tarjeta.dataset.estado = pedido.estado || "";
    listaPedidos.append(tarjeta);
  }
}

/** Filtros de la lista de pedidos, en el orden del ciclo de vida (patrón State). */
export const FILTROS_PEDIDOS = Object.freeze([
  { clave: "TODOS", etiqueta: "Todos" },
  { clave: ESTADO_PEDIDO.PENDIENTE, etiqueta: "Pendiente" },
  { clave: ESTADO_PEDIDO.EN_PREPARACION, etiqueta: "En preparación" },
  { clave: ESTADO_PEDIDO.DESPACHADO, etiqueta: "En camino" },
  { clave: ESTADO_PEDIDO.ENTREGADO, etiqueta: "Entregado" },
  { clave: ESTADO_PEDIDO.CANCELADO, etiqueta: "Cancelado" },
]);

/** "Todos" más cada estado que tenga al menos un pedido, con su total. */
export function contarPedidosPorFiltro(pedidos) {
  const lista = Array.isArray(pedidos) ? pedidos : [];
  return FILTROS_PEDIDOS
    .map((filtro) => ({
      ...filtro,
      total: filtro.clave === "TODOS" ? lista.length : lista.filter((p) => p.estado === filtro.clave).length,
    }))
    .filter((filtro) => filtro.clave === "TODOS" || filtro.total > 0);
}

/** Grupo de botones que muestra solo las tarjetas del estado elegido. */
export function crearFiltrosPedidos(filtros, listaPedidos, estadoPedidos = null) {
  const grupo = document.createElement("div");
  grupo.className = "filtros-pedidos";
  grupo.setAttribute("role", "group");
  grupo.setAttribute("aria-label", "Filtrar pedidos por estado");
  const botones = filtros.map((filtro) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "filtro-pedido";
    boton.dataset.filtro = filtro.clave;
    boton.textContent = `${filtro.etiqueta} · ${filtro.total}`;
    boton.setAttribute("aria-pressed", String(filtro.clave === "TODOS"));
    boton.addEventListener("click", () => {
      for (const otro of botones) otro.setAttribute("aria-pressed", String(otro === boton));
      listaPedidos.querySelectorAll(".order-card").forEach((tarjeta) => {
        tarjeta.hidden = filtro.clave !== "TODOS" && tarjeta.dataset.estado !== filtro.clave;
      });
      if (estadoPedidos) {
        estadoPedidos.textContent = filtro.clave === "TODOS"
          ? `Pedidos encontrados: ${filtro.total}`
          : `Mostrando ${filtro.total} de ${filtros[0].total} pedidos (${filtro.etiqueta.toLowerCase()})`;
      }
    });
    return boton;
  });
  grupo.append(...botones);
  return grupo;
}

/** Botón "Copiar código" del seguimiento; avisa si el navegador no permite copiar. */
export function crearBotonCopiarCodigo(codigo, portapapeles = globalThis.navigator?.clipboard) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn btn-link btn-sm p-0 align-baseline boton-copiar-codigo";
  boton.textContent = "Copiar código";
  boton.setAttribute("aria-label", `Copiar el código de seguimiento ${codigo}`);
  boton.addEventListener("click", async () => {
    try {
      if (!portapapeles?.writeText) throw new Error("sin portapapeles");
      await portapapeles.writeText(codigo);
      boton.textContent = "¡Copiado!";
    } catch {
      boton.textContent = "Selecciónalo y cópialo";
    }
    setTimeout(() => {
      boton.textContent = "Copiar código";
    }, 2000);
  });
  return boton;
}

/**
 * Crea el formulario en línea para registrar despacho de un pedido.
 *
 * @param {object} pedido - Pedido a despachar
 * @param {Function} onDespachar - Callback con datos del transportista y botón
 * @returns {HTMLFormElement} Elemento form
 */
export function crearFormularioDespacho(pedido, onDespachar) {
  const formularioDespacho = document.createElement("form");
  formularioDespacho.className = "row g-2 mt-2";

  const campoTransportista = document.createElement("input");
  campoTransportista.type = "text";
  campoTransportista.className = "form-control form-control-sm";
  campoTransportista.maxLength = 120;
  campoTransportista.required = true;
  campoTransportista.placeholder = "Transportista (ej.: Olva Courier)";
  campoTransportista.setAttribute(
    "aria-label",
    `Transportista del pedido ${pedido.idPedido}`,
  );

  const campoSeguimiento = document.createElement("input");
  campoSeguimiento.type = "text";
  campoSeguimiento.className = "form-control form-control-sm";
  campoSeguimiento.maxLength = 120;
  campoSeguimiento.required = true;
  campoSeguimiento.placeholder = "Código de seguimiento";
  campoSeguimiento.setAttribute(
    "aria-label",
    `Código de seguimiento del pedido ${pedido.idPedido}`,
  );

  const boton = document.createElement("button");
  boton.type = "submit";
  boton.className = "btn btn-primary btn-sm";
  boton.textContent = "Registrar despacho";

  const columnaTransportista = document.createElement("div");
  columnaTransportista.className = "col-12 col-md-4";
  columnaTransportista.append(campoTransportista);

  const columnaSeguimiento = document.createElement("div");
  columnaSeguimiento.className = "col-12 col-md-4";
  columnaSeguimiento.append(campoSeguimiento);

  const columnaBoton = document.createElement("div");
  columnaBoton.className = "col-12 col-md-4";
  columnaBoton.append(boton);

  formularioDespacho.append(
    columnaTransportista,
    columnaSeguimiento,
    columnaBoton,
  );

  formularioDespacho.addEventListener("submit", (evento) => {
    evento.preventDefault();
    if (typeof onDespachar === "function") {
      onDespachar({
        transportista: campoTransportista.value.trim(),
        codigoSeguimiento: campoSeguimiento.value.trim(),
        boton,
      });
    }
  });

  return formularioDespacho;
}

/**
 * Ejecuta la llamada API para actualizar el estado del pedido y gestiona feedback visual.
 *
 * @param {object} params
 * @returns {Promise<{ ok: boolean, respuesta?: any, error?: Error }>}
 */
export async function ejecutarActualizacionEstadoPedido({
  apiRequest,
  pedidoId,
  accion,
  boton,
  datos = undefined,
  estadoPedidos = null,
  alActualizar = null,
  mostrarToast = null,
}) {
  if (boton) boton.disabled = true;
  if (estadoPedidos) {
    estadoPedidos.className = "text-secondary";
    estadoPedidos.textContent = `Actualizando el pedido #${pedidoId}...`;
  }

  try {
    const respuesta = await apiRequest(`/api/pedidos/${pedidoId}/${accion}`, {
      method: "PUT",
      ...(datos ? { json: datos } : {}),
    });

    if (typeof alActualizar === "function") {
      await alActualizar();
    }

    const mensajes = {
      preparar: "en preparación",
      despachar: "despachado",
      entregar: "entrega registrada",
      cancelar: "cancelado; el stock fue repuesto",
    };
    const textoExito = `Pedido #${pedidoId}: ${mensajes[accion] || accion}.`;
    if (estadoPedidos) {
      estadoPedidos.className = "text-success";
      estadoPedidos.textContent = textoExito;
    }
    if (typeof mostrarToast === "function") {
      mostrarToast(textoExito, "exito");
    }
    return { ok: true, respuesta };
  } catch (error) {
    const textoError = `No se pudo actualizar el pedido. ${error.message}`;
    if (estadoPedidos) {
      estadoPedidos.className = "text-danger";
      estadoPedidos.textContent = textoError;
    }
    if (typeof mostrarToast === "function") {
      mostrarToast(textoError, "error");
    }
    if (boton) boton.disabled = false;
    return { ok: false, error };
  }
}
