/**
 * @file pedidos-controlador.js
 * Orquestador y controlador de flujos de pedidos (consulta, cancelación y actualización de estados).
 */

import {
  mostrarPedidos,
  ejecutarActualizacionEstadoPedido,
} from "./pedidos-vista.js";
import {
  mostrarConfirmacion,
  mostrarToast,
} from "../utilidades/notificaciones.js";

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
    await ejecutarActualizacionEstadoPedido({
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

  async function cargarPedidos() {
    const estado = obtenerEstado ? obtenerEstado() : {};
    if (!estado.usuarioSesion) {
      if (seccionPedidos) seccionPedidos.hidden = true;
      if (listaPedidos) listaPedidos.replaceChildren();
      return;
    }

    const esCliente = estado.usuarioSesion.rol === "CLIENTE";
    const esEmpleado = ["ADMIN", "VENDEDOR", "ALMACEN"].includes(
      estado.usuarioSesion.rol,
    );
    if (!esCliente && !esEmpleado) {
      if (seccionPedidos) seccionPedidos.hidden = true;
      return;
    }

    const esOperativo = ["ADMIN", "ALMACEN"].includes(estado.usuarioSesion.rol);
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
      listaPedidos.replaceChildren();
    }

    try {
      const respuesta = await apiRequest(ruta);
      const pedidos = await respuesta.json();
      mostrarPedidos(pedidos, {
        esCliente,
        usuarioSesion: estado.usuarioSesion,
        listaPedidos,
        estadoPedidos,
        onActualizarEstado: (id, accion, boton, datos) =>
          actualizarEstadoPedido(id, accion, boton, datos),
        onCancelarPedido: (pedido, boton) => cancelarPedido(pedido, boton),
        onExplorarCatalogo: () => {
          if (typeof cambiarVista === "function") cambiarVista("tienda");
        },
      });
    } catch (error) {
      if (estadoPedidos) {
        estadoPedidos.className = "text-danger";
        estadoPedidos.textContent = `No se pudieron cargar los pedidos. ${error.message}`;
      }
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
      if (estado.usuarioSesion && estado.usuarioSesion.rol === "CLIENTE") {
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
    document.addEventListener("retail:pedido-confirmado", () => {
      cargarPedidos();
      if (typeof cambiarVista === "function") cambiarVista("pedidos");
    });
  }

  return {
    cargarPedidos,
    cancelarPedido,
    actualizarEstadoPedido,
  };
}
