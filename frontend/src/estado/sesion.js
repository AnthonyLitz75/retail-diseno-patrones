/**
 * @file sesion.js
 * Módulo centralizado para la gestión del estado de sesión de usuario y navegación por vistas (tabs).
 */

import {
  determinarVistasPorRol,
  obtenerVistaPorDefecto,
  obtenerEtiquetaPestaña,
  esVistaPermitida,
} from "../utilidades/navegacion.js";

/**
 * Configura y orquesta el estado de sesión del usuario y el cambio dinámico de vistas.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarSesionYVistas({
  apiRequest,
  estado,
  elementos = {},
  acciones = {},
}) {
  const {
    enlaceLogin,
    enlaceRegistro,
    usuarioActivo,
    botonCerrarSesion,
    enlacePedidosNav,
    enlaceCarritoNav,
    seccionGestionProductos,
    panelAdministracion,
    seccionPreguntasVendedor,
    estadoPreguntasVendedor,
    listaPreguntasVendedor,
    seccionInventario,
    seccionEntradaInventario,
    listaMovimientos,
    seccionPedidos,
    listaPedidos,
    navModulos,
    mapaVistas = {},
  } = elementos;

  const {
    establecerUsuarioSesion,
    actualizarVistaCatalogo,
    sincronizarCarritoInvitadoConBackend,
    cargarPreguntasCliente,
    cargarCarrito,
    ocultarCarrito,
    cargarNotificacionesCliente,
    iniciarPollingNotificaciones,
    limpiarBandejaNotificaciones,
    mostrarToast,
    hayCarritoInvitado,
    onCambioVista,
  } = acciones;

  let vistaActiva = "tienda";

  function cambiarVista(vista) {
    const rol = estado.usuarioSesion ? estado.usuarioSesion.rol : null;
    if (!esVistaPermitida(vista, rol)) {
      vista = "tienda";
    }
    vistaActiva = vista;

    if (typeof document !== "undefined") {
      const tabs = document.querySelectorAll("#navegacion-modulos [data-vista]");
      tabs.forEach((tab) => {
        const esSeleccionado = tab.dataset.vista === vista;
        tab.classList.toggle("active", esSeleccionado);
        tab.setAttribute("aria-selected", String(esSeleccionado));
      });
    }

    // Alternar visibilidad de contenedores de vistas
    Object.entries(mapaVistas).forEach(([nombre, contenedor]) => {
      if (contenedor) {
        contenedor.hidden = nombre !== vista;
      }
    });

    if (
      typeof window !== "undefined" &&
      vista === "tienda" &&
      (window.location.hash === "#/pedidos" || window.location.hash === "#seccion-pedidos")
    ) {
      window.location.hash = "#/";
    }

    if (typeof onCambioVista === "function") {
      onCambioVista(vista, rol);
    }
  }

  function actualizarPestañasPorRol(rol) {
    if (!navModulos) return;

    if (!rol) {
      navModulos.hidden = true;
      cambiarVista("tienda");
      return;
    }

    const vistasPermitidas = determinarVistasPorRol(rol);
    navModulos.hidden = vistasPermitidas.length <= 1;

    if (typeof document !== "undefined") {
      const tabs = document.querySelectorAll("#navegacion-modulos [data-vista]");
      tabs.forEach((tab) => {
        const vista = tab.dataset.vista;
        const permitida = vistasPermitidas.includes(vista);
        tab.hidden = !permitida;
        if (permitida) {
          tab.textContent = obtenerEtiquetaPestaña(vista, rol);
        }
      });
    }

    const vistaDefecto = obtenerVistaPorDefecto(rol);
    cambiarVista(vistaDefecto);
  }

  function configurarPestañasNavegacion() {
    if (!navModulos) return;
    navModulos.addEventListener("click", (evento) => {
      const boton = evento.target.closest("button[data-vista]");
      if (boton && boton.dataset.vista) {
        cambiarVista(boton.dataset.vista);
      }
    });
  }

  async function mostrarSesionActiva(usuario) {
    estado.usuarioSesion = usuario;
    if (typeof establecerUsuarioSesion === "function") {
      establecerUsuarioSesion(usuario);
    }

    if (enlaceLogin) enlaceLogin.hidden = true;
    if (enlaceRegistro) enlaceRegistro.hidden = true;
    if (usuarioActivo) {
      usuarioActivo.hidden = false;
      usuarioActivo.textContent = `Sesión: ${usuario.nombre} (${usuario.rol})`;
    }
    if (botonCerrarSesion) botonCerrarSesion.hidden = false;
    if (enlacePedidosNav) enlacePedidosNav.hidden = false;
    if (enlaceCarritoNav) enlaceCarritoNav.hidden = usuario.rol !== "CLIENTE";
    if (seccionGestionProductos) {
      seccionGestionProductos.hidden = !["ADMIN", "VENDEDOR"].includes(usuario.rol);
    }
    if (panelAdministracion?.element) {
      panelAdministracion.element.hidden = false;
    }
    if (seccionPreguntasVendedor) seccionPreguntasVendedor.hidden = false;
    if (seccionInventario) seccionInventario.hidden = false;
    if (seccionEntradaInventario) {
      seccionEntradaInventario.hidden = !["ADMIN", "ALMACEN"].includes(usuario.rol);
    }

    actualizarPestañasPorRol(usuario.rol);
    if (typeof actualizarVistaCatalogo === "function") {
      actualizarVistaCatalogo();
    }

    if (usuario.rol === "CLIENTE") {
      if (typeof hayCarritoInvitado === "function" && hayCarritoInvitado()) {
        if (typeof mostrarToast === "function") {
          mostrarToast("Sincronizando productos de tu carrito...", "info");
        }
        if (typeof sincronizarCarritoInvitadoConBackend === "function") {
          await sincronizarCarritoInvitadoConBackend(apiRequest);
        }
      }
      if (typeof cargarPreguntasCliente === "function") cargarPreguntasCliente();
      if (typeof cargarCarrito === "function") cargarCarrito();
      if (typeof cargarNotificacionesCliente === "function") cargarNotificacionesCliente();
      if (typeof iniciarPollingNotificaciones === "function") iniciarPollingNotificaciones();
    } else {
      if (typeof limpiarBandejaNotificaciones === "function") limpiarBandejaNotificaciones();
      estado.preguntasCliente = [];
      if (typeof ocultarCarrito === "function") ocultarCarrito();
      if (listaPreguntasVendedor) listaPreguntasVendedor.replaceChildren();
    }
  }

  function mostrarSesionCerrada() {
    if (typeof limpiarBandejaNotificaciones === "function") {
      limpiarBandejaNotificaciones();
    }
    estado.usuarioSesion = null;
    if (typeof establecerUsuarioSesion === "function") {
      establecerUsuarioSesion(null);
    }
    estado.preguntasCliente = [];

    if (seccionGestionProductos) seccionGestionProductos.hidden = true;
    if (panelAdministracion?.element) panelAdministracion.element.hidden = true;
    if (seccionPreguntasVendedor) seccionPreguntasVendedor.hidden = true;
    if (estadoPreguntasVendedor) estadoPreguntasVendedor.textContent = "";
    if (listaPreguntasVendedor) listaPreguntasVendedor.replaceChildren();
    if (seccionPedidos) seccionPedidos.hidden = true;
    if (seccionInventario) seccionInventario.hidden = true;
    if (listaMovimientos) listaMovimientos.replaceChildren();
    if (listaPedidos) listaPedidos.replaceChildren();

    if (enlaceLogin) enlaceLogin.hidden = false;
    if (enlaceRegistro) enlaceRegistro.hidden = false;
    if (usuarioActivo) {
      usuarioActivo.hidden = true;
      usuarioActivo.textContent = "";
    }
    if (botonCerrarSesion) botonCerrarSesion.hidden = true;
    if (enlacePedidosNav) enlacePedidosNav.hidden = true;
    if (enlaceCarritoNav) enlaceCarritoNav.hidden = false; // Siempre visible para invitados

    if (typeof cargarCarrito === "function") cargarCarrito(); // Muestra carrito de invitado
    actualizarPestañasPorRol(null);
    if (typeof actualizarVistaCatalogo === "function") {
      actualizarVistaCatalogo();
    }
  }

  async function consultarSesion() {
    try {
      const respuesta = await apiRequest("/api/auth/sesion", {});
      const usuario = await respuesta.json();
      await mostrarSesionActiva(usuario);
    } catch {
      mostrarSesionCerrada();
    }
  }

  async function cerrarSesion() {
    if (botonCerrarSesion) botonCerrarSesion.disabled = true;
    try {
      await apiRequest("/api/auth/logout", {
        method: "POST",
      });
      mostrarSesionCerrada();
    } catch (error) {
      if (usuarioActivo) {
        usuarioActivo.textContent = error.message;
      }
    } finally {
      if (botonCerrarSesion) botonCerrarSesion.disabled = false;
    }
  }

  // Cableado de eventos inicial
  configurarPestañasNavegacion();

  if (botonCerrarSesion) {
    botonCerrarSesion.addEventListener("click", () => cerrarSesion());
  }

  return {
    cambiarVista,
    actualizarPestañasPorRol,
    mostrarSesionActiva,
    mostrarSesionCerrada,
    consultarSesion,
    cerrarSesion,
    obtenerVistaActiva: () => vistaActiva,
  };
}
