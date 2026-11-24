/**
 * @file main.js
 * Punto de entrada y orquestador principal de Píxel Andino Tech Store.
 * Inicializa el layout modular, servicios, componentes especializados y enrutador SPA.
 * Los módulos del personal (productos, inventario, consultas, administración, auditoría y
 * soporte) se montan en el panel del personal (panel.html) desde T11; la tienda ya no los
 * configura ni llama a sus APIs.
 */

import "bootstrap/dist/css/bootstrap.min.css";
// Bootstrap se carga una sola vez (ESM, que ya registra los data-bs-*). Antes también se
// importaba bootstrap.bundle.min.js y cada clic en un data-bs-toggle se procesaba dos veces.
import { Modal, Offcanvas } from "bootstrap";
import "./style.css";

import { apiRequest, suscribirEventosApi } from "./api/api.js";
import { configurarErroresGlobales } from "./utilidades/errores-globales.js";
import { configurarFocoTeclado } from "./utilidades/foco-teclado.js";
import { crearIndicadorCarga } from "./utilidades/indicador-carga.js";
import { estado } from "./estado/estado-global.js";
import { montarLayoutPrincipal } from "./layout/layout.js";
import {
  agregarProductoAlCarrito,
  cargarCarrito,
  inicializarCarrito,
  ocultarCarrito,
  establecerUsuarioSesion,
} from "./carrito/carrito.js";
import {
  sincronizarCarritoInvitadoConBackend,
  hayCarritoInvitado,
} from "./carrito/carrito-invitado.js";
import { mostrarToast } from "./utilidades/notificaciones.js";
import { html } from "./utilidades/seguridad.js";

// Módulos especializados refactorizados (Hitos 1 a 6)
import { configurarModalPreguntas } from "./modales/modal-preguntas.js";
import { configurarModalReclamaciones } from "./modales/modal-reclamaciones.js";
import { configurarBandejaNotificaciones } from "./notificaciones/bandeja-vista.js";
import { configurarControladorPedidos } from "./pedidos/pedidos-controlador.js";
import { configurarControladorCatalogo } from "./catalogo/catalogo-controlador.js";
import { configurarControlesUI } from "./layout/controles-ui.js";
import { configurarSesionYVistas } from "./estado/sesion.js";
import { configurarEnrutadorSPA } from "./router/router.js";
import { configurarMiAtencion } from "./atencion/mi-atencion.js";
import { ROL } from "./utilidades/constantes.js";

// 1. Montaje del Layout Semántico Principal
montarLayoutPrincipal("#app");
configurarFocoTeclado();
inicializarCarrito({ Offcanvas });

// 1b. Indicador de carga y manejo global de 401/403 (spec 007, T002 y T004)
crearIndicadorCarga({
  suscribir: suscribirEventosApi,
  raizOcupada: document.querySelector("#app"),
});
configurarErroresGlobales({
  suscribir: suscribirEventosApi,
  obtenerUsuario: () => estado.usuarioSesion,
  mostrarToast,
  alSesionExpirada: () => sesionCtrl.mostrarSesionCerrada(),
  redirigir: (ruta) => {
    window.location.href = ruta;
  },
});
/** Se resuelve cuando se conoce la sesión; las guardas del enrutador la esperan. */
let promesaSesion = Promise.resolve();

// 2. Modales del cliente
const { abrirModalPreguntas } = configurarModalPreguntas({
  apiRequest,
  Modal,
  mostrarToast,
  obtenerPreguntasCliente: () => estado.preguntasCliente,
  onPreguntaEnviada: async () => {
    await catalogoCtrl.cargarPreguntasCliente();
  },
});

configurarModalReclamaciones({ Modal, mostrarToast });

// 3. "Mi atención" del cliente (spec 007, T012)
const miAtencion = configurarMiAtencion({
  apiRequest,
  contenedor: document.querySelector("#vista-atencion"),
});

// 4. Bandeja de Notificaciones en Tiempo Real
const notificacionesCtrl = configurarBandejaNotificaciones({
  apiRequest,
  obtenerUsuarioSesion: () => estado.usuarioSesion,
  cambiarVista: (vista) => sesionCtrl.cambiarVista(vista),
  alAbrirMenu: () => {
    document
      .querySelector("#menu-categorias-dropdown")
      ?.classList.remove("show");
    document
      .querySelector("#btn-toggle-categorias-menu")
      ?.setAttribute("aria-expanded", "false");
  },
  elementos: {
    contenedorNotificaciones: document.querySelector(
      "#contenedor-notificaciones",
    ),
    btnNotificaciones: document.querySelector("#btn-notificaciones"),
    menuNotificaciones: document.querySelector("#menu-notificaciones"),
    badgeContadorNotificaciones: document.querySelector(
      "#badge-contador-notificaciones",
    ),
    listaNotificaciones: document.querySelector("#lista-notificaciones"),
    btnRefrescarNotificaciones: document.querySelector(
      "#btn-refrescar-notificaciones",
    ),
  },
});

// 5. "Mis compras" del cliente
const pedidosCtrl = configurarControladorPedidos({
  apiRequest,
  Modal,
  obtenerEstado: () => estado,
  elementos: {
    seccionPedidos: document.querySelector("#seccion-pedidos"),
    tituloPedidos: document.querySelector("#titulo-pedidos"),
    estadoPedidos: document.querySelector("#estado-pedidos"),
    listaPedidos: document.querySelector("#lista-pedidos"),
    enlacePedidosNav: document.querySelector("#enlace-pedidos-nav"),
    enlaceSeguimientoFooter: document.querySelector(
      "#enlace-seguimiento-footer",
    ),
  },
  acciones: {
    cambiarVista: (vista) => sesionCtrl.cambiarVista(vista),
  },
});

// 6. Catálogo, Filtros y Vitrinas
const catalogoCtrl = configurarControladorCatalogo({
  apiRequest,
  estado,
  elementos: {
    contenedor: document.querySelector("#productos"),
    estadoCatalogo: document.querySelector("#estado-catalogo"),
    contenedorPaginacion: document.querySelector("#contenedor-paginacion"),
    listaPaginacion: document.querySelector("#lista-paginacion"),
    gridDestacados: document.querySelector("#grid-destacados"),
    gridComponentes: document.querySelector("#grid-componentes"),
    campoBusqueda: document.querySelector("#busqueda"),
    campoBusquedaPrincipal: document.querySelector("#busqueda-principal"),
    formularioBusquedaRapida: document.querySelector("#busqueda-rapida"),
    filtroCategoria: document.querySelector("#filtro-categoria"),
    precioMinimo: document.querySelector("#precio-min"),
    precioMaximo: document.querySelector("#precio-max"),
    selectorOrden: document.querySelector("#orden-catalogo"),
    switchSoloStock: document.querySelector("#solo-stock"),
    botonLimpiarFiltros: document.querySelector("#limpiar-filtros"),
  },
  acciones: {
    mostrarToast,
    obtenerCallbacksTarjeta: () => ({
      onAgregarCarrito: (id, prod) => agregarProductoAlCarrito(id, prod),
      onAbrirPreguntas: (prod) => abrirModalPreguntas(prod),
    }),
  },
});

// 7. Enrutador SPA por Location Hash
const enrutadorSPA = configurarEnrutadorSPA({
  estado,
  elementos: {
    contenedorBreadcrumbs: document.querySelector("#contenedor-breadcrumbs"),
    listaBreadcrumbs: document.querySelector("#lista-breadcrumbs"),
    vistaTienda: document.querySelector("#vista-tienda"),
    bloqueVitrinaInicio: document.querySelector("#bloque-vitrina-inicio"),
    bloqueCatalogoCompleto: document.querySelector("#bloque-catalogo-completo"),
    vistaDetalleProducto: document.querySelector("#vista-detalle-producto"),
    vista404: document.querySelector("#vista-404"),
    filtroCategoria: document.querySelector("#filtro-categoria"),
    campoBusqueda: document.querySelector("#busqueda"),
  },
  acciones: {
    cargarProductos: () => catalogoCtrl.cargarProductos(),
    cargarArbolCategorias: () => uiCtrl.cargarArbolCategorias(),
    sincronizarCategoriaDestacada: () =>
      catalogoCtrl.sincronizarCategoriaDestacada(),
    cambiarVista: (vista) => sesionCtrl.cambiarVista(vista),
    agregarProductoAlCarrito: (id, prod, cant) =>
      agregarProductoAlCarrito(id, prod, cant),
    abrirModalPreguntas: (prod) => abrirModalPreguntas(prod),
    mostrarToast,
    esperarSesion: () => promesaSesion,
  },
});

// 8. Controles de Interfaz Complementarios (Dropdown, Carruseles, Docks)
const uiCtrl = configurarControlesUI({
  apiRequest,
  estado,
  elementos: {
    btnToggleCategoriasMenu: document.querySelector(
      "#btn-toggle-categorias-menu",
    ),
    menuCategoriasDropdown: document.querySelector("#menu-categorias-dropdown"),
    menuNotificaciones: document.querySelector("#menu-notificaciones"),
    btnNotificaciones: document.querySelector("#btn-notificaciones"),
    campoBusquedaPrincipal: document.querySelector("#busqueda-principal"),
    vistaTienda: document.querySelector("#vista-tienda"),
    bloqueVitrinaInicio: document.querySelector("#bloque-vitrina-inicio"),
    bloqueCatalogoCompleto: document.querySelector("#bloque-catalogo-completo"),
    vistaDetalleProducto: document.querySelector("#vista-detalle-producto"),
    vista404: document.querySelector("#vista-404"),
    estadoCatalogo: document.querySelector("#estado-catalogo"),
  },
  acciones: {
    mostrarProductos: () => catalogoCtrl.actualizarVistaCatalogo(),
    mostrarToast,
    manejarRutaHash: () => enrutadorSPA.manejarRutaHash(),
  },
});

// 9. Sesión de Usuario y Vistas
const sesionCtrl = configurarSesionYVistas({
  apiRequest,
  estado,
  elementos: {
    enlaceLogin: document.querySelector("#enlace-login"),
    enlaceRegistro: document.querySelector("#enlace-registro"),
    usuarioActivo: document.querySelector("#usuario-activo"),
    botonCerrarSesion: document.querySelector("#cerrar-sesion"),
    enlacePanelPersonal: document.querySelector("#enlace-panel-personal"),
    enlacePedidosNav: document.querySelector("#enlace-pedidos-nav"),
    enlaceCarritoNav: document.querySelector("#enlace-carrito-nav"),
    seccionPedidos: document.querySelector("#seccion-pedidos"),
    listaPedidos: document.querySelector("#lista-pedidos"),
    navModulos: document.querySelector("#navegacion-modulos"),
    mapaVistas: {
      tienda: document.querySelector("#vista-tienda"),
      pedidos: document.querySelector("#vista-pedidos"),
      atencion: document.querySelector("#vista-atencion"),
    },
  },
  acciones: {
    establecerUsuarioSesion,
    actualizarVistaCatalogo: () => catalogoCtrl.actualizarVistaCatalogo(),
    sincronizarCarritoInvitadoConBackend,
    cargarPreguntasCliente: () => catalogoCtrl.cargarPreguntasCliente(),
    cargarCarrito,
    ocultarCarrito,
    cargarNotificacionesCliente: () =>
      notificacionesCtrl.cargarNotificacionesCliente(),
    iniciarPollingNotificaciones: () =>
      notificacionesCtrl.iniciarPollingNotificaciones(),
    limpiarBandejaNotificaciones: () => notificacionesCtrl.limpiarBandeja(),
    mostrarToast,
    hayCarritoInvitado,
    onCambioVista: (vista, rol) => {
      if (!estado.usuarioSesion) return;
      if (vista === "pedidos") void pedidosCtrl.cargarPedidos();
      else if (vista === "atencion" && rol === ROL.CLIENTE) void miAtencion.cargar();
    },
  },
});

// 10. Inicialización de la Tienda
async function inicializarTienda() {
  const estadoCatalogo = document.querySelector("#estado-catalogo");
  try {
    await catalogoCtrl.cargarCategorias();
    await Promise.all([
      catalogoCtrl.cargarProductos(),
      uiCtrl.cargarArbolCategorias(),
    ]);
    await enrutadorSPA.manejarRutaHash();
  } catch (error) {
    // Detalle técnico solo para quien depura; el cliente ve un mensaje simple.
    console.error("No se pudo iniciar la tienda", error);
    if (estadoCatalogo) {
      estadoCatalogo.className = "alert alert-danger my-3 py-2 px-3 small";
      estadoCatalogo.innerHTML = html`
        <div class="d-flex align-items-center justify-content-between gap-2">
          <span>No pudimos cargar la tienda. Revisa tu conexión e inténtalo de nuevo en unos segundos.</span>
          <button id="btn-reintentar-inicio" class="btn btn-sm btn-outline-danger" type="button">Reintentar</button>
        </div>
      `;
      document
        .querySelector("#btn-reintentar-inicio")
        ?.addEventListener("click", () => {
          estadoCatalogo.textContent = "Reconectando con el servidor...";
          estadoCatalogo.className = "text-secondary small";
          void inicializarTienda();
        });
    }
  }
}

// Arranque de aplicación
promesaSesion = sesionCtrl.consultarSesion();
void inicializarTienda();
