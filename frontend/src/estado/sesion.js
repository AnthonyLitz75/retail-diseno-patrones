/**
 * @file sesion.js
 * Módulo centralizado para la gestión del estado de sesión de usuario y navegación por vistas (tabs).
 */

import {
  determinarVistasPorRol,
  obtenerVistaInicial,
  obtenerEtiquetaPestaña,
  esVistaPermitida,
  usaMenuLateral,
} from "../utilidades/navegacion.js";
import { ROL, ROLES_CATALOGO, ROLES_OPERACION } from "../utilidades/constantes.js"

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

  /**
   * @param {string} vista
   * @param {{conservarHash?: boolean}} [opciones] conservarHash: al fijar la vista inicial de la
   *   sesión no se toca la URL; el enrutador y sus guardas deciden qué hacer con ella (spec 007).
   */
  function cambiarVista(vista, { conservarHash = false } = {}) {
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
    // El detalle de producto y el 404 son parte de la tienda: al abrir otro módulo desde
    // ellos no deben quedar visibles debajo.
    if (vista !== "tienda" && typeof document !== "undefined") {
      for (const selector of ["#vista-detalle-producto", "#vista-404"]) {
        const contenedor = document.querySelector?.(selector);
        if (contenedor) contenedor.hidden = true;
      }
    }

    if (
      !conservarHash &&
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

    // Boceto del panel del personal: en pantallas grandes los módulos van en un menú lateral.
    const contenedor = navModulos.closest?.("main");
    if (!rol) {
      navModulos.hidden = true;
      contenedor?.classList.remove("con-menu-lateral");
      cambiarVista("tienda", { conservarHash: true });
      return;
    }

    const vistasPermitidas = determinarVistasPorRol(rol);
    navModulos.hidden = vistasPermitidas.length <= 1;
    contenedor?.classList.toggle("con-menu-lateral", usaMenuLateral(rol, vistasPermitidas));

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

    const hashActual = typeof window !== "undefined" ? window.location.hash : "";
    const vistaDefecto = obtenerVistaInicial(rol, hashActual);
    cambiarVista(vistaDefecto, { conservarHash: true });
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
    if (enlaceCarritoNav) enlaceCarritoNav.hidden = usuario.rol !== ROL.CLIENTE;
    if (seccionGestionProductos) {
      seccionGestionProductos.hidden = !ROLES_CATALOGO.includes(usuario.rol);
    }
    if (panelAdministracion?.element) {
      panelAdministracion.element.hidden = false;
    }
    if (seccionPreguntasVendedor) seccionPreguntasVendedor.hidden = false;
    if (seccionInventario) seccionInventario.hidden = false;
    if (seccionEntradaInventario) {
      seccionEntradaInventario.hidden = !ROLES_OPERACION.includes(usuario.rol);
    }

    actualizarPestañasPorRol(usuario.rol);
    if (typeof actualizarVistaCatalogo === "function") {
      actualizarVistaCatalogo();
    }

    if (usuario.rol === ROL.CLIENTE) {
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
      // Al salir a propósito se vuelve al inicio: la ruta privada ya no tiene sentido.
      if (typeof window !== "undefined" && window.location.hash === "#/pedidos") {
        window.location.hash = "#/";
      }
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
