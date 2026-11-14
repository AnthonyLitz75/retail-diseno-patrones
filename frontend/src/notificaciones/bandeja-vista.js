/**
 * @file bandeja-vista.js
 * Módulo de interfaz y polling para la bandeja de notificaciones en tiempo real del cliente.
 * Incluye optimización con Page Visibility API para pausar polling cuando la pestaña esté inactiva.
 */

import {
  obtenerBadgeEstadoNotificacion,
  contarNotificacionesNoLeidas,
  formatearFechaNotificacion,
  consultarMisNotificaciones,
  registrarLectura,
} from "./bandeja-notificaciones.js";
import { ROL } from "../utilidades/constantes.js"

/**
 * Crea el elemento DOM interactivo para una notificación individual.
 * @param {Object} notif
 * @param {Function} [onSeleccionar]
 * @returns {HTMLElement}
 */
export function crearElementoNotificacion(notif, onSeleccionar) {
  const item = document.createElement("div");
  item.className = "notification-item p-2 mb-1 rounded text-decoration-none d-block";
  if (!notif.leida) {
    item.classList.add("is-unread");
  }
  item.style.cursor = "pointer";

  const badgeInfo = obtenerBadgeEstadoNotificacion(notif.estado);
  const fechaTexto = formatearFechaNotificacion(notif.creadaEn);

  const cabecera = document.createElement("div");
  cabecera.className = "d-flex justify-content-between align-items-center mb-1";

  const badgeSpan = document.createElement("span");
  badgeSpan.className = badgeInfo.clase;
  badgeSpan.textContent = badgeInfo.texto;

  const fechaSmall = document.createElement("small");
  fechaSmall.className = "text-muted";
  fechaSmall.style.fontSize = "0.72rem";
  fechaSmall.textContent = fechaTexto;

  cabecera.append(badgeSpan, fechaSmall);

  const mensajeP = document.createElement("p");
  mensajeP.className = "mb-1 text-dark small fw-medium";
  mensajeP.textContent = notif.mensaje || `Pedido #${notif.pedidoId}`;

  const linkSmall = document.createElement("small");
  linkSmall.className = "text-primary";
  linkSmall.style.fontSize = "0.75rem";
  linkSmall.textContent = `Ver pedido #${notif.pedidoId} →`;

  item.append(cabecera, mensajeP, linkSmall);

  if (typeof onSeleccionar === "function") {
    item.addEventListener("click", () => onSeleccionar(notif));
  }

  return item;
}

/**
 * Renderiza la lista de notificaciones y actualiza el contador de pendientes.
 * @param {Array<Object>} notificaciones
 * @param {Object} elementos
 * @param {Function} [onSeleccionar]
 */
export function renderizarBandejaNotificaciones(
  notificaciones = [],
  { badgeContador, listaContenedor },
  onSeleccionar,
) {
  const pendientes = contarNotificacionesNoLeidas(notificaciones);

  if (badgeContador) {
    if (pendientes > 0) {
      badgeContador.textContent = pendientes > 99 ? "99+" : String(pendientes);
      badgeContador.hidden = false;
    } else {
      badgeContador.hidden = true;
    }
  }

  if (!listaContenedor) return;
  listaContenedor.replaceChildren();

  if (!notificaciones.length) {
    const vacio = document.createElement("div");
    vacio.className = "text-center text-muted p-4";

    const icono = document.createElement("div");
    icono.className = "mb-2 fs-4 opacity-50";
    icono.textContent = "🔔";

    const texto = document.createElement("p");
    texto.className = "mb-0 small fw-medium";
    texto.textContent = "No tienes notificaciones pendientes";

    const subtexto = document.createElement("small");
    subtexto.className = "text-secondary";
    subtexto.textContent = "Te avisaremos cuando tus pedidos cambien de estado.";

    vacio.append(icono, texto, subtexto);
    listaContenedor.appendChild(vacio);
    return;
  }

  notificaciones.forEach((notif) => {
    const elemento = crearElementoNotificacion(notif, onSeleccionar);
    listaContenedor.appendChild(elemento);
  });
}

let instanciaBandejaActiva = null;

/**
 * Destruye la instancia activa de la bandeja de notificaciones,
 * desuscribiendo los listeners de document y deteniendo el polling.
 */
export function destruirBandeja() {
  if (instanciaBandejaActiva) {
    instanciaBandejaActiva.destruir();
    instanciaBandejaActiva = null;
  }
}

/**
 * Configura los eventos del dropdown, polling inteligente y visibilidad de notificaciones.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarBandejaNotificaciones({
  apiRequest,
  obtenerUsuarioSesion,
  cambiarVista,
  elementos = {},
  alAbrirMenu,
  intervaloMs = 25000,
}) {
  const {
    contenedorNotificaciones,
    btnNotificaciones,
    menuNotificaciones,
    badgeContadorNotificaciones,
    listaNotificaciones,
    btnRefrescarNotificaciones,
  } = elementos;

  let timerPolling = null;
  let cacheNotificaciones = [];
  let manejarClickDocumento = null;
  let manejarKeydownDocumento = null;

  function cerrarMenu() {
    if (menuNotificaciones) {
      menuNotificaciones.classList.remove("show");
    }
    if (btnNotificaciones) {
      btnNotificaciones.setAttribute("aria-expanded", "false");
    }
  }

  function abrirMenu() {
    if (menuNotificaciones) {
      menuNotificaciones.classList.add("show");
    }
    if (btnNotificaciones) {
      btnNotificaciones.setAttribute("aria-expanded", "true");
    }
  }

  function pintarBandeja() {
    renderizarBandejaNotificaciones(
      cacheNotificaciones,
      {
        badgeContador: badgeContadorNotificaciones,
        listaContenedor: listaNotificaciones,
      },
      alSeleccionarNotificacion,
    );
  }

  function alSeleccionarNotificacion(notif) {
    // RF02: abrir una alerta la marca como leída y el contador baja sin recargar todo.
    void registrarLectura(apiRequest, cacheNotificaciones, notif).then((lista) => {
      if (lista !== cacheNotificaciones) {
        cacheNotificaciones = lista;
        pintarBandeja();
      }
    });
    cerrarMenu();
    if (typeof cambiarVista === "function") {
      cambiarVista("pedidos");
    }

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      setTimeout(() => {
        const elementoPedido = document.querySelector(`#pedido-${notif.pedidoId}`);
        if (elementoPedido) {
          elementoPedido.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          elementoPedido.classList.add("border-primary", "shadow-sm");
          setTimeout(() => {
            elementoPedido.classList.remove("border-primary", "shadow-sm");
          }, 3000);
        }
      }, 150);
    }
  }

  async function cargarNotificacionesCliente() {
    const usuario = obtenerUsuarioSesion ? obtenerUsuarioSesion() : null;
    const esCliente = usuario?.rol === ROL.CLIENTE;

    if (!esCliente) {
      if (contenedorNotificaciones) {
        contenedorNotificaciones.hidden = true;
        contenedorNotificaciones.style.display = "none";
      }
      return [];
    }

    if (contenedorNotificaciones) {
      contenedorNotificaciones.hidden = false;
      contenedorNotificaciones.style.display = "inline-block";
    }

    try {
      const datos = await consultarMisNotificaciones(apiRequest, 50);
      cacheNotificaciones = Array.isArray(datos) ? datos : [];
      pintarBandeja();
      return cacheNotificaciones;
    } catch {
      if (listaNotificaciones) {
        listaNotificaciones.replaceChildren();
        const errorMsg = document.createElement("div");
        errorMsg.className = "text-center text-danger p-3 small";
        errorMsg.textContent = "No se pudieron cargar las notificaciones.";
        listaNotificaciones.appendChild(errorMsg);
      }
      return [];
    }
  }

  function detenerPollingNotificaciones() {
    if (timerPolling) {
      clearInterval(timerPolling);
      timerPolling = null;
    }
  }

  function iniciarPollingNotificaciones() {
    detenerPollingNotificaciones();

    timerPolling = setInterval(() => {
      // Optimización: si la pestaña está en segundo plano o el usuario no es cliente, no consultar
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      const usuario = obtenerUsuarioSesion ? obtenerUsuarioSesion() : null;
      if (usuario?.rol === ROL.CLIENTE) {
        void cargarNotificacionesCliente();
      }
    }, intervaloMs);
  }

  // Integración con Page Visibility API
  function manejarCambioVisibilidad() {
    if (typeof document === "undefined") return;
    if (!document.hidden) {
      const usuario = obtenerUsuarioSesion ? obtenerUsuarioSesion() : null;
      if (usuario?.rol === ROL.CLIENTE) {
        // Al regresar a la pestaña, refrescar de inmediato y asegurar polling
        void cargarNotificacionesCliente();
      }
    }
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", manejarCambioVisibilidad);
  }

  // Interacción de Dropdown
  if (btnNotificaciones && menuNotificaciones) {
    btnNotificaciones.addEventListener("click", (evento) => {
      evento.stopPropagation();
      const estaAbierto = menuNotificaciones.classList.contains("show");
      if (estaAbierto) {
        cerrarMenu();
      } else {
        if (typeof alAbrirMenu === "function") {
          alAbrirMenu();
        }
        abrirMenu();
        const usuario = obtenerUsuarioSesion ? obtenerUsuarioSesion() : null;
        if (usuario?.rol === ROL.CLIENTE) {
          void cargarNotificacionesCliente();
        }
      }
    });

    menuNotificaciones.addEventListener("click", (evento) => {
      evento.stopPropagation();
    });

    manejarClickDocumento = (evento) => {
      if (!evento.target?.closest?.("#contenedor-notificaciones")) {
        cerrarMenu();
      }
    };

    manejarKeydownDocumento = (evento) => {
      if (evento.key === "Escape" && menuNotificaciones.classList?.contains?.("show")) {
        cerrarMenu();
        btnNotificaciones.focus?.();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("click", manejarClickDocumento);
      document.addEventListener("keydown", manejarKeydownDocumento);
    }
  }

  // Botón manual de refresco
  if (btnRefrescarNotificaciones) {
    btnRefrescarNotificaciones.addEventListener("click", (evento) => {
      evento.stopPropagation();
      btnRefrescarNotificaciones.classList.add("opacity-50");
      void cargarNotificacionesCliente().finally(() => {
        btnRefrescarNotificaciones.classList.remove("opacity-50");
      });
    });
  }

  function limpiarBandeja() {
    detenerPollingNotificaciones();
    if (contenedorNotificaciones) {
      contenedorNotificaciones.hidden = true;
      contenedorNotificaciones.style.display = "none";
    }
    cerrarMenu();
    if (badgeContadorNotificaciones) {
      badgeContadorNotificaciones.hidden = true;
    }
    if (listaNotificaciones) {
      listaNotificaciones.replaceChildren();
    }
  }

  function destruir() {
    detenerPollingNotificaciones();
    if (typeof document !== "undefined") {
      document.removeEventListener?.("visibilitychange", manejarCambioVisibilidad);
      document.removeEventListener?.("click", manejarClickDocumento);
      document.removeEventListener?.("keydown", manejarKeydownDocumento);
    }
    limpiarBandeja();
    if (instanciaBandejaActiva === resultado) {
      instanciaBandejaActiva = null;
    }
  }

  const resultado = {
    cargarNotificacionesCliente,
    iniciarPollingNotificaciones,
    detenerPollingNotificaciones,
    cerrarMenu,
    limpiarBandeja,
    destruir,
    obtenerCache: () => cacheNotificaciones,
  };
  instanciaBandejaActiva = resultado;
  return resultado;
}
