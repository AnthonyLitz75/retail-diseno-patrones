/**
 * @file main.js
 * Punto de entrada y orquestador principal de Píxel Andino Tech Store.
 * Inicializa el layout modular, servicios, componentes especializados y enrutador SPA.
 */

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Modal, Offcanvas } from "bootstrap";
import "./style.css";

import { apiRequest } from "./api/api.js";
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
import { crearPanelAdministracion } from "./administracion/panel-administracion.js";
import { mostrarToast } from "./utilidades/notificaciones.js";

// Módulos especializados refactorizados (Hitos 1 a 6)
import { configurarModalStock } from "./modales/modal-stock.js";
import { configurarModalPrecio } from "./modales/modal-precio.js";
import { configurarModalPreguntas } from "./modales/modal-preguntas.js";
import { configurarModalReclamaciones } from "./modales/modal-reclamaciones.js";
import { configurarPanelInventario } from "./inventario/inventario-vista.js";
import { configurarBandejaNotificaciones } from "./notificaciones/bandeja-vista.js";
import { configurarControladorPedidos } from "./pedidos/pedidos-controlador.js";
import { configurarBandejaVendedor } from "./vendedor/vendedor-vista.js";
import { configurarControladorCatalogo } from "./catalogo/catalogo-controlador.js";
import { configurarControlesUI } from "./layout/controles-ui.js";
import { configurarSesionYVistas } from "./estado/sesion.js";
import { configurarEnrutadorSPA } from "./router/router.js";

// 1. Montaje del Layout Semántico Principal
montarLayoutPrincipal("#app");
inicializarCarrito({ Offcanvas });

// 2. Modales Especializados
const { abrirModalStock } = configurarModalStock({
  apiRequest,
  Modal,
  mostrarToast,
  onStockActualizado: async (prod) => {
    await catalogoCtrl.cargarProductos();
    if (document.querySelector("#contenedor-historial-stock")?.children.length > 0) {
      await inventarioCtrl.cargarMovimientos(prod);
    }
  },
});

const { abrirModalPrecio } = configurarModalPrecio({
  apiRequest,
  Modal,
  mostrarToast,
  onPrecioActualizado: async () => {
    await catalogoCtrl.cargarProductos();
  },
});

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

// 3. Panel de Administración
const panelAdministracion = crearPanelAdministracion(apiRequest, async () => {
  await catalogoCtrl.cargarCategorias();
  await catalogoCtrl.cargarProductos();
});
document.querySelector("#vista-administracion")?.append(panelAdministracion.element);

// 4. Panel de Inventario y Kardex
const inventarioCtrl = configurarPanelInventario({
  apiRequest,
  obtenerEstado: () => estado,
  mostrarToast,
  cargarProductosCatalogo: async () => {
    await catalogoCtrl.cargarProductos();
  },
  elementos: {
    seccionInventario: document.querySelector("#seccion-inventario"),
    seccionEntradaInventario: document.querySelector("#seccion-entrada-inventario"),
    formularioEntradaInventario: document.querySelector("#form-entrada-inventario"),
    selectorProductoEntrada: document.querySelector("#producto-entrada"),
    cantidadEntrada: document.querySelector("#cantidad-entrada"),
    motivoEntrada: document.querySelector("#motivo-entrada"),
    estadoEntradaInventario: document.querySelector("#estado-entrada-inventario"),
    formularioFiltrosMovimientos: document.querySelector("#filtros-movimientos"),
    selectorProductoMovimientos: document.querySelector("#filtro-producto-movimientos"),
    movimientosDesde: document.querySelector("#movimientos-desde"),
    movimientosHasta: document.querySelector("#movimientos-hasta"),
    estadoMovimientos: document.querySelector("#estado-movimientos"),
    listaMovimientos: document.querySelector("#lista-movimientos"),
    contenedorHistorial: document.querySelector("#contenedor-historial-stock"),
  },
});

// 5. Bandeja de Notificaciones en Tiempo Real
const notificacionesCtrl = configurarBandejaNotificaciones({
  apiRequest,
  obtenerUsuarioSesion: () => estado.usuarioSesion,
  cambiarVista: (vista) => sesionCtrl.cambiarVista(vista),
  alAbrirMenu: () => {
    document.querySelector("#menu-categorias-dropdown")?.classList.remove("show");
    document.querySelector("#btn-toggle-categorias-menu")?.setAttribute("aria-expanded", "false");
  },
  elementos: {
    contenedorNotificaciones: document.querySelector("#contenedor-notificaciones"),
    btnNotificaciones: document.querySelector("#btn-notificaciones"),
    menuNotificaciones: document.querySelector("#menu-notificaciones"),
    badgeContadorNotificaciones: document.querySelector("#badge-contador-notificaciones"),
    listaNotificaciones: document.querySelector("#lista-notificaciones"),
    btnRefrescarNotificaciones: document.querySelector("#btn-refrescar-notificaciones"),
  },
});

// 6. Consultas para Vendedores
const vendedorCtrl = configurarBandejaVendedor({
  apiRequest,
  obtenerEstado: () => estado,
  elementos: {
    seccionPreguntasVendedor: document.querySelector("#seccion-preguntas-vendedor"),
    estadoPreguntasVendedor: document.querySelector("#estado-preguntas-vendedor"),
    listaPreguntasVendedor: document.querySelector("#lista-preguntas-vendedor"),
    btnActualizarPreguntas: document.querySelector("#actualizar-preguntas-vendedor"),
  },
  acciones: { mostrarToast },
});

// 7. Flujo de Pedidos
const pedidosCtrl = configurarControladorPedidos({
  apiRequest,
  obtenerEstado: () => estado,
  elementos: {
    seccionPedidos: document.querySelector("#seccion-pedidos"),
    tituloPedidos: document.querySelector("#titulo-pedidos"),
    estadoPedidos: document.querySelector("#estado-pedidos"),
    listaPedidos: document.querySelector("#lista-pedidos"),
    enlacePedidosNav: document.querySelector("#enlace-pedidos-nav"),
    enlaceSeguimientoFooter: document.querySelector("#enlace-seguimiento-footer"),
  },
  acciones: {
    cambiarVista: (vista) => sesionCtrl.cambiarVista(vista),
  },
});

// 8. Catálogo, Filtros y Vitrinas
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
    formulario: document.querySelector("#form-producto"),
    categoriaProducto: document.querySelector("#categoria-producto"),
    resultadoFormulario: document.querySelector("#resultado-formulario"),
  },
  acciones: {
    mostrarToast,
    obtenerCallbacksTarjeta: () => ({
      onAgregarCarrito: (id, prod) => agregarProductoAlCarrito(id, prod),
      onAbrirPreguntas: (prod) => abrirModalPreguntas(prod),
      onCargarMovimientos: (prod) => inventarioCtrl.cargarMovimientos(prod),
      onAbrirModalStock: (prod) => abrirModalStock(prod),
      onAbrirModalPrecio: (prod) => abrirModalPrecio(prod),
    }),
  },
});

// 9. Enrutador SPA por Location Hash
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
    sincronizarCategoriaDestacada: () => catalogoCtrl.sincronizarCategoriaDestacada(),
    cambiarVista: (vista) => sesionCtrl.cambiarVista(vista),
    agregarProductoAlCarrito: (id, prod, cant) => agregarProductoAlCarrito(id, prod, cant),
    abrirModalPreguntas: (prod) => abrirModalPreguntas(prod),
    mostrarToast,
  },
});

// 10. Controles de Interfaz Complementarios (Dropdown, Carruseles, Docks)
const uiCtrl = configurarControlesUI({
  apiRequest,
  estado,
  elementos: {
    btnToggleCategoriasMenu: document.querySelector("#btn-toggle-categorias-menu"),
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

// 11. Sesión de Usuario y Vistas
const sesionCtrl = configurarSesionYVistas({
  apiRequest,
  estado,
  elementos: {
    enlaceLogin: document.querySelector("#enlace-login"),
    enlaceRegistro: document.querySelector("#enlace-registro"),
    usuarioActivo: document.querySelector("#usuario-activo"),
    botonCerrarSesion: document.querySelector("#cerrar-sesion"),
    enlacePedidosNav: document.querySelector("#enlace-pedidos-nav"),
    enlaceCarritoNav: document.querySelector("#enlace-carrito-nav"),
    seccionGestionProductos: document.querySelector("#seccion-gestion-productos"),
    panelAdministracion,
    seccionPreguntasVendedor: document.querySelector("#seccion-preguntas-vendedor"),
    estadoPreguntasVendedor: document.querySelector("#estado-preguntas-vendedor"),
    listaPreguntasVendedor: document.querySelector("#lista-preguntas-vendedor"),
    seccionInventario: document.querySelector("#seccion-inventario"),
    seccionEntradaInventario: document.querySelector("#seccion-entrada-inventario"),
    listaMovimientos: document.querySelector("#lista-movimientos"),
    seccionPedidos: document.querySelector("#seccion-pedidos"),
    listaPedidos: document.querySelector("#lista-pedidos"),
    navModulos: document.querySelector("#navegacion-modulos"),
    mapaVistas: {
      tienda: document.querySelector("#vista-tienda"),
      pedidos: document.querySelector("#vista-pedidos"),
      inventario: document.querySelector("#vista-inventario"),
      administracion: document.querySelector("#vista-administracion"),
      consultas: document.querySelector("#vista-consultas"),
    },
  },
  acciones: {
    establecerUsuarioSesion,
    actualizarVistaCatalogo: () => catalogoCtrl.actualizarVistaCatalogo(),
    sincronizarCarritoInvitadoConBackend,
    cargarPreguntasCliente: () => catalogoCtrl.cargarPreguntasCliente(),
    cargarCarrito,
    ocultarCarrito,
    cargarNotificacionesCliente: () => notificacionesCtrl.cargarNotificacionesCliente(),
    iniciarPollingNotificaciones: () => notificacionesCtrl.iniciarPollingNotificaciones(),
    limpiarBandejaNotificaciones: () => notificacionesCtrl.limpiarBandeja(),
    mostrarToast,
    hayCarritoInvitado,
    onCambioVista: (vista, rol) => {
      if (estado.usuarioSesion) {
        if (vista === "pedidos") void pedidosCtrl.cargarPedidos();
        else if (vista === "inventario" && ["ADMIN", "VENDEDOR", "ALMACEN"].includes(rol)) void inventarioCtrl.iniciarPanelInventario();
        else if (vista === "consultas" && rol === "VENDEDOR") void vendedorCtrl.cargarPreguntasVendedor();
        else if (vista === "administracion" && rol === "ADMIN") void panelAdministracion.cargar();
      }
    },
  },
});

// 12. Inicialización de la Tienda
async function inicializarTienda() {
  const estadoCatalogo = document.querySelector("#estado-catalogo");
  try {
    await catalogoCtrl.cargarCategorias();
    await Promise.all([
      catalogoCtrl.cargarProductos(),
      uiCtrl.cargarArbolCategorias(),
    ]);
    await enrutadorSPA.manejarRutaHash();
  } catch {
    if (estadoCatalogo) {
      estadoCatalogo.className = "alert alert-danger my-3 py-2 px-3 small";
      estadoCatalogo.innerHTML = `
        <div class="d-flex align-items-center justify-content-between gap-2">
          <span>No se pudieron conectar los servicios de la tienda. Comprueba que el backend de Spring Boot esté activo en el puerto 8081.</span>
          <button id="btn-reintentar-inicio" class="btn btn-sm btn-outline-danger" type="button">Reintentar</button>
        </div>
      `;
      document.querySelector("#btn-reintentar-inicio")?.addEventListener("click", () => {
        estadoCatalogo.textContent = "Reconectando con el servidor...";
        estadoCatalogo.className = "text-secondary small";
        void void inicializarTienda();
      });
    }
  }
}

// Arranque de aplicación
void sesionCtrl.consultarSesion();
void inicializarTienda();
