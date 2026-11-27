/**
 * @file pedidos-controlador.js
 * Orquestador y controlador de flujos de pedidos (consulta, cancelación y actualización de estados).
 */

import {
  mostrarPedidos,
  ejecutarActualizacionEstadoPedido,
  crearFormularioDespacho,
} from "./pedidos-vista.js";
import {
  mostrarConfirmacion,
  mostrarToast,
} from "../utilidades/notificaciones.js";
import {
  listarMisDevoluciones,
  listarMisReclamos,
  registrarReclamo,
  solicitarDevolucion,
} from "../atencion/atencion.js";
import { crearSeccionAtencionPedido } from "../atencion/atencion-cliente.js";
import {
  ESTADOS_FILTRO_PEDIDOS,
  contarPedidosOperativos,
  filtrarPedidosOperativos,
  crearSkeletonsPedidos,
  crearVacioFiltrosPedidos,
  crearErrorPedidos,
  crearBarraFiltrosPedidos,
} from "./pedidos-filtros.js";
import {
  ROL,
  ROLES_INVENTARIO,
  ROLES_OPERACION,
  EVENTOS,
} from "../utilidades/constantes.js";

export { ESTADOS_FILTRO_PEDIDOS, contarPedidosOperativos, filtrarPedidosOperativos };

/**
 * Configura los flujos y eventos de la sección de pedidos.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarControladorPedidos({
  apiRequest,
  obtenerEstado,
  elementos = {},
  acciones = {},
  Modal = null,
}) {
  const {
    seccionPedidos,
    tituloPedidos,
    estadoPedidos,
    listaPedidos,
    enlacePedidosNav,
    enlaceSeguimientoFooter,
  } = elementos;

  const {
    cambiarVista,
  } = acciones;

  async function actualizarEstadoPedido(pedidoId, accion, boton, datos = undefined) {
    return ejecutarActualizacionEstadoPedido({
      apiRequest,
      pedidoId,
      accion,
      boton,
      datos,
      estadoPedidos,
      alActualizar: async () => {
        await cargarPedidos();
      },
      mostrarToast,
    });
  }

  /**
   * Spec 007 (T013): abre el modal de despacho con el formulario de siempre; si el
   * registro sale bien, se cierra. Sin modal (por ejemplo en pruebas), la tarjeta usa el
   * formulario en línea.
   */
  function abrirDespacho(pedido) {
    const modal = typeof document !== "undefined" ? document.querySelector("#modal-despacho") : null;
    const destino = modal?.querySelector("#modal-despacho-formulario");
    if (!modal || !destino || !Modal) return;
    const instancia = Modal.getOrCreateInstance(modal);
    modal.querySelector("#modal-despacho-titulo").textContent = `Registrar despacho del pedido #${pedido.idPedido}`;
    destino.replaceChildren(crearFormularioDespacho(pedido, async ({ transportista, codigoSeguimiento, boton }) => {
      const resultado = await actualizarEstadoPedido(pedido.idPedido, "despachar", boton, { transportista, codigoSeguimiento });
      if (resultado?.ok) instancia.hide();
    }));
    instancia.show();
    modal.addEventListener("shown.bs.modal", () => destino.querySelector("input")?.focus(), { once: true });
  }

  async function cancelarPedido(pedido, boton) {
    const confirmado = await mostrarConfirmacion({
      titulo: "Cancelar pedido",
      mensaje: `¿Estás seguro de cancelar el pedido #${pedido.idPedido}? Se repondrá el stock de los productos.`,
      textoBoton: "Sí, cancelar pedido",
      claseBoton: "btn-danger",
    });
    if (confirmado) {
      await actualizarEstadoPedido(pedido.idPedido, "cancelar", boton);
    }
  }

  /** Reclamos y devoluciones del cliente; si fallan, los pedidos se muestran igual. */
  async function cargarAtencionesCliente() {
    const [reclamos, devoluciones] = await Promise.all([
      listarMisReclamos(apiRequest).catch(() => []),
      listarMisDevoluciones(apiRequest).catch(() => []),
    ]);
    return {
      reclamos: Array.isArray(reclamos) ? reclamos : [],
      devoluciones: Array.isArray(devoluciones) ? devoluciones : [],
    };
  }

  async function enviarAtencion(enviar, mensajeExito, { boton, estado }) {
    if (boton) boton.disabled = true;
    if (estado) {
      estado.className = "small mb-0 text-secondary";
      estado.textContent = "Enviando...";
    }
    try {
      const resultado = await enviar();
      mostrarToast(mensajeExito(resultado), "exito");
      await cargarPedidos();
    } catch (error) {
      if (estado) {
        estado.className = "small mb-0 text-danger";
        estado.textContent = error.message;
      }
      if (boton) boton.disabled = false;
    }
  }

  function enviarReclamo(pedido, datos, ui) {
    return enviarAtencion(
      () => registrarReclamo(apiRequest, pedido.idPedido, datos),
      (reclamo) => `Reclamo #${reclamo.id} registrado. Soporte te responderá pronto.`,
      ui,
    );
  }

  function enviarDevolucion(pedido, motivo, lineas, ui) {
    return enviarAtencion(
      () => solicitarDevolucion(apiRequest, pedido.idPedido, motivo, lineas),
      (devolucion) => `Devolución #${devolucion.id} solicitada. Te avisaremos cuando Soporte la revise.`,
      ui,
    );
  }

  let filtroEstadoActual = "TODOS";
  let textoBusquedaActual = "";
  let ultimosPedidos = [];
  let ultimasOpcionesVista = null;
  let controladorBarraFiltros = null;

  function actualizarBarraFiltros(conteos) {
    controladorBarraFiltros?.actualizar({
      conteos,
      estadoActivo: filtroEstadoActual,
      textoBusqueda: textoBusquedaActual,
    });
  }

  function renderizarPedidosOperativos({ pedidoEnfocado = null } = {}) {
    if (!ultimasOpcionesVista) return;
    actualizarBarraFiltros(contarPedidosOperativos(ultimosPedidos));

    const filtrados = filtrarPedidosOperativos(ultimosPedidos, {
      estado: filtroEstadoActual,
      texto: textoBusquedaActual,
    });

    if (filtrados.length === 0 && ultimosPedidos.length > 0 && typeof document !== "undefined") {
      if (estadoPedidos) {
        estadoPedidos.className = "text-secondary";
        estadoPedidos.classList?.remove("d-none");
        estadoPedidos.textContent = "No hay pedidos que coincidan con el filtro aplicado.";
      }
      listaPedidos?.replaceChildren(
        crearVacioFiltrosPedidos(() => {
          filtroEstadoActual = "TODOS";
          textoBusquedaActual = "";
          renderizarPedidosOperativos();
        }),
      );
      return;
    }

    mostrarPedidos(filtrados, ultimasOpcionesVista);

    if (pedidoEnfocado && typeof listaPedidos?.querySelector === "function") {
      const tarjeta = listaPedidos.querySelector(`#pedido-${pedidoEnfocado}`);
      tarjeta?.classList?.add("panel-consulta-enfocada");
      tarjeta?.scrollIntoView?.({ behavior: "smooth", block: "center" });
    }
  }

  function asegurarBarraFiltros() {
    if (controladorBarraFiltros || typeof listaPedidos?.before !== "function" || typeof document === "undefined") {
      return controladorBarraFiltros;
    }
    controladorBarraFiltros = crearBarraFiltrosPedidos({
      estadoInicial: filtroEstadoActual,
      alCambiarEstado(estadoClave) {
        if (filtroEstadoActual === estadoClave) return;
        filtroEstadoActual = estadoClave;
        renderizarPedidosOperativos();
      },
      alCambiarBusqueda(texto) {
        textoBusquedaActual = texto;
        renderizarPedidosOperativos();
      },
    });
    listaPedidos.before(controladorBarraFiltros.barra);
    return controladorBarraFiltros;
  }

  async function cargarPedidos(parametros = {}) {
    const estado = obtenerEstado ? obtenerEstado() : {};
    if (!estado.usuarioSesion) {
      if (seccionPedidos) seccionPedidos.hidden = true;
      if (controladorBarraFiltros) controladorBarraFiltros.barra.hidden = true;
      if (listaPedidos) listaPedidos.replaceChildren();
      return;
    }

    const esCliente = estado.usuarioSesion.rol === ROL.CLIENTE;
    const esEmpleado = ROLES_INVENTARIO.includes(
      estado.usuarioSesion.rol,
    );
    if (!esCliente && !esEmpleado) {
      if (seccionPedidos) seccionPedidos.hidden = true;
      if (controladorBarraFiltros) controladorBarraFiltros.barra.hidden = true;
      return;
    }

    const esOperativo = ROLES_OPERACION.includes(estado.usuarioSesion.rol);
    const ruta = esCliente
      ? "/api/pedidos/mis-pedidos"
      : esOperativo
        ? "/api/pedidos/operativos"
        : "/api/pedidos/pendientes";

    if (seccionPedidos) seccionPedidos.hidden = false;
    if (tituloPedidos) {
      tituloPedidos.textContent = esCliente
        ? "Mis pedidos"
        : esOperativo
          ? "Gestión operativa de pedidos"
          : "Pedidos pendientes";
    }
    if (estadoPedidos) {
      estadoPedidos.className = "text-secondary";
      estadoPedidos.textContent = "Cargando pedidos...";
    }
    if (listaPedidos) {
      listaPedidos.setAttribute?.("aria-busy", "true");
      if ((esOperativo || esCliente) && typeof document !== "undefined") {
        listaPedidos.replaceChildren(crearSkeletonsPedidos(3));
      } else {
        listaPedidos.replaceChildren();
      }
    }

    try {
      const respuesta = await apiRequest(ruta);
      const pedidos = await respuesta.json();
      const atenciones = esCliente ? await cargarAtencionesCliente() : null;
      const opcionesVista = {
        esCliente,
        usuarioSesion: estado.usuarioSesion,
        listaPedidos,
        estadoPedidos,
        onActualizarEstado: (id, accion, boton, datos) =>
          actualizarEstadoPedido(id, accion, boton, datos),
        onCancelarPedido: (pedido, boton) => cancelarPedido(pedido, boton),
        onAbrirDespacho: Modal ? (pedido) => abrirDespacho(pedido) : null,
        crearAtencion: atenciones
          ? (pedido) => crearSeccionAtencionPedido(pedido, {
            ...atenciones,
            onRegistrarReclamo: enviarReclamo,
            onSolicitarDevolucion: enviarDevolucion,
          })
          : null,
        onExplorarCatalogo: () => {
          if (typeof cambiarVista === "function") cambiarVista("tienda");
        },
        mostrarFiltros: !esOperativo,
      };

      if (esOperativo) {
        ultimosPedidos = Array.isArray(pedidos) ? pedidos : [];
        ultimasOpcionesVista = opcionesVista;
        if (parametros?.estado && ESTADOS_FILTRO_PEDIDOS.includes(parametros.estado)) {
          filtroEstadoActual = parametros.estado;
        } else if (parametros?.pedido) {
          const objetivo = ultimosPedidos.find(
            (item) => String(item?.idPedido) === String(parametros.pedido),
          );
          if (objetivo && filtroEstadoActual !== "TODOS" && objetivo.estado !== filtroEstadoActual) {
            filtroEstadoActual = "TODOS";
          }
        }
        asegurarBarraFiltros();
        renderizarPedidosOperativos({ pedidoEnfocado: parametros?.pedido || null });
      } else {
        if (controladorBarraFiltros) controladorBarraFiltros.barra.hidden = true;
        mostrarPedidos(pedidos, opcionesVista);
      }
    } catch (error) {
      if (estadoPedidos) {
        estadoPedidos.className = "text-danger";
        estadoPedidos.classList?.remove("d-none");
        estadoPedidos.textContent = `No se pudieron cargar los pedidos. ${error.message}`;
      }
      if (listaPedidos && typeof document !== "undefined") {
        listaPedidos.replaceChildren(
          crearErrorPedidos(() => {
            void cargarPedidos(parametros);
          }),
        );
      }
    } finally {
      listaPedidos?.removeAttribute?.("aria-busy");
    }
  }

  // Escuchadores de eventos
  if (enlacePedidosNav) {
    enlacePedidosNav.addEventListener("click", (evento) => {
      evento.preventDefault();
      if (typeof window !== "undefined") window.location.hash = "#/pedidos";
      if (typeof cambiarVista === "function") cambiarVista("pedidos");
    });
  }

  if (enlaceSeguimientoFooter) {
    enlaceSeguimientoFooter.addEventListener("click", (evento) => {
      evento.preventDefault();
      const estado = obtenerEstado ? obtenerEstado() : {};
      if (estado.usuarioSesion && estado.usuarioSesion.rol === ROL.CLIENTE) {
        if (typeof cambiarVista === "function") cambiarVista("pedidos");
        if (typeof document !== "undefined") {
          document.querySelector("#seccion-pedidos")?.scrollIntoView({ behavior: "smooth" });
        }
      } else if (estado.usuarioSesion) {
        mostrarToast(
          "El seguimiento de compras personales está disponible para cuentas de cliente.",
          "info",
        );
      } else {
        mostrarToast(
          "Inicia sesión para dar seguimiento a tus compras y pedidos.",
          "info",
        );
        if (typeof window !== "undefined") {
          setTimeout(() => {
            window.location.href = "/login.html";
          }, 700);
        }
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener(EVENTOS.PEDIDO_CONFIRMADO, () => {
      void cargarPedidos();
      if (typeof cambiarVista === "function") cambiarVista("pedidos");
    });
  }

  return {
    cargarPedidos,
    cancelarPedido,
    actualizarEstadoPedido,
  };
}
