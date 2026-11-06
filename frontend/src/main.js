import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { Modal } from "bootstrap";
import "./style.css";
import { apiRequest } from "./api/api.js";
import {
  crearParametrosMovimientos,
  crearSolicitudEntrada,
} from "./inventario/almacen.js";
import mouseImage from "./assets/mouse.png";
import mouseRazerImage from "./assets/mouse-razer.png";
import tarjetaNvidiaImage from "./assets/tarjeta-video-nvidia.png";
import tecladoImage from "./assets/teclado.png";
import cargadorImage from "./assets/cargador.png";
import webcamImage from "./assets/webcam.png";
import heroBanner from "./assets/banner-retail.png";
import pagoVisa from "./assets/pago-visa.jpg";
import pagoMastercard from "./assets/pago-mastercard.jpg";
import pagoYape from "./assets/pago-yape.png";
import pagoPlin from "./assets/pago-plin.avif";
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
import { esFavorito, alternarFavorito } from "./catalogo/favoritos.js";
import {
  listarPreguntasPendientes,
  enviarRespuestaPregunta,
} from "./vendedor/vendedor.js";
import { crearPanelAdministracion } from "./administracion/panel-administracion.js";
import {
  mostrarToast,
  mostrarConfirmacion,
} from "./utilidades/notificaciones.js";
import {
  determinarVistasPorRol,
  obtenerVistaPorDefecto,
  obtenerEtiquetaPestaña,
  esVistaPermitida,
} from "./utilidades/navegacion.js";
import { obtenerBadgeStock } from "./utilidades/stock.js";
import {
  consultarMisNotificaciones,
  obtenerBadgeEstadoNotificacion,
  contarNotificacionesNoLeidas,
  formatearFechaNotificacion,
} from "./notificaciones/bandeja-notificaciones.js";
import {
  aplicarFiltrosYOrden,
  CRITERIOS_ORDEN,
  obtenerChipsFiltrosActivos,
  paginarProductos,
  PRODUCTOS_POR_PAGINA,
} from "./catalogo/filtros-catalogo.js";
import { renderizarStepperPedido } from "./pedidos/pedidos-stepper.js";
import { generarSkeletonCards } from "./catalogo/skeleton-loader.js";
import {
  generarSlug,
  parsearRuta,
  buscarCategoriaPorSlug,
  construirBreadcrumbs,
} from "./utilidades/enrutador.js";
import { renderizarVistaDetalleProducto } from "./catalogo/detalle-producto.js";
import { distribuirProductosVitrina } from "./catalogo/vitrina.js";
import { resolverRutaImagenOficial } from "./catalogo/imagenes-productos.js";

document.querySelector("#app").innerHTML = `
  <header class="header-wrapper">
    <!-- Nivel 1: Barra Principal Superior Blanca -->
    <div class="header-level-1">
      <div class="container header-level-1-container">
        <a class="header-brand" href="/" aria-label="Píxel Andino, inicio">
          <span class="header-brand-mark" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="40" height="40" fill="none">
              <defs>
                <linearGradient id="nav-squircle-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#0b132b" />
                  <stop offset="50%" stop-color="#0f1d3f" />
                  <stop offset="100%" stop-color="#080d1e" />
                </linearGradient>
                <linearGradient id="nav-squircle-border" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.6" />
                  <stop offset="45%" stop-color="#007bff" stop-opacity="0.3" />
                  <stop offset="100%" stop-color="#0d47a1" stop-opacity="0.1" />
                </linearGradient>
                <linearGradient id="nav-p-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#0052cc" />
                  <stop offset="40%" stop-color="#0080ff" />
                  <stop offset="100%" stop-color="#00f0ff" />
                </linearGradient>
                <linearGradient id="nav-peak-grad" x1="0%" y1="100%" x2="100%" y2="20%">
                  <stop offset="0%" stop-color="#002255" />
                  <stop offset="50%" stop-color="#0066cc" />
                  <stop offset="100%" stop-color="#00e5ff" />
                </linearGradient>
                <linearGradient id="nav-pix-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#00f0ff" />
                  <stop offset="100%" stop-color="#00a8ff" />
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="94" height="94" rx="22" fill="url(#nav-squircle-bg)" stroke="url(#nav-squircle-border)" stroke-width="1.5" />
              <rect x="21" y="21" width="8" height="8" rx="2" fill="url(#nav-pix-cyan)" />
              <rect x="31" y="21" width="8" height="8" rx="2" fill="#00f0ff" />
              <rect x="21" y="31" width="8" height="8" rx="2" fill="#0066ff" />
              <path d="M 31 31 L 55 31 C 69 31 79 39 79 49 C 79 59 69 67 55 67 L 45 67 L 45 75.5 C 45 77.5 43.5 79 41.5 79 L 34.5 79 C 32.5 79 31 77.5 31 75.5 Z" fill="url(#nav-p-grad)" />
              <path d="M 45 42 L 54 42 C 61 42 66 45 66 49 C 66 53 61 56 54 56 L 45 56 Z" fill="#080d1e" />
              <path d="M 45 56 L 51 48 L 54 51 L 60 44 L 66 50 C 65 53 60 56 54 56 L 45 56 Z" fill="url(#nav-peak-grad)" />
              <path d="M 45 56 L 51 48 L 54 51 L 60 44 L 66 50" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95" />
              <path d="M 60 44 L 62 56" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" stroke-opacity="0.4" />
            </svg>
          </span>
          <span class="header-brand-copy">
            <span class="header-brand-title">PÍXEL <span class="text-primary">ANDINO</span></span>
            <span class="header-brand-subtitle">TECH STORE</span>
          </span>
        </a>

        <!-- Buscador Central Nivel 1 -->
        <form id="busqueda-rapida" class="header-search-form" role="search" aria-label="Buscar productos">
          <div class="header-search-input-group">
            <input id="busqueda-principal" class="header-search-input" type="search" placeholder="Buscar productos... (Ctrl+K)" aria-label="Buscar productos">
            <button class="header-search-btn" type="submit" aria-label="Buscar productos">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
              </svg>
              <span class="d-none d-md-inline ms-1 fw-semibold">Buscar</span>
            </button>
          </div>
        </form>

        <!-- Acciones de Cuenta, Notificaciones y Carrito -->
        <div class="header-actions">
          <a id="enlace-login" class="header-link-login" href="/login.html">Iniciar sesión</a>
          <a id="enlace-registro" class="btn btn-outline-primary btn-sm rounded-pill px-3" href="/register.html">Crear cuenta</a>
          <span id="usuario-activo" class="text-secondary small fw-semibold" aria-live="polite" hidden></span>
          <button id="cerrar-sesion" class="btn btn-outline-secondary btn-sm" type="button" hidden>Cerrar sesión</button>

          <div id="contenedor-notificaciones" class="dropdown" style="display: none;" hidden>
            <button id="btn-notificaciones" class="btn btn-outline-secondary position-relative me-1" type="button" aria-expanded="false" aria-haspopup="true" aria-label="Notificaciones de pedidos">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-bell" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zM8 1.918l-.797.161A4.002 4.002 0 0 0 4 6c0 .628-.134 2.197-.459 3.742-.16.767-.376 1.566-.663 2.258h10.244c-.287-.692-.502-1.49-.663-2.258C12.134 8.197 12 6.628 12 6a4.002 4.002 0 0 0-3.203-3.92L8 1.917zM14.22 12c.223.447.481.801.78 1H1c.299-.199.557-.553.78-1C2.68 10.2 3 6.88 3 6c0-2.42 1.72-4.44 4.005-4.901a1 1 0 1 1 1.99 0A5.002 5.002 0 0 1 13 6c0 .88.32 4.2 1.22 6z"/>
              </svg>
              <span id="badge-contador-notificaciones" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" hidden>
                0
                <span class="visually-hidden">notificaciones no leídas</span>
              </span>
            </button>
            <div id="menu-notificaciones" class="dropdown-menu dropdown-menu-end shadow p-0 notification-dropdown" style="min-width: 320px; max-width: 380px;">
              <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top">
                <h6 class="mb-0 fw-semibold text-dark">Notificaciones de Pedidos</h6>
                <button id="btn-refrescar-notificaciones" class="btn btn-sm btn-link text-decoration-none p-0 text-muted" type="button" title="Actualizar">
                  <small>Actualizar</small>
                </button>
              </div>
              <div id="lista-notificaciones" class="notification-list p-2" style="max-height: 360px; overflow-y: auto;">
                <div class="text-center text-muted p-3">Cargando...</div>
              </div>
            </div>
          </div>

          <button id="enlace-carrito-nav" class="header-cart-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#seccion-carrito" aria-controls="seccion-carrito" aria-label="Abrir carrito de compras">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 10H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 4l1.25 5h8.22l1.25-5H3.14zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            <span class="d-none d-sm-inline">Carrito</span>
            <span id="contador-carrito" class="header-cart-badge">0</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Nivel 2: Barra Azul Marino Sticky con Menú de Categorías -->
    <div class="header-level-2">
      <div class="container header-level-2-container">
        <!-- Menú Desplegable de Categorías (Patrón Composite 2 Niveles) -->
        <div class="category-dropdown-wrapper">
          <button id="btn-toggle-categorias-menu" class="category-dropdown-btn" type="button" aria-expanded="false" aria-haspopup="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
            <span>CATEGORÍAS</span>
          </button>
          <ul id="menu-categorias-dropdown" class="category-dropdown-menu">
            <!-- Se puebla dinámicamente desde /api/categorias/arbol -->
          </ul>
        </div>

        <!-- Enlaces Rápidos de Navegación Nivel 2 -->
        <nav class="header-nav-links d-none d-lg-flex align-items-center" aria-label="Categorías directas">
          <a class="header-nav-link" href="#/categoria/perifericos" data-categoria-link="Periféricos">PERIFÉRICOS</a>
          <a class="header-nav-link" href="#/categoria/componentes-para-pc" data-categoria-link="Componentes para PC">COMPONENTES PC</a>
          <a class="header-nav-link" href="#/categoria/cargadores-y-cables" data-categoria-link="Cargadores y cables">CARGADORES</a>
          <a class="header-nav-link" href="#/categoria/accesorios" data-categoria-link="Accesorios">ACCESORIOS</a>
          <a class="header-nav-link" href="#seccion-medios-pago">MEDIOS DE PAGO</a>
          <a class="header-nav-link" href="#seccion-sede">UBÍCANOS</a>
          <a id="enlace-pedidos-nav" class="header-nav-link" href="#/pedidos" hidden>MIS COMPRAS</a>
        </nav>
      </div>
    </div>
  </header>

  <main class="container py-4 storefront">
    <nav id="navegacion-modulos" class="nav nav-pills modulo-tabs mb-4 gap-2 flex-wrap" role="tablist" aria-label="Módulos de la tienda" hidden>
      <button class="nav-link active" id="tab-tienda" type="button" role="tab" data-vista="tienda" aria-selected="true">Tienda</button>
      <button class="nav-link" id="tab-pedidos" type="button" role="tab" data-vista="pedidos" aria-selected="false" hidden>Pedidos</button>
      <button class="nav-link" id="tab-inventario" type="button" role="tab" data-vista="inventario" aria-selected="false" hidden>Inventario</button>
      <button class="nav-link" id="tab-administracion" type="button" role="tab" data-vista="administracion" aria-selected="false" hidden>Administración</button>
      <button class="nav-link" id="tab-consultas" type="button" role="tab" data-vista="consultas" aria-selected="false" hidden>Consultas</button>
    </nav>

    <!-- Migas de Pan (Breadcrumbs) SPA (RF-02, RF-07) -->
    <nav id="contenedor-breadcrumbs" class="store-breadcrumbs mb-3" aria-label="Migas de pan" hidden>
      <ol class="breadcrumb mb-0" id="lista-breadcrumbs"></ol>
    </nav>

    <!-- Vista Detalle de Producto Individual (RF-07) -->
    <div id="vista-detalle-producto" class="modulo-vista" hidden></div>

    <!-- Vista 404 (Página o Producto No Encontrado) -->
    <div id="vista-404" class="modulo-vista text-center py-5" hidden>
      <div class="view-404-card card p-5 mx-auto shadow-sm" style="max-width: 540px;">
        <div class="icon-404-bubble mx-auto mb-3">
          <svg width="42" height="42" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 class="h4 fw-bold text-dark mb-2">Producto o sección no encontrada</h2>
        <p class="text-secondary small mb-4">La ruta que intentas visitar no existe o el producto fue retirado temporalmente del catálogo.</p>
        <div class="d-flex justify-content-center gap-2">
          <a href="#/" class="btn btn-primary btn-sm px-3 fw-bold">Ir al inicio</a>
          <a href="#/catalogo" class="btn btn-outline-secondary btn-sm px-3 fw-semibold">Ver catálogo completo</a>
        </div>
      </div>
    </div>

    <!-- Vista Tienda -->
    <div id="vista-tienda" class="modulo-vista">
      <!-- BLOQUE VITRINA COMERCIAL INICIO (RF-04: visible en #/) -->
      <div id="bloque-vitrina-inicio">
        <!-- 1. Layout Bento: Carrusel 70% + Banner Vertical 30% -->
        <section class="hero-bento-section mb-4" aria-label="Destacados y portada">
          <div class="hero-bento-grid">
            <!-- Carrusel Principal (Izquierda) -->
            <div class="hero-carousel-card">
              <div id="carouselHeroMain" class="carousel slide h-100 w-100" data-bs-ride="carousel">
                <div class="carousel-indicators">
                  <button type="button" data-bs-target="#carouselHeroMain" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
                  <button type="button" data-bs-target="#carouselHeroMain" data-bs-slide-to="1" aria-label="Slide 2"></button>
                  <button type="button" data-bs-target="#carouselHeroMain" data-bs-slide-to="2" aria-label="Slide 3"></button>
                </div>
                <div class="carousel-inner h-100">
                  <!-- Slide 1 -->
                  <div class="carousel-item active h-100">
                    <div class="hero-slide-content">
                      <div class="hero-slide-text">
                        <span class="hero-pill-tag">TECNOLOGÍA PARA TU DÍA A DÍA</span>
                        <h1 class="hero-title">Encuentra lo que necesitas para tu espacio</h1>
                        <p class="hero-desc">Explora el catálogo, compara precios y revisa la disponibilidad actual de cada producto.</p>
                        <a class="hero-btn-explore" href="#/catalogo">Explorar productos</a>
                      </div>
                      <div class="hero-slide-visual d-none d-md-flex">
                        <img src="${heroBanner}" alt="Colección de tecnología y periféricos" style="max-height: 250px; max-width: 360px; object-fit: contain; border-radius: 12px; filter: drop-shadow(0 15px 30px rgba(0,0,0,0.45));">
                      </div>
                    </div>
                  </div>
                  <!-- Slide 2 -->
                  <div class="carousel-item h-100">
                    <div class="hero-slide-content">
                      <div class="hero-slide-text">
                        <span class="hero-pill-tag">PRECISIÓN Y CONTROL</span>
                        <h2 class="hero-title">Teclados mecánicos y mouse de alto nivel</h2>
                        <p class="hero-desc">Switches ópticos, iluminación RGB y respuesta inmediata para tu setup gamer o profesional.</p>
                        <a class="hero-btn-explore" href="#/categoria/teclados" data-categoria-link="Teclados">Ver teclados</a>
                      </div>
                      <div class="hero-slide-visual d-none d-md-flex">
                        <img src="${tecladoImage}" alt="Teclado mecánico gamer" style="max-height: 240px; max-width: 360px; object-fit: contain; filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 30px rgba(0, 210, 255, 0.22));">
                      </div>
                    </div>
                  </div>
                  <!-- Slide 3 -->
                  <div class="carousel-item h-100">
                    <div class="hero-slide-content">
                      <div class="hero-slide-text">
                        <span class="hero-pill-tag">COBERTURA NACIONAL</span>
                        <h2 class="hero-title">Envíos garantizados y transacciones seguras</h2>
                        <p class="hero-desc">Compra protegida con comprobante oficial y entrega rápida a nivel nacional.</p>
                        <a class="hero-btn-explore" href="#seccion-ofertas" id="btn-hero-ofertas">Ver ofertas</a>
                      </div>
                      <div class="hero-slide-visual d-none d-md-flex">
                        <img src="${mouseImage}" alt="Mouse de alta precisión" style="max-height: 230px; max-width: 260px; object-fit: contain; filter: drop-shadow(0 16px 28px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 30px rgba(0, 210, 255, 0.22));">
                      </div>
                    </div>
                  </div>
                </div>
                <button class="hero-control-btn hero-control-prev" type="button" data-bs-target="#carouselHeroMain" data-bs-slide="prev" aria-label="Anterior">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button class="hero-control-btn hero-control-next" type="button" data-bs-target="#carouselHeroMain" data-bs-slide="next" aria-label="Siguiente">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            </div>

            <!-- Banner Vertical 30% Azul Real (Derecha) -->
            <div class="hero-vertical-card">
              <div>
                <span class="badge bg-white text-primary fw-bold mb-2 text-uppercase" style="font-size: 0.72rem; letter-spacing: 0.08em; padding: 0.35rem 0.7rem; border-radius: 999px;">Exclusivo Estudiantes</span>
                <h2 class="hero-vertical-title">Estudia.<br>Crea.<br>Compite.</h2>
                <p class="hero-vertical-desc">Hasta 15% de descuento en periféricos esenciales para tu ciclo académico.</p>
                <a class="hero-btn-buy" href="#/catalogo">Comprar ahora</a>
              </div>
              <div class="hero-vertical-placeholder">
                <img src="${cargadorImage}" alt="Accesorios para estudio y setup">
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Fila de 2 Banners Promocionales (Estrecho y Ancho) -->
        <section class="promo-banners-row row g-3 mb-4" aria-label="Banners promocionales">
          <div class="col-12 col-md-4">
            <div class="promo-banner-card promo-banner-gaming h-100">
              <div class="promo-banner-content">
                <span class="promo-badge promo-badge-cyan">ZONA GAMING</span>
                <h3 class="promo-title">Periféricos Pro</h3>
                <p class="promo-desc">Hasta 20% OFF en teclados y mouse ópticos de alta velocidad.</p>
                <a href="#seccion-ofertas" class="promo-btn" id="btn-promo-ofertas">Ver ofertas &rarr;</a>
              </div>
              <div class="promo-banner-visual d-none d-sm-block">
                <img src="${mouseRazerImage}" alt="Mouse gamer Razer DeathAdder" class="promo-img promo-img-mouse-razer">
              </div>
            </div>
          </div>
          <div class="col-12 col-md-8">
            <div class="promo-banner-card promo-banner-components h-100">
              <div class="promo-banner-content">
                <span class="promo-badge promo-badge-blue">ALTO RENDIMIENTO</span>
                <h3 class="promo-title">Componentes y Tarjetas de Video</h3>
                <p class="promo-desc">Procesadores Ryzen, Intel Core y GPUs RTX serie 4000 con garantía oficial de 12 meses.</p>
                <a href="#/categoria/componentes-para-pc" class="promo-btn" id="btn-promo-componentes" data-categoria-link="Componentes para PC">Explorar componentes &rarr;</a>
              </div>
              <div class="promo-banner-visual d-none d-sm-block">
                <img src="${tarjetaNvidiaImage}" alt="Tarjeta de video NVIDIA GeForce RTX 4060" class="promo-img promo-img-gpu-nvidia">
              </div>
            </div>
          </div>
        </section>

        <!-- 3. Barra de confianza / Trust bar -->
        <div class="store-trust-bar card border-0 shadow-sm mb-4">
          <div class="card-body p-3">
            <div class="row g-3 align-items-center">
              <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
                <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 2.3rem; height: 2.3rem;" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                </span>
                <div>
                  <strong class="d-block small text-dark fw-bold">Envío a todo el país</strong>
                  <span class="d-block fw-semibold" style="font-size: 0.85rem; color: #475569;">Rápido y asegurado</span>
                </div>
              </div>
              <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
                <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 2.3rem; height: 2.3rem;" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </span>
                <div>
                  <strong class="d-block small text-dark fw-bold">Garantía oficial</strong>
                  <span class="d-block fw-semibold" style="font-size: 0.85rem; color: #475569;">12 meses de cobertura</span>
                </div>
              </div>
              <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
                <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 2.3rem; height: 2.3rem;" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </span>
                <div>
                  <strong class="d-block small text-dark fw-bold">Pago 100% seguro</strong>
                  <span class="d-block fw-semibold" style="font-size: 0.85rem; color: #475569;">Transacciones cifradas</span>
                </div>
              </div>
              <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
                <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style="width: 2.3rem; height: 2.3rem;" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </span>
                <div>
                  <strong class="d-block small text-dark fw-bold">Soporte experto</strong>
                  <span class="d-block fw-semibold" style="font-size: 0.85rem; color: #475569;">Consultas en vivo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Sección Destacados: hasta 8 productos en grilla con enlace "Ver más →" (RF-04) -->
        <section id="seccion-destacados" class="mb-5" aria-labelledby="titulo-productos-destacados">
          <div class="section-title-wrap d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="store-section-kicker mb-1">SELECCIÓN OFICIAL</p>
              <h2 id="titulo-productos-destacados" class="section-title mb-0">PRODUCTOS DESTACADOS</h2>
            </div>
            <a href="#/catalogo" class="btn btn-sm btn-outline-primary fw-semibold px-3 d-inline-flex align-items-center gap-1">
              <span>Ver más</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
          </div>
          <div id="grid-destacados" class="catalog-grid products-grid">
            <!-- Hasta 8 productos destacados sin agotados cargados dinámicamente -->
          </div>
        </section>

        <!-- 5. Carrusel Horizontal: Nuevos Productos (RF-04: hasta 8) -->
        <section id="seccion-nuevos" class="shelf-carousel-section mb-5" aria-labelledby="titulo-nuevos-productos">
          <div class="section-title-wrap d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="store-section-kicker mb-1">LO ÚLTIMO EN TIENDA</p>
              <h2 id="titulo-nuevos-productos" class="section-title mb-0">NUEVOS PRODUCTOS</h2>
            </div>
            <div class="d-flex align-items-center gap-2">
              <a href="#/catalogo" class="btn btn-sm btn-outline-primary fw-semibold px-3 d-inline-flex align-items-center gap-1 me-2">
                <span>Ver más</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </a>
              <div class="section-carousel-controls">
                <button id="btn-nuevos-prev" class="section-carousel-btn" type="button" aria-label="Anterior nuevo producto">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button id="btn-nuevos-next" class="section-carousel-btn" type="button" aria-label="Siguiente nuevo producto">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
          <div id="carrusel-nuevos-track" class="product-carousel-track">
            <!-- Tarjetas de nuevos productos cargadas dinámicamente -->
          </div>
        </section>

        <!-- 6. Carrusel Horizontal: Ofertas Destacadas (RF-04: hasta 8) -->
        <section id="seccion-ofertas" class="shelf-carousel-section mb-5" aria-labelledby="titulo-ofertas-destacadas">
          <div class="section-title-wrap d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="store-section-kicker mb-1">PRECIOS ESPECIALES</p>
              <h2 id="titulo-ofertas-destacadas" class="section-title mb-0">OFERTAS DESTACADAS</h2>
            </div>
            <div class="d-flex align-items-center gap-2">
              <a href="#/catalogo" class="btn btn-sm btn-outline-primary fw-semibold px-3 d-inline-flex align-items-center gap-1 me-2">
                <span>Ver más</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </a>
              <div class="section-carousel-controls">
                <button id="btn-ofertas-prev" class="section-carousel-btn" type="button" aria-label="Anterior oferta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                </button>
                <button id="btn-ofertas-next" class="section-carousel-btn" type="button" aria-label="Siguiente oferta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
          <div id="carrusel-ofertas-track" class="product-carousel-track">
            <!-- Tarjetas de ofertas cargadas dinámicamente -->
          </div>
        </section>

        <!-- 7. Sección Fila: Componentes para PC (RF-04: fila de 4) con enlace "Ver todos" -->
        <section id="seccion-componentes" class="mb-5" aria-labelledby="titulo-seccion-componentes">
          <div class="section-title-wrap d-flex justify-content-between align-items-center mb-3">
            <div>
              <p class="store-section-kicker mb-1">HARDWARE Y UPGRADES</p>
              <h2 id="titulo-seccion-componentes" class="section-title mb-0">COMPONENTES PARA PC</h2>
            </div>
            <a href="#/categoria/componentes-para-pc" class="btn btn-sm btn-outline-primary fw-semibold px-3 d-inline-flex align-items-center gap-1">
              <span>Ver todos</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
          </div>
          <div id="grid-componentes" class="catalog-grid products-grid">
            <!-- 4 productos de hardware cargados dinámicamente -->
          </div>
        </section>

        <!-- 8. Banner CTA Final hacia el Catálogo Completo (RF-04) -->
        <section class="home-cta-banner card border-0 p-4 p-md-5 text-center text-white mb-4 shadow-sm" style="background: linear-gradient(135deg, #0b1a30 0%, #0d3268 50%, #007bff 100%); border-radius: 16px;">
          <div class="mx-auto" style="max-width: 620px;">
            <span class="badge mb-2 text-uppercase fw-bold" style="background: rgba(255,255,255,0.18); color: #ffffff; font-size: 0.75rem; letter-spacing: 0.08em; padding: 0.4rem 0.8rem; border-radius: 999px;">Todo nuestro inventario</span>
            <h3 class="h2 fw-bold mb-2">¿Buscas algo específico?</h3>
            <p class="text-white-50 mb-4 fs-6">Explora nuestro catálogo completo de periféricos, componentes de hardware y accesorios con filtros por categoría, precio y stock en tiempo real.</p>
            <a href="#/catalogo" class="btn btn-light btn-lg px-4 py-2 fw-bold text-primary shadow-sm d-inline-flex align-items-center gap-2" style="border-radius: 999px;">
              <span>Ver todo el catálogo</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </a>
          </div>
        </section>
      </div>

      <!-- BLOQUE CATÁLOGO COMPLETO (RF-02, RF-03: visible en #/catalogo, #/categoria/..., #/buscar) -->
      <div id="bloque-catalogo-completo" hidden>

      <section id="categorias" class="category-shelf mb-4" aria-labelledby="titulo-categorias-destacadas">
        <div class="d-flex flex-wrap align-items-end justify-content-between gap-2 mb-3">
          <div>
            <p class="store-section-kicker mb-1">EXPLORA LA TIENDA</p>
            <h2 id="titulo-categorias-destacadas" class="h4 mb-0">Categorías</h2>
          </div>
          <span class="small text-secondary">Opciones disponibles en el catálogo</span>
        </div>
        <div id="categorias-destacadas" class="category-pills" aria-label="Filtrar por categoría"></div>
      </section>

      <section id="seccion-gestion-productos" class="card shadow-sm mb-4" aria-labelledby="titulo-formulario" hidden>
        <div class="card-body">
          <h2 id="titulo-formulario" class="h4">Agregar producto</h2>

          <form id="form-producto" class="row g-3">
            <div class="col-12 col-md-3">
              <label for="nombre-producto" class="form-label">Nombre</label>
              <input
                id="nombre-producto"
                class="form-control"
                type="text"
                required
                maxlength="120"
              >
            </div>

            <div class="col-12 col-md-3">
              <label for="categoria-producto" class="form-label">Categoría</label>
              <select id="categoria-producto" class="form-select" required>
                <option value="">Selecciona una categoría</option>
              </select>
            </div>

            <div class="col-12 col-md-2">
              <label for="precio-producto" class="form-label">Precio (S/)</label>
              <input
                id="precio-producto"
                class="form-control"
                type="number"
                min="0.01"
                step="0.01"
                required
              >
            </div>

            <div class="col-12 col-md-2">
              <label for="stock-producto" class="form-label">Stock inicial</label>
              <input
                id="stock-producto"
                class="form-control"
                type="number"
                min="0"
                step="1"
                required
              >
            </div>

            <div class="col-12 col-md-2 d-flex align-items-end">
              <button class="btn btn-primary w-100" type="submit">
                Agregar
              </button>
            </div>
          </form>

          <p id="resultado-formulario" class="mt-3 mb-0" role="status"></p>
        </div>
      </section>

      <!-- Barra compacta de filtros sin controles duplicados -->
      <section class="catalog-toolbar card shadow-sm border-0 mb-3" aria-label="Filtros del catálogo">
        <div class="card-body p-2 p-md-3">
          <!-- Inputs ocultos para sincronización con API -->
          <input id="busqueda" type="hidden" value="">
          <select id="filtro-categoria" hidden aria-hidden="true">
            <option value="">Todas las categorías</option>
          </select>

          <div class="d-flex flex-wrap align-items-center justify-content-between gap-3">
            <!-- Rango de Precios compacto -->
            <div class="d-flex align-items-center gap-2">
              <span class="small fw-semibold text-secondary text-nowrap">Precio:</span>
              <div class="input-group input-group-sm" style="max-width: 120px;">
                <span class="input-group-text py-1 px-2 text-muted">S/</span>
                <input id="precio-min" class="form-control form-control-sm" type="number" min="0" step="0.01" placeholder="Mín">
              </div>
              <span class="text-muted small">&ndash;</span>
              <div class="input-group input-group-sm" style="max-width: 120px;">
                <span class="input-group-text py-1 px-2 text-muted">S/</span>
                <input id="precio-max" class="form-control form-control-sm" type="number" min="0" step="0.01" placeholder="Máx">
              </div>
            </div>

            <!-- Switch Solo en stock -->
            <div class="form-check form-switch mb-0 d-flex align-items-center gap-2">
              <input class="form-check-input mt-0" type="checkbox" role="switch" id="filtro-solo-stock">
              <label class="form-check-label small fw-semibold text-dark text-nowrap" for="filtro-solo-stock">Solo en stock</label>
            </div>

            <!-- Ordenamiento -->
            <div class="d-flex align-items-center gap-2 ms-md-auto">
              <label for="orden-productos" class="small fw-semibold text-secondary text-nowrap mb-0">Ordenar:</label>
              <select id="orden-productos" class="form-select form-select-sm" style="width: auto; min-width: 160px;">
                <option value="defecto">Relevancia</option>
                <option value="precio_asc">Precio: Menor a mayor</option>
                <option value="precio_desc">Precio: Mayor a menor</option>
                <option value="nombre_asc">Nombre: A a Z</option>
                <option value="nombre_desc">Nombre: Z a A</option>
              </select>
            </div>

            <!-- Botón Limpiar filtros -->
            <button id="limpiar-filtros" class="btn btn-outline-secondary btn-sm px-3" type="button" aria-label="Limpiar filtros">
              Limpiar
            </button>
          </div>
        </div>
      </section>

      <!-- Barra de estado y chips de filtros activos -->
      <div id="barra-estado-filtros" class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <p id="estado" class="fw-bold text-dark small mb-0" role="status">Cargando productos...</p>
        <div id="chips-filtros-activos" class="d-flex flex-wrap align-items-center gap-2"></div>
      </div>

      <section id="productos" class="catalog-grid products-grid mb-4" aria-label="Productos"></section>

      <!-- Paginación del Catálogo (RF-03: 12 productos por página) -->
      <nav id="contenedor-paginacion" class="catalog-pagination-nav d-flex justify-content-center my-4" aria-label="Paginación de productos" hidden>
        <ul id="lista-paginacion" class="pagination pagination-sm mb-0 shadow-sm"></ul>
      </nav>
      </div>

      <section id="historial" class="mt-5" aria-live="polite"></section>
    </div>

    <!-- Vista Pedidos -->
    <div id="vista-pedidos" class="modulo-vista" hidden>
      <section id="seccion-pedidos" class="card shadow-sm mb-4" aria-labelledby="titulo-pedidos">
        <div class="card-body">
          <h2 id="titulo-pedidos" class="h4">Pedidos</h2>
          <p id="estado-pedidos" class="text-secondary" role="status" aria-live="polite"></p>
          <div id="lista-pedidos" class="list-group"></div>
        </div>
      </section>
    </div>

    <!-- Vista Inventario -->
    <div id="vista-inventario" class="modulo-vista" hidden>
      <section id="seccion-inventario" class="card shadow-sm mb-4" aria-labelledby="titulo-inventario">
        <div class="card-body">
          <h2 id="titulo-inventario" class="h4">Inventario y kardex</h2>
          <section id="seccion-entrada-inventario" aria-labelledby="titulo-entrada-inventario" hidden>
            <h3 id="titulo-entrada-inventario" class="h6 mt-3">Registrar entrada de mercadería</h3>
            <form id="form-entrada-inventario" class="row g-2 align-items-end">
              <div class="col-12 col-md-4">
                <label for="producto-entrada" class="form-label">Producto</label>
                <select id="producto-entrada" class="form-select" required>
                  <option value="">Selecciona un producto</option>
                </select>
              </div>
              <div class="col-6 col-md-2">
                <label for="cantidad-entrada" class="form-label">Cantidad</label>
                <input id="cantidad-entrada" class="form-control" type="number" min="1" step="1" required>
              </div>
              <div class="col-12 col-md-4">
                <label for="motivo-entrada" class="form-label">Motivo</label>
                <input id="motivo-entrada" class="form-control" type="text" maxlength="250" required placeholder="Ej.: Reposición de mercadería">
              </div>
              <div class="col-6 col-md-2 d-grid">
                <button class="btn btn-primary" type="submit">Registrar entrada</button>
              </div>
            </form>
            <p id="estado-entrada-inventario" class="small mt-2 mb-0" role="status" aria-live="polite"></p>
          </section>

          <section class="mt-4" aria-labelledby="titulo-movimientos-inventario">
            <div class="d-flex flex-wrap align-items-end justify-content-between gap-2">
              <h3 id="titulo-movimientos-inventario" class="h6 mb-0">Movimientos de inventario</h3>
              <form id="filtros-movimientos" class="row g-2 align-items-end">
                <div class="col-12 col-sm-4">
                  <label for="filtro-producto-movimientos" class="form-label small">Producto</label>
                  <select id="filtro-producto-movimientos" class="form-select form-select-sm">
                    <option value="">Todos</option>
                  </select>
                </div>
                <div class="col-6 col-sm-3">
                  <label for="movimientos-desde" class="form-label small">Desde</label>
                  <input id="movimientos-desde" class="form-control form-control-sm" type="date">
                </div>
                <div class="col-6 col-sm-3">
                  <label for="movimientos-hasta" class="form-label small">Hasta</label>
                  <input id="movimientos-hasta" class="form-control form-control-sm" type="date">
                </div>
                <div class="col-12 col-sm-2 d-grid">
                  <button class="btn btn-outline-primary btn-sm" type="submit" aria-label="Filtrar movimientos">Ver</button>
                </div>
              </form>
            </div>
            <p id="estado-movimientos" class="small text-secondary mt-2 mb-2" role="status" aria-live="polite"></p>
            <div class="table-responsive">
              <table class="table table-sm align-middle mb-0">
                <thead><tr><th>Fecha</th><th>Producto</th><th>Movimiento</th><th>Motivo</th><th>Responsable (ID)</th><th class="text-end">Cantidad</th></tr></thead>
                <tbody id="lista-movimientos"></tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </div>

    <!-- Vista Administración -->
    <div id="vista-administracion" class="modulo-vista" hidden></div>

    <!-- Vista Consultas -->
    <div id="vista-consultas" class="modulo-vista" hidden>
      <section id="seccion-preguntas-vendedor" class="card shadow-sm mb-4" aria-labelledby="titulo-preguntas-vendedor">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <h2 id="titulo-preguntas-vendedor" class="h4 mb-0">Preguntas de clientes</h2>
            <button id="actualizar-preguntas-vendedor" class="btn btn-outline-primary btn-sm" type="button">Actualizar</button>
          </div>
          <p id="estado-preguntas-vendedor" class="text-secondary mt-3 mb-2" role="status" aria-live="polite"></p>
          <div id="lista-preguntas-vendedor" class="list-group"></div>
        </div>
      </section>
    </div>

    <div id="seccion-carrito" class="offcanvas offcanvas-end" tabindex="-1" aria-labelledby="titulo-carrito">
      <div class="offcanvas-header border-bottom py-3">
        <div class="d-flex align-items-center gap-2">
          <h2 id="titulo-carrito" class="offcanvas-title h5 mb-0 fw-bold">Mi carrito</h2>
          <span id="cart-drawer-count" class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">0 items</span>
        </div>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Cerrar carrito"></button>
      </div>
      <div class="offcanvas-body d-flex flex-column p-3">
        <p id="estado-carrito" class="small mb-2" role="status" aria-live="polite"></p>
        <ul id="productos-carrito" class="list-group list-group-flush flex-grow-1 overflow-y-auto mb-3"></ul>
        <div class="cart-drawer-footer border-top pt-3 mt-auto">
          <div class="mb-2">
            <label for="checkout-destinatario" class="form-label small fw-semibold mb-1 text-secondary">Destinatario</label>
            <input id="checkout-destinatario" class="form-control form-control-sm" type="text" maxlength="120" placeholder="Nombre de quien recibe (opcional)">
          </div>
          <div class="mb-3">
            <label for="checkout-direccion" class="form-label small fw-semibold mb-1 text-secondary">Dirección de entrega</label>
            <input id="checkout-direccion" class="form-control form-control-sm" type="text" maxlength="250" placeholder="Dirección de envío (opcional)">
          </div>
          <div class="cart-order-summary bg-light rounded-3 p-3 mb-3 border">
            <div class="d-flex justify-content-between align-items-center small text-secondary mb-1">
              <span>Envío nacional:</span>
              <span class="text-success fw-semibold">Gratis</span>
            </div>
            <div class="d-flex justify-content-between align-items-center pt-2 border-top">
              <span class="fw-bold text-dark">Total a pagar:</span>
              <span id="total-carrito" class="fs-5 fw-bold text-primary">S/ 0.00</span>
            </div>
          </div>
          <button id="confirmar-compra" class="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm" type="button" disabled>
            <span id="confirmar-compra-spinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-shield-lock" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M5.072.56C6.157.265 7.31 0 8 0s1.843.265 2.928.56c1.11.3 2.229.655 2.887.87a1.54 1.54 0 0 1 1.044 1.262c.596 4.477-.787 7.795-2.465 9.99a11.8 11.8 0 0 1-2.517 2.453 7 7 0 0 1-1.048.625c-.28.132-.581.24-.829.24s-.548-.108-.829-.24a7 7 0 0 1-1.048-.625 11.8 11.8 0 0 1-2.517-2.453C1.928 10.487.545 7.169 1.141 2.692A1.54 1.54 0 0 1 2.185 1.43 63 63 0 0 1 5.072.56m3.672 3.942a.5.5 0 0 0-.744 0L5.354 7.146a.5.5 0 1 0 .708.708l1.438-1.438v3.084a.5.5 0 0 0 1 0V6.416l1.438 1.438a.5.5 0 0 0 .708-.708z"/>
            </svg>
            <span id="confirmar-compra-texto">Confirmar compra con pago simulado</span>
          </button>
        </div>
      </div>
    </div>
  </main>

  <footer class="site-footer" role="contentinfo" aria-label="Pie de página de Píxel Andino">
    <div class="container py-5">
      <div class="row g-4 justify-content-between">
        <!-- Columna 1: Marca & Contacto -->
        <div class="col-12 col-md-6 col-lg-5">
          <div class="footer-brand d-inline-flex align-items-center gap-2 mb-3">
            <span class="site-brand-mark" aria-hidden="true" style="width: 2.5rem; height: 2.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%" fill="none">
                <defs>
                  <linearGradient id="footer-squircle-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0b132b" />
                    <stop offset="50%" stop-color="#0f1d3f" />
                    <stop offset="100%" stop-color="#080d1e" />
                  </linearGradient>
                  <linearGradient id="footer-squircle-border" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.6" />
                    <stop offset="45%" stop-color="#007bff" stop-opacity="0.3" />
                    <stop offset="100%" stop-color="#0d47a1" stop-opacity="0.1" />
                  </linearGradient>
                  <linearGradient id="footer-p-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#0052cc" />
                    <stop offset="40%" stop-color="#0080ff" />
                    <stop offset="100%" stop-color="#00f0ff" />
                  </linearGradient>
                  <linearGradient id="footer-peak-grad" x1="0%" y1="100%" x2="100%" y2="20%">
                    <stop offset="0%" stop-color="#002255" />
                    <stop offset="50%" stop-color="#0066cc" />
                    <stop offset="100%" stop-color="#00e5ff" />
                  </linearGradient>
                  <linearGradient id="footer-pix-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00f0ff" />
                    <stop offset="100%" stop-color="#00a8ff" />
                  </linearGradient>
                </defs>
                <rect x="3" y="3" width="94" height="94" rx="22" fill="url(#footer-squircle-bg)" stroke="url(#footer-squircle-border)" stroke-width="1.5" />
                <rect x="21" y="21" width="8" height="8" rx="2" fill="url(#footer-pix-cyan)" />
                <rect x="31" y="21" width="8" height="8" rx="2" fill="#00f0ff" />
                <rect x="21" y="31" width="8" height="8" rx="2" fill="#0066ff" />
                <path d="M 31 31 L 55 31 C 69 31 79 39 79 49 C 79 59 69 67 55 67 L 45 67 L 45 75.5 C 45 77.5 43.5 79 41.5 79 L 34.5 79 C 32.5 79 31 77.5 31 75.5 Z" fill="url(#footer-p-grad)" />
                <path d="M 45 42 L 54 42 C 61 42 66 45 66 49 C 66 53 61 56 54 56 L 45 56 Z" fill="#080d1e" />
                <path d="M 45 56 L 51 48 L 54 51 L 60 44 L 66 50 C 65 53 60 56 54 56 L 45 56 Z" fill="url(#footer-peak-grad)" />
                <path d="M 45 56 L 51 48 L 54 51 L 60 44 L 66 50" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95" />
                <path d="M 60 44 L 62 56" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" stroke-opacity="0.4" />
              </svg>
            </span>
            <span class="site-brand-copy">
              <span class="site-brand-name text-white">PÍXEL <span class="site-brand-accent">ANDINO</span></span>
              <span class="site-brand-tagline" style="color: #94a3b8;">TECH STORE</span>
            </span>
          </div>
          <p class="footer-bio text-secondary small mb-3">
            Especialistas en periféricos, accesorios y componentes de alta gama para creadores, gamers y profesionales. Envíos garantizados y transacciones protegidas a todo el Perú.
          </p>
          <div id="seccion-sede" class="footer-contact small text-secondary d-flex flex-column gap-1 mb-3">
            <div><strong class="text-light">Atención:</strong> Lunes a Sábado · 9:00 AM – 7:00 PM</div>
            <div><strong class="text-light">Correo:</strong> ventas@pixelandino.com</div>
            <div><strong class="text-light">Sede:</strong> Ica, Ica, Perú</div>
            <div class="mt-2">
              <a href="https://wa.me/51987654321?text=Hola%20P%C3%ADxel%20Andino,%20deseo%20consultar%20sobre%20un%20producto" target="_blank" rel="noopener noreferrer" class="whatsapp-btn-footer d-inline-flex align-items-center gap-2 p-2 px-3 rounded text-decoration-none">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                <span class="text-white small fw-bold">+51 987 654 321 (WhatsApp)</span>
              </a>
            </div>
          </div>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">Envío a todo el país</span>
            <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Garantía 12 Meses</span>
          </div>
        </div>

        <!-- Columna 2: Clientes & Soporte -->
        <div class="col-12 col-sm-6 col-md-6 col-lg-3">
          <h3 class="footer-heading h6 fw-bold mb-3">Soporte & Ayuda</h3>
          <ul class="list-unstyled footer-links small d-flex flex-column gap-2 mb-0">
            <li><a href="/login.html">Iniciar sesión</a></li>
            <li><a href="/register.html">Crear cuenta</a></li>
            <li><a href="#/pedidos" id="enlace-seguimiento-footer">Seguimiento de compras</a></li>
            <li><a href="#modal-garantia" data-bs-toggle="modal">Póliza de garantía</a></li>
            <li><a href="#modal-libro-reclamaciones" data-bs-toggle="modal" class="text-info fw-semibold">Libro de Reclamaciones</a></li>
          </ul>
        </div>

        <!-- Columna 3: Medios de pago y seguridad -->
        <div id="seccion-medios-pago" class="col-12 col-md-6 col-lg-4">
          <h3 class="footer-heading h6 fw-bold mb-3">Medios de Pago & Seguridad</h3>
          <p class="small text-secondary mb-3">
            Aceptamos tarjetas de crédito, débito y billeteras digitales peruanas con procesamiento seguro y encriptado.
          </p>
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <span class="payment-badge-svg" title="Visa">
              <img src="${pagoVisa}" alt="Visa" class="payment-badge-img">
            </span>
            <span class="payment-badge-svg" title="Mastercard">
              <img src="${pagoMastercard}" alt="Mastercard" class="payment-badge-img">
            </span>
            <span class="payment-badge-svg" title="Yape">
              <img src="${pagoYape}" alt="Yape" class="payment-badge-img">
            </span>
            <span class="payment-badge-svg" title="Plin">
              <img src="${pagoPlin}" alt="Plin" class="payment-badge-img">
            </span>
            <span class="payment-badge-svg" title="Transferencias BCP / BBVA / Interbank">
              <svg width="48" height="30" viewBox="0 0 48 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="48" height="30" rx="4" fill="#0f172a" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
                <path d="M24 7L13 13V15H35V13L24 7ZM16 16V22H18V16H16ZM21 16V22H23V16H21ZM26 16V22H28V16H26ZM31 16V22H33V16H31ZM12 23V25H36V23H12Z" fill="#38bdf8"/>
              </svg>
            </span>
          </div>

          <div>
            <a href="#modal-libro-reclamaciones" data-bs-toggle="modal" class="libro-reclamaciones-card d-inline-flex align-items-center gap-2 p-2 px-3 rounded text-decoration-none">
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect width="48" height="48" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
                <path d="M12 14C12 12.8954 12.8954 12 14 12H23V34H14C12.8954 34 12 33.1046 12 32V14Z" fill="#f8fafc"/>
                <path d="M36 14C36 12.8954 35.1046 12 34 12H25V34H34C35.1046 34 36 33.1046 36 32V14Z" fill="#f1f5f9"/>
                <rect x="23" y="11" width="2" height="24" fill="#ef4444"/>
                <path d="M15 17H20M15 21H20M15 25H18" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M28 17H33M28 21H33M28 25H31" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span class="fw-bold text-white small">Libro de Reclamaciones</span>
            </a>
          </div>
        </div>
      </div>

      <hr class="footer-divider my-4">

      <!-- Bottom Bar -->
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 small text-secondary">
        <div>
          <span>&copy; 2026 <strong>Píxel Andino S.A.C.</strong> Todos los derechos reservados.</span>
        </div>
        <div class="d-flex flex-wrap align-items-center gap-3">
          <a href="#modal-libro-reclamaciones" data-bs-toggle="modal" class="text-secondary text-decoration-none">Libro de Reclamaciones Virtual</a>
        </div>
      </div>
    </div>
  </footer>


  <!-- Modal Libro de Reclamaciones Virtual -->
  <div class="modal fade" id="modal-libro-reclamaciones" tabindex="-1" aria-labelledby="modal-libro-titulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header border-bottom">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-4" aria-hidden="true">📖</span>
            <div>
              <h5 class="modal-title h6 fw-bold mb-0" id="modal-libro-titulo">Libro de Reclamaciones Virtual</h5>
              <small class="text-secondary">Píxel Andino S.A.C. · RUC 20601234567 · Conforme a Ley N° 29571</small>
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <form id="form-libro-reclamaciones">
          <div class="modal-body p-4">
            <div class="alert alert-secondary border-0 small py-2 px-3 mb-3">
              Conforme a lo establecido en el Código de Protección y Defensa del Consumidor, esta institución cuenta con un Libro de Reclamaciones Virtual a su disposición. La respuesta será enviada en un plazo no mayor a quince (15) días hábiles.
            </div>

            <h6 class="fw-bold small text-uppercase text-secondary mb-3">1. Identificación del Consumidor Reclamante</h6>
            <div class="row g-2 mb-3">
              <div class="col-12 col-md-6">
                <label for="libro-nombre" class="form-label small fw-semibold">Nombres y Apellidos</label>
                <input type="text" class="form-control form-control-sm" id="libro-nombre" required placeholder="Ej. Juan Pérez">
              </div>
              <div class="col-12 col-md-6">
                <label for="libro-documento" class="form-label small fw-semibold">DNI / CE</label>
                <input type="text" class="form-control form-control-sm" id="libro-documento" required placeholder="Ej. 70123456">
              </div>
              <div class="col-12 col-md-6">
                <label for="libro-telefono" class="form-label small fw-semibold">Teléfono / Celular</label>
                <input type="tel" class="form-control form-control-sm" id="libro-telefono" required placeholder="Ej. 987654321">
              </div>
              <div class="col-12 col-md-6">
                <label for="libro-correo" class="form-label small fw-semibold">Correo Electrónico</label>
                <input type="email" class="form-control form-control-sm" id="libro-correo" required placeholder="nombre@correo.com">
              </div>
            </div>

            <h6 class="fw-bold small text-uppercase text-secondary mb-3">2. Identificación del Bien Contratado</h6>
            <div class="row g-2 mb-3">
              <div class="col-12 col-md-6">
                <label class="form-label small fw-semibold">Tipo de Bien</label>
                <div class="d-flex gap-3">
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="libro-tipo-bien" id="bien-producto" value="Producto" checked>
                    <label class="form-check-label small" for="bien-producto">Producto</label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="libro-tipo-bien" id="bien-servicio" value="Servicio">
                    <label class="form-check-label small" for="bien-servicio">Servicio</label>
                  </div>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <label for="libro-monto" class="form-label small fw-semibold">Monto Reclamado (S/) opcional</label>
                <input type="number" step="0.01" class="form-control form-control-sm" id="libro-monto" placeholder="0.00">
              </div>
            </div>

            <h6 class="fw-bold small text-uppercase text-secondary mb-3">3. Detalle de la Reclamación</h6>
            <div class="row g-2 mb-3">
              <div class="col-12">
                <div class="d-flex gap-4 mb-2">
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="libro-tipo-reclamo" id="tipo-queja" value="Queja">
                    <label class="form-check-label small" for="tipo-queja">
                      <strong>Queja:</strong> Malestar o descontento respecto a la atención al público.
                    </label>
                  </div>
                  <div class="form-check">
                    <input class="form-check-input" type="radio" name="libro-tipo-reclamo" id="tipo-reclamo" value="Reclamo" checked>
                    <label class="form-check-label small" for="tipo-reclamo">
                      <strong>Reclamo:</strong> Disconformidad relacionada a los bienes o servicios.
                    </label>
                  </div>
                </div>
              </div>
              <div class="col-12">
                <label for="libro-detalle" class="form-label small fw-semibold">Detalle del Reclamo / Queja</label>
                <textarea class="form-control form-control-sm" id="libro-detalle" rows="3" required placeholder="Describe los hechos y tu solicitud de manera clara..."></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer py-2">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">Enviar Hoja de Reclamación</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal Póliza de Garantía -->
  <div class="modal fade" id="modal-garantia" tabindex="-1" aria-labelledby="modal-garantia-titulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header border-bottom">
          <div class="d-flex align-items-center gap-2">
            <span class="fs-4" aria-hidden="true">🛡️</span>
            <div>
              <h5 class="modal-title h6 fw-bold mb-0" id="modal-garantia-titulo">Póliza de Garantía Oficial</h5>
              <small class="text-secondary">Píxel Andino · 12 Meses de Cobertura</small>
            </div>
          </div>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body p-4 small text-secondary">
          <p class="text-dark">Todos nuestros periféricos y componentes cuentan con <strong>12 meses de garantía oficial</strong> contra defectos de fabricación a partir de la fecha de entrega de tu pedido.</p>
          <ul class="d-flex flex-column gap-2 ps-3 mb-3">
            <li><strong>Cobertura:</strong> Fallas técnicas de hardware, conectividad Bluetooth/2.4Ghz y defectos de componentes internos.</li>
            <li><strong>Requisitos:</strong> Presentar el número de pedido o boleta/factura electrónica emitida.</li>
            <li><strong>Proceso:</strong> Comunícate a través de nuestro soporte por WhatsApp o en la sección de consultas para gestionar el cambio o revisión técnica en Ica.</li>
          </ul>
          <p class="mb-0 text-muted" style="font-size: 0.78rem;">* La garantía no cubre daños provocados por caídas, derrame de líquidos o modificaciones no autorizadas.</p>
        </div>
        <div class="modal-footer py-2">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Entendido</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Ajuste de Stock -->
  <div class="modal fade" id="modal-ajuste-stock" tabindex="-1" aria-labelledby="modal-ajuste-stock-titulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title h6 fw-bold" id="modal-ajuste-stock-titulo">Ajustar stock</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <form id="form-modal-stock">
          <div class="modal-body">
            <p id="modal-stock-actual" class="small text-secondary mb-3"></p>
            <div class="mb-3">
              <label for="modal-stock-input" class="form-label small fw-semibold">Nuevo stock</label>
              <input id="modal-stock-input" class="form-control" type="number" min="0" step="1" required>
            </div>
            <div class="mb-3">
              <label for="modal-stock-motivo" class="form-label small fw-semibold">Motivo del ajuste</label>
              <input id="modal-stock-motivo" class="form-control" type="text" maxlength="250" required placeholder="Ejemplo: Reposición de mercadería">
            </div>
            <p id="modal-stock-mensaje" class="small mb-0" role="status" aria-live="polite"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">Guardar ajuste</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal Editar Precio -->
  <div class="modal fade" id="modal-editar-precio" tabindex="-1" aria-labelledby="modal-editar-precio-titulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title h6 fw-bold" id="modal-editar-precio-titulo">Editar precio</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <form id="form-modal-precio">
          <div class="modal-body">
            <p id="modal-precio-actual" class="small text-secondary mb-3"></p>
            <div class="mb-3">
              <label for="modal-precio-input" class="form-label small fw-semibold">Nuevo precio (S/)</label>
              <input id="modal-precio-input" class="form-control" type="number" min="0.01" step="0.01" required>
            </div>
            <p id="modal-precio-mensaje" class="small mb-0" role="status" aria-live="polite"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="btn btn-primary btn-sm">Guardar precio</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- Modal Preguntas y Respuestas del Producto -->
  <div class="modal fade" id="modal-preguntas-producto" tabindex="-1" aria-labelledby="modal-preguntas-titulo" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title h6 fw-bold" id="modal-preguntas-titulo">Preguntas sobre el producto</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body">
          <h6 class="small fw-bold text-uppercase text-secondary mb-2">Tus consultas anteriores</h6>
          <div id="modal-preguntas-lista" class="mb-3"></div>
          <hr class="my-3">
          <h6 class="small fw-bold text-uppercase text-secondary mb-2">Nueva consulta</h6>
          <form id="form-modal-pregunta">
            <div class="mb-2">
              <label for="modal-pregunta-input" class="form-label small fw-semibold visually-hidden">¿Tienes una consulta?</label>
              <textarea id="modal-pregunta-input" class="form-control form-control-sm" rows="3" maxlength="1000" required placeholder="Escribe tu consulta sobre este producto..."></textarea>
            </div>
            <p id="modal-pregunta-mensaje" class="small mb-2" role="status" aria-live="polite"></p>
            <div class="d-flex justify-content-end">
              <button type="submit" class="btn btn-primary btn-sm">Enviar pregunta</button>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Barra Flotante Izquierda: Redes Sociales -->
  <aside class="floating-social-dock" aria-label="Redes sociales">
    <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" class="floating-social-btn" title="Facebook" aria-label="Facebook">f</a>
    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" class="floating-social-btn" title="Instagram" aria-label="Instagram">ig</a>
  </aside>

  <!-- Barra Flotante Derecha: Utilidades -->
  <aside class="floating-utility-dock" aria-label="Accesos rápidos">
    <button id="dock-btn-carrito" class="floating-utility-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#seccion-carrito" title="Ver carrito" aria-label="Ver carrito">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
    </button>
    <a id="dock-btn-usuario" class="floating-utility-btn" href="/login.html" title="Mi cuenta" aria-label="Mi cuenta">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
    </a>
    <button id="dock-btn-favoritos" class="floating-utility-btn" type="button" title="Favoritos" aria-label="Favoritos">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
    </button>
    <button id="dock-btn-top" class="floating-utility-btn" type="button" title="Volver arriba" aria-label="Volver arriba">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
    </button>
  </aside>

  <!-- Botón Flotante WhatsApp Inferior Derecho -->
  <a href="https://wa.me/51987654321?text=Hola%20P%C3%ADxel%20Andino,%20deseo%20comprar%20un%20producto" target="_blank" rel="noopener noreferrer" class="floating-whatsapp-pill" title="Atención por WhatsApp (+51 987 654 321)" aria-label="Contactar por WhatsApp">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
  </a>
`;

inicializarCarrito();

const estado = document.querySelector("#estado");
const contenedor = document.querySelector("#productos");
const campoBusqueda = document.querySelector("#busqueda");
const filtroCategoria = document.querySelector("#filtro-categoria");
const precioMinimo = document.querySelector("#precio-min");
const precioMaximo = document.querySelector("#precio-max");
const selectorOrden = document.querySelector("#orden-productos");
const switchSoloStock = document.querySelector("#filtro-solo-stock");
const categoriaProducto = document.querySelector("#categoria-producto");
const botonLimpiarFiltros = document.querySelector("#limpiar-filtros");
const formulario = document.querySelector("#form-producto");
const seccionGestionProductos = document.querySelector(
  "#seccion-gestion-productos",
);
const seccionPreguntasVendedor = document.querySelector(
  "#seccion-preguntas-vendedor",
);
const estadoPreguntasVendedor = document.querySelector(
  "#estado-preguntas-vendedor",
);
const listaPreguntasVendedor = document.querySelector(
  "#lista-preguntas-vendedor",
);
const resultadoFormulario = document.querySelector("#resultado-formulario");
const contenedorHistorial = document.querySelector("#historial");
const seccionPedidos = document.querySelector("#seccion-pedidos");
const tituloPedidos = document.querySelector("#titulo-pedidos");
const estadoPedidos = document.querySelector("#estado-pedidos");
const listaPedidos = document.querySelector("#lista-pedidos");
const seccionInventario = document.querySelector("#seccion-inventario");
const seccionEntradaInventario = document.querySelector(
  "#seccion-entrada-inventario",
);
const formularioEntradaInventario = document.querySelector(
  "#form-entrada-inventario",
);
const selectorProductoEntrada = document.querySelector("#producto-entrada");
const cantidadEntrada = document.querySelector("#cantidad-entrada");
const motivoEntrada = document.querySelector("#motivo-entrada");
const estadoEntradaInventario = document.querySelector(
  "#estado-entrada-inventario",
);
const formularioFiltrosMovimientos = document.querySelector(
  "#filtros-movimientos",
);
const selectorProductoMovimientos = document.querySelector(
  "#filtro-producto-movimientos",
);
const movimientosDesde = document.querySelector("#movimientos-desde");
const movimientosHasta = document.querySelector("#movimientos-hasta");
const estadoMovimientos = document.querySelector("#estado-movimientos");
const listaMovimientos = document.querySelector("#lista-movimientos");
const enlaceLogin = document.querySelector("#enlace-login");
const enlaceRegistro = document.querySelector("#enlace-registro");
const usuarioActivo = document.querySelector("#usuario-activo");
const botonCerrarSesion = document.querySelector("#cerrar-sesion");
const formularioBusquedaRapida = document.querySelector("#busqueda-rapida");
const campoBusquedaPrincipal = document.querySelector("#busqueda-principal");
const enlacePedidosNav = document.querySelector("#enlace-pedidos-nav");
const enlaceCarritoNav = document.querySelector("#enlace-carrito-nav");

const contenedorBreadcrumbs = document.querySelector("#contenedor-breadcrumbs");
const listaBreadcrumbs = document.querySelector("#lista-breadcrumbs");
const vistaDetalleProducto = document.querySelector("#vista-detalle-producto");
const vista404 = document.querySelector("#vista-404");
const vistaTienda = document.querySelector("#vista-tienda");
const bloqueVitrinaInicio = document.querySelector("#bloque-vitrina-inicio");
const bloqueCatalogoCompleto = document.querySelector("#bloque-catalogo-completo");
const gridDestacados = document.querySelector("#grid-destacados");
const gridComponentes = document.querySelector("#grid-componentes");
const contenedorPaginacion = document.querySelector("#contenedor-paginacion");
const listaPaginacion = document.querySelector("#lista-paginacion");
let paginaActualCatalogo = 1;
let categoriasArbolGlobal = [];

const modalStockElemento = document.querySelector("#modal-ajuste-stock");
const modalStockTitulo = document.querySelector("#modal-ajuste-stock-titulo");
const modalStockActual = document.querySelector("#modal-stock-actual");
const formModalStock = document.querySelector("#form-modal-stock");
const modalStockInput = document.querySelector("#modal-stock-input");
const modalStockMotivo = document.querySelector("#modal-stock-motivo");
const modalStockMensaje = document.querySelector("#modal-stock-mensaje");

const modalPrecioElemento = document.querySelector("#modal-editar-precio");
const modalPrecioTitulo = document.querySelector("#modal-editar-precio-titulo");
const modalPrecioActual = document.querySelector("#modal-precio-actual");
const formModalPrecio = document.querySelector("#form-modal-precio");
const modalPrecioInput = document.querySelector("#modal-precio-input");
const modalPrecioMensaje = document.querySelector("#modal-precio-mensaje");

const modalPreguntasElemento = document.querySelector(
  "#modal-preguntas-producto",
);
const modalPreguntasTitulo = document.querySelector("#modal-preguntas-titulo");
const modalPreguntasLista = document.querySelector("#modal-preguntas-lista");
const formModalPregunta = document.querySelector("#form-modal-pregunta");
const modalPreguntaInput = document.querySelector("#modal-pregunta-input");
const modalPreguntaMensaje = document.querySelector("#modal-pregunta-mensaje");

const contenedorNotificaciones = document.querySelector(
  "#contenedor-notificaciones",
);
const btnNotificaciones = document.querySelector("#btn-notificaciones");
const menuNotificaciones = document.querySelector("#menu-notificaciones");
const badgeContadorNotificaciones = document.querySelector(
  "#badge-contador-notificaciones",
);
const listaNotificaciones = document.querySelector("#lista-notificaciones");
const btnRefrescarNotificaciones = document.querySelector(
  "#btn-refrescar-notificaciones",
);

let productoActivoStock = null;
let productoActivoPrecio = null;
let productoActivoPreguntas = null;
const panelAdministracion = crearPanelAdministracion(apiRequest, async () => {
  await cargarCategorias();
  await cargarProductos();
});
document
  .querySelector("#vista-administracion")
  .append(panelAdministracion.element);

let vistaActiva = "tienda";

function cambiarVista(vista) {
  const rol = usuarioSesion ? usuarioSesion.rol : null;
  if (!esVistaPermitida(vista, rol)) {
    vista = "tienda";
  }
  vistaActiva = vista;

  const tabs = document.querySelectorAll("#navegacion-modulos [data-vista]");
  tabs.forEach((tab) => {
    const esSeleccionado = tab.dataset.vista === vista;
    tab.classList.toggle("active", esSeleccionado);
    tab.setAttribute("aria-selected", String(esSeleccionado));
  });

  const mapaVistas = {
    tienda: document.querySelector("#vista-tienda"),
    pedidos: document.querySelector("#vista-pedidos"),
    inventario: document.querySelector("#vista-inventario"),
    administracion: document.querySelector("#vista-administracion"),
    consultas: document.querySelector("#vista-consultas"),
  };

  Object.entries(mapaVistas).forEach(([nombre, contenedor]) => {
    if (contenedor) {
      contenedor.hidden = nombre !== vista;
    }
  });

  if (vista === "tienda" && (window.location.hash === "#/pedidos" || window.location.hash === "#seccion-pedidos")) {
    window.location.hash = "#/";
  }

  if (usuarioSesion) {
    if (vista === "pedidos") {
      cargarPedidos();
    } else if (
      vista === "inventario" &&
      ["ADMIN", "VENDEDOR", "ALMACEN"].includes(usuarioSesion.rol)
    ) {
      iniciarPanelInventario();
    } else if (vista === "consultas" && usuarioSesion.rol === "VENDEDOR") {
      cargarPreguntasVendedor();
    } else if (vista === "administracion" && usuarioSesion.rol === "ADMIN") {
      panelAdministracion.cargar();
    }
  }
}

function configurarPestañasNavegacion() {
  const navModulos = document.querySelector("#navegacion-modulos");
  if (!navModulos) return;

  navModulos.addEventListener("click", (evento) => {
    const boton = evento.target.closest("button[data-vista]");
    if (boton && boton.dataset.vista) {
      cambiarVista(boton.dataset.vista);
    }
  });
}

function actualizarPestañasPorRol(rol) {
  const navModulos = document.querySelector("#navegacion-modulos");
  if (!navModulos) return;

  if (!rol) {
    navModulos.hidden = true;
    cambiarVista("tienda");
    return;
  }

  const vistasPermitidas = determinarVistasPorRol(rol);
  navModulos.hidden = vistasPermitidas.length <= 1;

  const tabs = document.querySelectorAll("#navegacion-modulos [data-vista]");
  tabs.forEach((tab) => {
    const vista = tab.dataset.vista;
    const permitida = vistasPermitidas.includes(vista);
    tab.hidden = !permitida;
    if (permitida) {
      tab.textContent = obtenerEtiquetaPestaña(vista, rol);
    }
  });

  const vistaDefecto = obtenerVistaPorDefecto(rol);
  cambiarVista(vistaDefecto);
}

configurarPestañasNavegacion();

let productosDisponibles = [];
let usuarioSesion = null;
let temporizadorBusqueda;
let solicitudCatalogo = 0;
let preguntasCliente = [];
let productosInventario = [];

function renderizarChipsFiltrosActivos() {
  const contenedorChips = document.querySelector("#chips-filtros-activos");
  if (!contenedorChips) return;
  contenedorChips.replaceChildren();

  const chips = obtenerChipsFiltrosActivos({
    busqueda: campoBusquedaPrincipal ? campoBusquedaPrincipal.value : "",
    categoria: filtroCategoria ? filtroCategoria.value : "",
    precioMin: precioMinimo ? precioMinimo.value : "",
    precioMax: precioMaximo ? precioMaximo.value : "",
    soloEnStock: switchSoloStock ? switchSoloStock.checked : false,
  });

  chips.forEach((chip) => {
    const chipSpan = document.createElement("span");
    chipSpan.className = "filter-chip";
    chipSpan.innerHTML = `
      <span>${chip.label}</span>
      <button type="button" class="btn-close-chip" aria-label="Quitar filtro ${chip.label}">&times;</button>
    `;
    chipSpan.querySelector(".btn-close-chip").addEventListener("click", () => {
      quitarFiltro(chip.tipo);
    });
    contenedorChips.append(chipSpan);
  });
}

function quitarFiltro(tipo) {
  switch (tipo) {
    case "busqueda":
      if (campoBusquedaPrincipal) campoBusquedaPrincipal.value = "";
      if (campoBusqueda) campoBusqueda.value = "";
      cargarProductos();
      break;
    case "categoria":
      if (filtroCategoria) filtroCategoria.value = "";
      sincronizarCategoriaDestacada();
      cargarProductos();
      break;
    case "precioMin":
      if (precioMinimo) precioMinimo.value = "";
      cargarProductos();
      break;
    case "precioMax":
      if (precioMaximo) precioMaximo.value = "";
      cargarProductos();
      break;
    case "soloEnStock":
      if (switchSoloStock) switchSoloStock.checked = false;
      actualizarVistaCatalogo();
      break;
  }
}

function actualizarVistaCatalogo({ resetearPagina = false } = {}) {
  if (resetearPagina) {
    paginaActualCatalogo = 1;
  }
  renderizarChipsFiltrosActivos();
  const criterioOrden = selectorOrden
    ? selectorOrden.value
    : CRITERIOS_ORDEN.DEFECTO;
  const soloEnStock = switchSoloStock ? switchSoloStock.checked : false;
  const productosFiltrados = aplicarFiltrosYOrden(productosDisponibles, {
    criterioOrden,
    soloEnStock,
  });

  const resultadoPaginacion = paginarProductos(
    productosFiltrados,
    paginaActualCatalogo,
    PRODUCTOS_POR_PAGINA,
  );
  paginaActualCatalogo = resultadoPaginacion.paginaActual;

  mostrarProductos(resultadoPaginacion.items, resultadoPaginacion);
  renderizarPaginacion(resultadoPaginacion);
}

function cambiarPaginaCatalogo(nuevaPagina) {
  paginaActualCatalogo = nuevaPagina;
  actualizarVistaCatalogo();
  document
    .querySelector("#productos")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderizarPaginacion(paginacionInfo) {
  if (!contenedorPaginacion || !listaPaginacion) return;

  if (!paginacionInfo || paginacionInfo.totalPaginas <= 1) {
    contenedorPaginacion.hidden = true;
    listaPaginacion.replaceChildren();
    return;
  }

  contenedorPaginacion.hidden = false;
  listaPaginacion.replaceChildren();

  // Botón Anterior
  const liPrev = document.createElement("li");
  liPrev.className = `page-item ${!paginacionInfo.tieneAnterior ? "disabled" : ""}`;
  const aPrev = document.createElement("a");
  aPrev.className = "page-link";
  aPrev.href = "#productos";
  aPrev.setAttribute("aria-label", "Página anterior");
  aPrev.innerHTML = "&laquo; Anterior";
  aPrev.addEventListener("click", (e) => {
    e.preventDefault();
    if (paginacionInfo.tieneAnterior) {
      cambiarPaginaCatalogo(paginaActualCatalogo - 1);
    }
  });
  liPrev.append(aPrev);
  listaPaginacion.append(liPrev);

  // Botones Numéricos 1..N
  for (let i = 1; i <= paginacionInfo.totalPaginas; i++) {
    const li = document.createElement("li");
    const esActual = i === paginacionInfo.paginaActual;
    li.className = `page-item ${esActual ? "active" : ""}`;
    const a = document.createElement("a");
    a.className = "page-link";
    a.href = "#productos";
    a.textContent = String(i);
    if (esActual) {
      a.setAttribute("aria-current", "page");
    }
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (!esActual) {
        cambiarPaginaCatalogo(i);
      }
    });
    li.append(a);
    listaPaginacion.append(li);
  }

  // Botón Siguiente
  const liNext = document.createElement("li");
  liNext.className = `page-item ${!paginacionInfo.tieneSiguiente ? "disabled" : ""}`;
  const aNext = document.createElement("a");
  aNext.className = "page-link";
  aNext.href = "#productos";
  aNext.setAttribute("aria-label", "Página siguiente");
  aNext.innerHTML = "Siguiente &raquo;";
  aNext.addEventListener("click", (e) => {
    e.preventDefault();
    if (paginacionInfo.tieneSiguiente) {
      cambiarPaginaCatalogo(paginaActualCatalogo + 1);
    }
  });
  liNext.append(aNext);
  listaPaginacion.append(liNext);
}

function reiniciarFiltrosCatalogo() {
  paginaActualCatalogo = 1;
  campoBusqueda.value = "";
  campoBusquedaPrincipal.value = "";
  filtroCategoria.value = "";
  sincronizarCategoriaDestacada();
  precioMinimo.value = "";
  precioMaximo.value = "";
  if (selectorOrden) selectorOrden.value = CRITERIOS_ORDEN.DEFECTO;
  if (switchSoloStock) switchSoloStock.checked = false;
  cargarProductos();
}

function resolverImagenProducto(producto) {
  if (!producto) return "/img/productos/placeholder.svg";

  // 1. Imagen fotográfica oficial resuelta por URL directa, SKU o Nombre de catálogo
  const imagenOficial = resolverRutaImagenOficial(producto);
  if (imagenOficial) {
    return imagenOficial;
  }

  // 2. Si producto.imagen es URL absoluta o relativa válida
  if (producto.imagen && (producto.imagen.startsWith("http") || producto.imagen.startsWith("/img/"))) {
    return producto.imagen;
  }

  // 3. Fallbacks temáticos por categoría o nombre
  const nom = (producto.nombre || "").toLowerCase();
  const cat = (producto.categoria || "").toLowerCase();

  if (nom.includes("mouse") || nom.includes("ratón") || cat === "mouse") {
    return mouseImage;
  }
  if (nom.includes("teclado") || cat === "teclados") {
    return tecladoImage;
  }
  if (
    nom.includes("cargador") ||
    nom.includes("cable") ||
    nom.includes("adaptador") ||
    cat.includes("cargador")
  ) {
    return cargadorImage;
  }
  if (
    nom.includes("webcam") ||
    nom.includes("cámara") ||
    nom.includes("camara") ||
    cat === "cámaras"
  ) {
    return webcamImage;
  }
  if (
    nom.includes("tarjeta") ||
    nom.includes("video") ||
    nom.includes("radeon") ||
    nom.includes("geforce") ||
    nom.includes("rtx") ||
    nom.includes("rx") ||
    cat.includes("tarjeta")
  ) {
    return "/img/productos/gpu-default.svg";
  }
  if (
    nom.includes("procesador") ||
    nom.includes("ryzen") ||
    nom.includes("intel") ||
    nom.includes("core i") ||
    cat.includes("procesador")
  ) {
    return "/img/productos/cpu-default.svg";
  }
  if (
    nom.includes("ram") ||
    nom.includes("fury") ||
    nom.includes("memoria") ||
    cat.includes("ram")
  ) {
    return "/img/productos/ram-default.svg";
  }
  if (
    nom.includes("ssd") ||
    nom.includes("nvme") ||
    nom.includes("almacenamiento") ||
    nom.includes("disco") ||
    cat.includes("almacenamiento")
  ) {
    return "/img/productos/ssd-default.svg";
  }
  if (
    nom.includes("auricular") ||
    nom.includes("audífono") ||
    nom.includes("audifono") ||
    nom.includes("headset") ||
    nom.includes("tune") ||
    cat === "audio"
  ) {
    return "/img/productos/audio-default.svg";
  }

  return "/img/productos/placeholder.svg";
}

function crearElementoTarjetaProducto(producto, { esCarousel = false } = {}) {
  const badgeStockInfo = obtenerBadgeStock(producto.stock);

  const wrapper = esCarousel ? document.createElement("div") : null;
  if (wrapper) wrapper.className = "product-card-wrap";

  const tarjeta = document.createElement("article");
  tarjeta.className = "card product-card h-100 shadow-sm";
  if (!badgeStockInfo.disponible) {
    tarjeta.classList.add("is-out-of-stock", "product-card-agotado");
  }

  // 1. Cabecera de la tarjeta: Botón favoritos y Badge
  const tarjetaTop = document.createElement("div");
  tarjetaTop.className = "product-card-top";

  const botonFav = document.createElement("button");
  botonFav.type = "button";
  botonFav.className = "product-fav-btn";
  if (esFavorito(producto.id)) botonFav.classList.add("is-favorite");
  botonFav.setAttribute("aria-label", `Guardar ${producto.nombre} en favoritos`);
  botonFav.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
    </svg>
  `;
  botonFav.addEventListener("click", (e) => {
    e.stopPropagation();
    const res = alternarFavorito(producto.id);
    botonFav.classList.toggle("is-favorite", res.activo);
    mostrarToast(
      res.activo ? `¡Añadido a favoritos! ${producto.nombre}` : `Removido de favoritos`,
      res.activo ? "exito" : "info",
    );
  });
  tarjetaTop.append(botonFav);

  const tieneDescuento =
    producto.precioAnterior &&
    Number(producto.precioAnterior) > Number(producto.precio);
  if (tieneDescuento) {
    const badgeDesc = document.createElement("span");
    badgeDesc.className = "product-badge-discount";
    const pct = Math.round(
      ((Number(producto.precioAnterior) - Number(producto.precio)) /
        Number(producto.precioAnterior)) *
        100,
    );
    badgeDesc.textContent = `-${pct}% OFF`;
    tarjetaTop.append(badgeDesc);
  } else if (producto.nuevo) {
    const badgeNuevo = document.createElement("span");
    badgeNuevo.className = "product-badge-new";
    badgeNuevo.textContent = "Nuevo";
    tarjetaTop.append(badgeNuevo);
  }

  const skuProducto = producto.sku || ("PA-" + String(producto.id).padStart(4, "0"));
  const urlProducto = `#/producto/${skuProducto}`;

  // 2. Imagen del Producto con Resolución Inteligente de Hardware (RF-06, RF-07)
  const imageBox = document.createElement("div");
  imageBox.className = "product-image-box";
  const linkImg = document.createElement("a");
  linkImg.href = urlProducto;
  linkImg.className = "product-image-link";
  linkImg.setAttribute("aria-label", `Ver detalle de ${producto.nombre}`);
  const imgEl = document.createElement("img");
  imgEl.loading = "lazy";
  imgEl.decoding = "async";
  imgEl.alt = producto.nombre;
  imgEl.src = resolverImagenProducto(producto);
  imgEl.onerror = () => {
    imgEl.src = "/img/productos/placeholder.svg";
  };
  linkImg.append(imgEl);
  imageBox.append(linkImg);

  // 3. Rating de estrellas
  const ratingBox = document.createElement("div");
  ratingBox.className = "product-rating";
  ratingBox.setAttribute("aria-label", "Calificación 5 estrellas");
  ratingBox.innerHTML = `★★★★★`;

  // 4. Título del Producto (RF-06, RF-07)
  const titleEl = document.createElement("h3");
  titleEl.className = "product-title";
  const linkTitulo = document.createElement("a");
  linkTitulo.href = urlProducto;
  linkTitulo.className = "product-card-link text-decoration-none";
  linkTitulo.textContent = producto.nombre;
  linkTitulo.title = producto.nombre;
  titleEl.append(linkTitulo);

  // 5. Metadatos (SKU y Stock)
  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";
  const skuSpan = document.createElement("span");
  skuSpan.className = "product-sku";
  skuSpan.textContent = `Ref: ${skuProducto}`;

  const stockSpan = document.createElement("span");
  stockSpan.className = "product-stock-badge";
  if (!badgeStockInfo.disponible) {
    stockSpan.textContent = "Stock: 0";
    stockSpan.classList.add("text-danger");
  } else if (producto.stock <= 5) {
    stockSpan.textContent = `Stock: Quedan ${producto.stock}`;
    stockSpan.classList.add("text-warning-emphasis");
  } else {
    stockSpan.textContent = `Stock: ${producto.stock}`;
  }
  metaRow.append(skuSpan, stockSpan);

  // 6. Precios
  const pricingBox = document.createElement("div");
  pricingBox.className = "product-pricing-box";
  const curPrice = document.createElement("span");
  curPrice.className = "product-current-price";
  curPrice.textContent = formatoPrecio(producto.precio);
  pricingBox.append(curPrice);

  if (tieneDescuento) {
    const oldPrice = document.createElement("span");
    oldPrice.className = "product-old-price";
    oldPrice.textContent = formatoPrecio(producto.precioAnterior);
    pricingBox.append(oldPrice);
  }

  // 7. Acciones (Botón Agregar y Preguntas con stopPropagation)
  const actionsBox = document.createElement("div");
  actionsBox.className = "mt-auto pt-2";

  const esCliente = usuarioSesion?.rol === "CLIENTE";
  const esInvitado = !usuarioSesion;
  const puedeGestionarInventario = ["ADMIN", "VENDEDOR", "ALMACEN"].includes(
    usuarioSesion?.rol,
  );
  const puedeGestionarCatalogo = ["ADMIN", "VENDEDOR"].includes(
    usuarioSesion?.rol,
  );

  if (esCliente || esInvitado) {
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    if (badgeStockInfo.disponible) {
      btnAdd.className = "product-btn-add site-btn-add-cart";
      btnAdd.textContent = "Agregar al carrito";
      btnAdd.addEventListener("click", (e) => {
        e.stopPropagation();
        agregarProductoAlCarrito(producto.id, producto);
      });
    } else {
      btnAdd.className = "product-btn-agotado";
      btnAdd.textContent = "Agotado";
      btnAdd.disabled = true;
    }
    actionsBox.append(btnAdd);

    if (!esCarousel) {
      const btnPreguntas = document.createElement("button");
      btnPreguntas.type = "button";
      btnPreguntas.className =
        "btn btn-link btn-sm text-secondary text-decoration-none w-100 mt-1 py-0";
      btnPreguntas.style.fontSize = "0.75rem";
      btnPreguntas.textContent = "Consultar dudas";
      btnPreguntas.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalPreguntas(producto);
      });
      actionsBox.append(btnPreguntas);
    }
  }

  if (puedeGestionarInventario || puedeGestionarCatalogo) {
    const filaStaff = document.createElement("div");
    filaStaff.className = "d-flex flex-wrap gap-1 mt-2";
    if (puedeGestionarInventario) {
      const btnHist = document.createElement("button");
      btnHist.type = "button";
      btnHist.className = "btn btn-outline-info btn-sm py-0 px-2";
      btnHist.style.fontSize = "0.72rem";
      btnHist.textContent = "Movimientos";
      btnHist.addEventListener("click", (e) => {
        e.stopPropagation();
        cargarMovimientos(producto);
      });

      const btnStock = document.createElement("button");
      btnStock.type = "button";
      btnStock.className = "btn btn-outline-primary btn-sm py-0 px-2";
      btnStock.style.fontSize = "0.72rem";
      btnStock.textContent = "Ajustar stock";
      btnStock.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalStock(producto);
      });
      filaStaff.append(btnHist, btnStock);
    }
    if (puedeGestionarCatalogo) {
      const btnPrecio = document.createElement("button");
      btnPrecio.type = "button";
      btnPrecio.className = "btn btn-outline-warning btn-sm py-0 px-2";
      btnPrecio.style.fontSize = "0.72rem";
      btnPrecio.textContent = "Editar precio";
      btnPrecio.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalPrecio(producto);
      });
      filaStaff.append(btnPrecio);
    }
    actionsBox.append(filaStaff);
  }

  tarjeta.append(
    tarjetaTop,
    imageBox,
    ratingBox,
    titleEl,
    metaRow,
    pricingBox,
    actionsBox,
  );

  if (wrapper) {
    wrapper.append(tarjeta);
    return wrapper;
  }
  return tarjeta;
}

function poblarVitrinaInicio(productos) {
  const vitrina = distribuirProductosVitrina(productos);

  // 1. Destacados (RF-04: hasta 8 productos sin stock 0)
  if (gridDestacados) {
    gridDestacados.replaceChildren();
    vitrina.destacados.forEach((prod) => {
      gridDestacados.append(
        crearElementoTarjetaProducto(prod, { esCarousel: false }),
      );
    });
  }

  // 2. Nuevos Productos (RF-04: hasta 8 productos sin repetidos ni stock 0)
  const trackNuevos = document.querySelector("#carrusel-nuevos-track");
  if (trackNuevos) {
    trackNuevos.replaceChildren();
    vitrina.nuevos.forEach((prod) => {
      trackNuevos.append(
        crearElementoTarjetaProducto(prod, { esCarousel: true }),
      );
    });
  }

  // 3. Ofertas Destacadas (RF-04: hasta 8 productos sin repetidos ni stock 0)
  const trackOfertas = document.querySelector("#carrusel-ofertas-track");
  if (trackOfertas) {
    trackOfertas.replaceChildren();
    vitrina.ofertas.forEach((prod) => {
      trackOfertas.append(
        crearElementoTarjetaProducto(prod, { esCarousel: true }),
      );
    });
  }

  // 4. Componentes para PC (RF-04: fila de 4 productos sin repetidos ni stock 0)
  if (gridComponentes) {
    gridComponentes.replaceChildren();
    vitrina.componentes.forEach((prod) => {
      gridComponentes.append(
        crearElementoTarjetaProducto(prod, { esCarousel: false }),
      );
    });
  }
}

function poblarCarruselesEspeciales(productos) {
  poblarVitrinaInicio(productos);
}

function mostrarProductos(productos, paginacionInfo = null) {
  contenedor.removeAttribute("aria-busy");
  contenedor.replaceChildren();

  if (!productos || productos.length === 0) {
    if (contenedorPaginacion) contenedorPaginacion.hidden = true;
    estado.textContent = "";
    const vacioCol = document.createElement("div");
    vacioCol.className = "w-100";
    vacioCol.style.gridColumn = "1 / -1";
    vacioCol.innerHTML = `
      <div class="catalog-empty-state card border-0 text-center py-5 px-3">
        <div class="empty-state-icon mx-auto mb-3" aria-hidden="true">
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <h3 class="h5 fw-bold text-dark mb-2">No se encontraron productos</h3>
        <p class="text-secondary small mx-auto mb-3" style="max-width: 420px;">
          No hay artículos que coincidan con los filtros aplicados. Prueba buscando con otros términos o restableciendo los filtros.
        </p>
        <div>
          <button type="button" class="btn btn-outline-primary btn-sm px-3" id="btn-reset-filtros-empty">
            Restablecer filtros
          </button>
        </div>
      </div>
    `;
    const botonReset = vacioCol.querySelector("#btn-reset-filtros-empty");
    if (botonReset) {
      botonReset.addEventListener("click", reiniciarFiltrosCatalogo);
    }
    contenedor.append(vacioCol);
    return;
  }

  if (paginacionInfo && paginacionInfo.totalPaginas > 1) {
    estado.textContent = `Mostrando ${paginacionInfo.indiceInicio}-${paginacionInfo.indiceFin} de ${paginacionInfo.totalItems} productos`;
  } else {
    const total = paginacionInfo ? paginacionInfo.totalItems : productos.length;
    estado.textContent =
      total === 1 ? "1 producto encontrado" : `${total} productos encontrados`;
  }

  productos.forEach((producto) => {
    contenedor.append(
      crearElementoTarjetaProducto(producto, { esCarousel: false }),
    );
  });
}

campoBusquedaPrincipal.addEventListener("input", () => {
  campoBusqueda.value = campoBusquedaPrincipal.value;
  window.clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = window.setTimeout(cargarProductos, 180);
});

formularioBusquedaRapida.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const valor = campoBusquedaPrincipal ? campoBusquedaPrincipal.value.trim() : "";
  if (valor) {
    window.location.hash = `#/buscar?q=${encodeURIComponent(valor)}`;
  } else {
    window.location.hash = "#/catalogo";
  }
});

campoBusqueda.addEventListener("input", () => {
  campoBusquedaPrincipal.value = campoBusqueda.value;
  window.clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = window.setTimeout(cargarProductos, 180);
});

for (const filtro of [filtroCategoria, precioMinimo, precioMaximo]) {
  filtro.addEventListener("change", cargarProductos);
}

filtroCategoria.addEventListener("change", sincronizarCategoriaDestacada);

if (selectorOrden) {
  selectorOrden.addEventListener("change", () =>
    actualizarVistaCatalogo({ resetearPagina: true }),
  );
}

if (switchSoloStock) {
  switchSoloStock.addEventListener("change", () =>
    actualizarVistaCatalogo({ resetearPagina: true }),
  );
}

botonLimpiarFiltros.addEventListener("click", reiniciarFiltrosCatalogo);

formulario.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const boton = formulario.querySelector('button[type="submit"]');
  boton.disabled = true;
  resultadoFormulario.className = "mt-3 mb-0 text-secondary";
  resultadoFormulario.textContent = "Guardando producto...";

  const nuevoProducto = {
    nombre: document.querySelector("#nombre-producto").value.trim(),
    categoria: categoriaProducto.value,
    precio: Number(document.querySelector("#precio-producto").value),
    stock: Number(document.querySelector("#stock-producto").value),
  };

  try {
    const respuesta = await apiRequest("/api/productos", {
      method: "POST",
      json: nuevoProducto,
    });
    resultadoFormulario.className = "mt-3 mb-0 text-success";
    resultadoFormulario.textContent = "Producto agregado correctamente.";
    mostrarToast(
      `Producto "${nuevoProducto.nombre}" agregado al catálogo.`,
      "exito",
    );

    formulario.reset();
    campoBusqueda.value = "";
    await cargarProductos();
  } catch (error) {
    resultadoFormulario.className = "mt-3 mb-0 text-danger";
    resultadoFormulario.textContent = `No se pudo agregar el producto. ${error.message}`;
    mostrarToast(`No se pudo agregar el producto: ${error.message}`, "error");
  } finally {
    boton.disabled = false;
  }
});

async function cargarMovimientos(producto) {
  contenedorHistorial.replaceChildren();

  const titulo = document.createElement("h2");
  titulo.className = "h4";
  titulo.textContent = `Historial de stock: ${producto.nombre}`;

  const mensaje = document.createElement("p");
  mensaje.className = "text-secondary";
  mensaje.textContent = "Cargando movimientos...";

  contenedorHistorial.append(titulo, mensaje);

  try {
    const respuesta = await apiRequest(
      `/api/productos/${producto.id}/movimientos`,
    );
    const movimientos = await respuesta.json();

    if (movimientos.length === 0) {
      mensaje.textContent = "Este producto todavía no tiene movimientos.";
      return;
    }

    const lista = document.createElement("ul");
    lista.className = "list-group";

    movimientos.forEach((movimiento) => {
      const elemento = document.createElement("li");
      elemento.className = "list-group-item";

      const signo = movimiento.cantidadFirmada > 0 ? "+" : "";
      const fecha = new Date(movimiento.fecha).toLocaleString("es-PE");

      elemento.textContent =
        `${movimiento.tipo}: ${signo}${movimiento.cantidadFirmada} unidades — ` +
        `${movimiento.motivo} (${fecha})`;

      lista.append(elemento);
    });

    mensaje.remove();
    contenedorHistorial.append(lista);
  } catch (error) {
    mensaje.className = "alert alert-danger";
    mensaje.textContent = `No se pudo cargar el historial. ${error.message}`;
  }
}

async function iniciarPanelInventario() {
  if (!["ADMIN", "VENDEDOR", "ALMACEN"].includes(usuarioSesion?.rol)) {
    seccionInventario.hidden = true;
    return;
  }
  seccionInventario.hidden = false;
  seccionEntradaInventario.hidden = !["ADMIN", "ALMACEN"].includes(
    usuarioSesion.rol,
  );
  estadoMovimientos.textContent = "Cargando productos y movimientos…";
  try {
    const respuesta = await apiRequest("/api/productos");
    productosInventario = await respuesta.json();
    poblarSelectoresInventario();
    await cargarMovimientosInventario();
  } catch (error) {
    estadoMovimientos.className = "small text-danger mt-2 mb-2";
    estadoMovimientos.textContent = `No se pudo cargar el inventario. ${error.message}`;
  }
}

function poblarSelectoresInventario() {
  for (const selector of [
    selectorProductoEntrada,
    selectorProductoMovimientos,
  ]) {
    if (!selector) continue;
    const valorActual = selector.value;
    selector.replaceChildren();
    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent =
      selector === selectorProductoEntrada ? "Selecciona un producto" : "Todos";
    selector.append(inicial);
    for (const producto of productosInventario) {
      const opcion = document.createElement("option");
      opcion.value = String(producto.id);
      opcion.textContent = producto.nombre;
      selector.append(opcion);
    }
    if (
      productosInventario.some(
        (producto) => String(producto.id) === valorActual,
      )
    ) {
      selector.value = valorActual;
    }
  }
}

formularioEntradaInventario.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const boton = formularioEntradaInventario.querySelector(
    'button[type="submit"]',
  );
  boton.disabled = true;
  estadoEntradaInventario.className = "small mt-2 mb-0 text-secondary";
  estadoEntradaInventario.textContent = "Registrando entrada…";
  try {
    await apiRequest("/api/inventario/entradas", {
      method: "POST",
      json: crearSolicitudEntrada(
        selectorProductoEntrada.value,
        cantidadEntrada.value,
        motivoEntrada.value,
      ),
    });
    estadoEntradaInventario.className = "small mt-2 mb-0 text-success";
    estadoEntradaInventario.textContent =
      "Entrada registrada y stock actualizado.";
    mostrarToast("Entrada de inventario registrada correctamente.", "exito");
    formularioEntradaInventario.reset();
    await cargarMovimientosInventario();
    await cargarProductos();
  } catch (error) {
    estadoEntradaInventario.className = "small mt-2 mb-0 text-danger";
    estadoEntradaInventario.textContent = `No se pudo registrar la entrada. ${error.message}`;
    mostrarToast(`No se pudo registrar la entrada: ${error.message}`, "error");
  } finally {
    boton.disabled = false;
  }
});

formularioFiltrosMovimientos.addEventListener("submit", (evento) => {
  evento.preventDefault();
  cargarMovimientosInventario();
});

async function cargarMovimientosInventario() {
  estadoMovimientos.className = "small text-secondary mt-2 mb-2";
  estadoMovimientos.textContent = "Consultando movimientos…";
  listaMovimientos.replaceChildren();

  if (!productosInventario || productosInventario.length === 0) {
    try {
      const respuestaProductos = await apiRequest("/api/productos");
      productosInventario = await respuestaProductos.json();
      poblarSelectoresInventario();
    } catch {
      // Si la carga de productos falla, continuará con los IDs numéricos
    }
  }

  const parametros = crearParametrosMovimientos({
    productoId: selectorProductoMovimientos.value,
    desde: movimientosDesde.value,
    hasta: movimientosHasta.value,
  });
  try {
    const sufijo = parametros.size ? `?${parametros.toString()}` : "";
    const respuesta = await apiRequest(`/api/inventario/movimientos${sufijo}`);
    const movimientos = await respuesta.json();
    estadoMovimientos.className = "small text-secondary mt-2 mb-2";
    estadoMovimientos.textContent = movimientos.length
      ? `Movimientos encontrados: ${movimientos.length}`
      : "No hay movimientos para esos filtros.";
    for (const movimiento of movimientos) {
      const fila = document.createElement("tr");
      const fecha = document.createElement("td");
      fecha.textContent = new Date(movimiento.fecha).toLocaleString("es-PE");
      const producto = document.createElement("td");
      producto.textContent =
        productosInventario.find((item) => item.id === movimiento.productoId)
          ?.nombre || `Producto #${movimiento.productoId}`;
      const tipo = document.createElement("td");
      tipo.textContent = movimiento.tipo;
      const motivo = document.createElement("td");
      motivo.textContent = movimiento.motivo;
      const responsable = document.createElement("td");
      responsable.textContent =
        movimiento.responsableId == null
          ? "No registrado"
          : String(movimiento.responsableId);
      const cantidad = document.createElement("td");
      cantidad.className = "text-end fw-semibold";
      cantidad.textContent = `${movimiento.cantidadFirmada > 0 ? "+" : ""}${movimiento.cantidadFirmada}`;
      fila.append(fecha, producto, tipo, motivo, responsable, cantidad);
      listaMovimientos.append(fila);
    }
  } catch (error) {
    estadoMovimientos.className = "small text-danger mt-2 mb-2";
    estadoMovimientos.textContent = `No se pudieron cargar los movimientos. ${error.message}`;
  }
}

function formatoPrecio(valor) {
  return Number(valor).toLocaleString("es-PE", {
    style: "currency",
    currency: "PEN",
  });
}

function renderizarPreguntasModal(producto) {
  modalPreguntasLista.replaceChildren();
  const preguntas = preguntasCliente.filter(
    (pregunta) => pregunta.productoId === producto.id,
  );
  if (preguntas.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "text-secondary mb-2 small";
    vacio.textContent = "Aún no has consultado sobre este producto.";
    modalPreguntasLista.append(vacio);
    return;
  }
  for (const pregunta of preguntas) {
    const item = document.createElement("article");
    item.className = "product-question-item mb-2";
    const textoPregunta = document.createElement("p");
    textoPregunta.className = "mb-1 small";
    const etiquetaPregunta = document.createElement("strong");
    etiquetaPregunta.textContent = "Tu pregunta: ";
    textoPregunta.append(
      etiquetaPregunta,
      document.createTextNode(pregunta.pregunta),
    );
    item.append(textoPregunta);

    const respuesta = document.createElement("p");
    respuesta.className = pregunta.respuesta
      ? "mb-0 small text-success"
      : "mb-0 small text-secondary";
    respuesta.textContent = pregunta.respuesta
      ? `Respuesta de la tienda: ${pregunta.respuesta}`
      : "Pendiente de respuesta de la tienda.";
    item.append(respuesta);
    modalPreguntasLista.append(item);
  }
}

function abrirModalPreguntas(producto) {
  productoActivoPreguntas = producto;
  modalPreguntasTitulo.textContent = `Preguntas sobre ${producto.nombre}`;
  modalPreguntaInput.value = "";
  modalPreguntaMensaje.textContent = "";
  modalPreguntaMensaje.className = "small mb-2";
  renderizarPreguntasModal(producto);
  Modal.getOrCreateInstance(modalPreguntasElemento).show();
}

formModalPregunta.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!productoActivoPreguntas) return;

  const boton = formModalPregunta.querySelector('button[type="submit"]');
  boton.disabled = true;
  modalPreguntaMensaje.className = "small mb-2 text-secondary";
  modalPreguntaMensaje.textContent = "Enviando pregunta…";
  try {
    await apiRequest(`/api/productos/${productoActivoPreguntas.id}/preguntas`, {
      method: "POST",
      json: { pregunta: modalPreguntaInput.value.trim() },
    });
    modalPreguntaInput.value = "";
    modalPreguntaMensaje.className = "small mb-2 text-success";
    modalPreguntaMensaje.textContent =
      "Pregunta enviada. La respuesta aparecerá aquí.";
    mostrarToast("Tu pregunta ha sido enviada.", "exito");
    await cargarPreguntasCliente();
    renderizarPreguntasModal(productoActivoPreguntas);
  } catch (error) {
    modalPreguntaMensaje.className = "small mb-2 text-danger";
    modalPreguntaMensaje.textContent = `No se pudo enviar la pregunta. ${error.message}`;
    mostrarToast(`No se pudo enviar la pregunta: ${error.message}`, "error");
  } finally {
    boton.disabled = false;
  }
});

async function cargarPreguntasCliente() {
  if (usuarioSesion?.rol !== "CLIENTE") {
    preguntasCliente = [];
    return;
  }
  try {
    const respuesta = await apiRequest("/api/preguntas/mis-preguntas");
    preguntasCliente = await respuesta.json();
    actualizarVistaCatalogo();
  } catch {
    preguntasCliente = [];
  }
}

function claseEstadoPedido(estadoPedido) {
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

async function cargarPedidos() {
  if (!usuarioSesion) {
    seccionPedidos.hidden = true;
    listaPedidos.replaceChildren();
    return;
  }

  const esCliente = usuarioSesion.rol === "CLIENTE";
  const esEmpleado = ["ADMIN", "VENDEDOR", "ALMACEN"].includes(
    usuarioSesion.rol,
  );
  if (!esCliente && !esEmpleado) {
    seccionPedidos.hidden = true;
    return;
  }

  const esOperativo = ["ADMIN", "ALMACEN"].includes(usuarioSesion.rol);
  const ruta = esCliente
    ? "/api/pedidos/mis-pedidos"
    : esOperativo
      ? "/api/pedidos/operativos"
      : "/api/pedidos/pendientes";
  seccionPedidos.hidden = false;
  tituloPedidos.textContent = esCliente
    ? "Mis pedidos"
    : esOperativo
      ? "Gestión operativa de pedidos"
      : "Pedidos pendientes";
  estadoPedidos.className = "text-secondary";
  estadoPedidos.textContent = "Cargando pedidos...";
  listaPedidos.replaceChildren();

  try {
    const respuesta = await apiRequest(ruta);
    const pedidos = await respuesta.json();
    mostrarPedidos(pedidos, esCliente);
  } catch (error) {
    estadoPedidos.className = "text-danger";
    estadoPedidos.textContent = `No se pudieron cargar los pedidos. ${error.message}`;
  }
}

function obtenerImagenProductoCatalogo(nombre = "") {
  return resolverImagenProducto({ nombre });
}

function mostrarPedidos(pedidos, esCliente) {
  listaPedidos.replaceChildren();
  estadoPedidos.className = "text-secondary";

  if (pedidos.length === 0) {
    estadoPedidos.textContent = "";
    estadoPedidos.classList.add("d-none");
    const vacio = document.createElement("div");
    vacio.className = "text-center py-5 px-3 bg-light rounded-4 border my-3";
    vacio.innerHTML = `
      <div class="empty-state-icon mx-auto mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h5 class="fw-bold text-dark mb-1">${
        esCliente
          ? "Todavía no tienes compras registradas"
          : ["ADMIN", "ALMACEN"].includes(usuarioSesion?.rol)
            ? "No hay pedidos por preparar, despachar o entregar"
            : "No hay pedidos pendientes en esta cola"
      }</h5>
      <p class="text-secondary small mb-4">${
        esCliente
          ? "Cuando realices tu primera compra en Píxel Andino, podrás realizar el seguimiento en tiempo real desde aquí."
          : usuarioSesion?.rol === "VENDEDOR"
            ? "Como vendedor, aquí atiendes los pedidos nuevos en estado PENDIENTE para soporte o cancelación comercial. Actualmente todos los pedidos de la tienda ya fueron atendidos o no hay compras pendientes."
            : "Los pedidos de los clientes aparecerán en este panel según su estado de despacho."
      }</p>
      ${
        esCliente
          ? `<button type="button" class="btn btn-primary rounded-pill px-4 shadow-sm" id="btn-ir-tienda-pedidos-vacio">Explorar catálogo</button>`
          : ""
      }
    `;
    if (esCliente) {
      vacio
        .querySelector("#btn-ir-tienda-pedidos-vacio")
        ?.addEventListener("click", () => cambiarVista("tienda"));
    }
    listaPedidos.append(vacio);
    return;
  }

  estadoPedidos.classList.remove("d-none");
  estadoPedidos.textContent = `Pedidos encontrados: ${pedidos.length}`;

  for (const pedido of pedidos) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "order-card mb-4";
    tarjeta.id = `pedido-${pedido.idPedido}`;

    // 1. Cabecera estructurada
    const fecha = new Date(pedido.creadoEn).toLocaleString("es-PE");
    const cabecera = document.createElement("header");
    cabecera.className =
      "order-card-header d-flex flex-wrap justify-content-between align-items-center gap-3";
    cabecera.innerHTML = `
      <div class="d-flex flex-wrap align-items-center gap-2">
        <span class="badge bg-dark-subtle text-dark border px-2.5 py-1.5 fw-bold">Pedido #${pedido.idPedido}</span>
        <span class="badge rounded-pill ${claseEstadoPedido(pedido.estado)} px-3 py-1.5 fw-semibold">${pedido.estado.replaceAll("_", " ")}</span>
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

    // Si es empleado de almacén/vendedor/admin, mostrar datos del cliente
    if (!esCliente && pedido.clienteNombre) {
      const clienteInfo = document.createElement("div");
      clienteInfo.className =
        "p-2 mb-3 bg-light rounded-3 small text-secondary d-flex align-items-center gap-2 border";
      clienteInfo.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-badge text-primary" viewBox="0 0 16 16">
          <path d="M6.5 2a.5.5 0 0 0 0 1h3a.5.5 0 0 0 0-1h-3zM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
          <path d="M4.5 0A2.5 2.5 0 0 0 2 2.5V14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2.5A2.5 2.5 0 0 0 11.5 0h-7zM3 2.5A1.5 1.5 0 0 1 4.5 1h7A1.5 1.5 0 0 1 13 2.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.5z"/>
        </svg>
        <span>Cliente: <strong class="text-dark">${pedido.clienteNombre}</strong> (${pedido.clienteCorreo})</span>
      `;
      cuerpo.append(clienteInfo);
    }

    // 3. Stepper Visual del Patrón State
    const stepperContenedor = document.createElement("div");
    stepperContenedor.innerHTML = renderizarStepperPedido(pedido.estado);
    cuerpo.append(stepperContenedor);

    // 4. Información de Envío (si existe)
    if (pedido.envio) {
      const envioBox = document.createElement("div");
      envioBox.className = "order-shipping-box";
      envioBox.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-truck flex-shrink-0" viewBox="0 0 16 16">
            <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-4 0 1 1 0 0 1-1-1V3.5zM1.5 3a.5.5 0 0 0-.5.5v7c0 .179.094.336.236.425a2 2 0 0 1 2.528 0 .5.5 0 0 0 .236-.425V3.5a.5.5 0 0 0-.5-.5h-2zm9.5 0H2v8.075a2 2 0 0 1 1 .925h6a2 2 0 0 1 1-.925V3zm1 3v2h2.55l-1.6-2H12zm2.55 3H12v2h2.5a.5.5 0 0 0 .5-.5V9.5a.5.5 0 0 0-.45-.5zM3 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          </svg>
          <div>
            <span class="small fw-bold d-block text-success-emphasis">Envío en camino con ${pedido.envio.transportista}</span>
            <span class="small text-secondary">Código de seguimiento: <strong class="font-monospace text-dark">${pedido.envio.codigoSeguimiento}</strong></span>
          </div>
        </div>
        <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">Despachado</span>
      `;
      cuerpo.append(envioBox);
    }

    // 5. Lista de Productos con Miniaturas Fotográficas
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

      const imagenUrl = obtenerImagenProductoCatalogo(producto.nombreProducto);
      const thumb = document.createElement("div");
      thumb.className = "order-product-thumb";
      if (imagenUrl) {
        const img = document.createElement("img");
        img.src = imagenUrl;
        img.alt = producto.nombreProducto;
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
      datosProd.innerHTML = `
        <div class="fw-semibold small text-dark text-truncate">${producto.nombreProducto}</div>
        <div class="small text-muted">${producto.cantidad} unidad${producto.cantidad > 1 ? "es" : ""} × ${formatoPrecio(producto.precioUnitario)}</div>
      `;

      const subtotalProd = document.createElement("div");
      subtotalProd.className = "fw-bold small text-primary text-end";
      subtotalProd.textContent = formatoPrecio(producto.subtotal);

      filaProd.append(thumb, datosProd, subtotalProd);
      productosContenedor.append(filaProd);
    }
    cuerpo.append(productosContenedor);

    // 6. Historial de Estados (Auditoría Timeline)
    if (pedido.historial && pedido.historial.length > 0) {
      const historial = document.createElement("details");
      historial.className = "order-timeline-details";
      const resumenHistorial = document.createElement("summary");
      resumenHistorial.innerHTML = `<span>Historial de estados y auditoría (${pedido.historial.length} eventos)</span>`;

      const listaEventos = document.createElement("ul");
      listaEventos.className = "order-timeline-list";
      for (const evento of pedido.historial) {
        const fechaEvento = new Date(evento.fecha).toLocaleString("es-PE");
        const itemEvento = document.createElement("li");
        itemEvento.className = "order-timeline-item";
        itemEvento.innerHTML = `
          <div class="fw-semibold text-dark">${evento.estado.replaceAll("_", " ")}</div>
          <div class="text-secondary">${evento.comentario}</div>
          <div class="text-muted small">${evento.responsable} · ${fechaEvento}</div>
        `;
        listaEventos.append(itemEvento);
      }
      historial.append(resumenHistorial, listaEventos);
      cuerpo.append(historial);
    }

    // 7. Acciones de Cliente y Empleado
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
      (esCliente || usuarioSesion?.rol === "VENDEDOR") &&
      pedido.estado === "PENDIENTE";
    if (puedeCancelar) {
      const botonCancelar = document.createElement("button");
      botonCancelar.type = "button";
      botonCancelar.className =
        "btn btn-outline-danger btn-sm rounded-pill px-3 mt-3 align-self-start";
      botonCancelar.textContent = esCliente
        ? "Cancelar pedido"
        : "Cancelar pedido (Soporte ventas)";
      botonCancelar.addEventListener("click", async () => {
        const confirmado = await mostrarConfirmacion({
          titulo: "Cancelar pedido",
          mensaje: `¿Estás seguro de cancelar el pedido #${pedido.idPedido}? Se repondrá el stock de los productos.`,
          textoBoton: "Sí, cancelar pedido",
          claseBoton: "btn-danger",
        });
        if (confirmado) {
          actualizarEstadoPedido(pedido.idPedido, "cancelar", botonCancelar);
        }
      });
      cuerpo.append(botonCancelar);
    }

    if (
      !esCliente &&
      ["ADMIN", "ALMACEN"].includes(usuarioSesion.rol) &&
      transicion
    ) {
      if (transicion.accion === "despachar") {
        cuerpo.append(crearFormularioDespacho(pedido));
      } else {
        const botonEstado = document.createElement("button");
        botonEstado.type = "button";
        botonEstado.className =
          "btn btn-primary btn-sm rounded-pill px-4 mt-3 shadow-sm align-self-start";
        botonEstado.textContent = transicion.etiqueta;
        botonEstado.addEventListener("click", () =>
          actualizarEstadoPedido(
            pedido.idPedido,
            transicion.accion,
            botonEstado,
          ),
        );
        cuerpo.append(botonEstado);
      }
    }

    tarjeta.append(cabecera, cuerpo);
    listaPedidos.append(tarjeta);
  }
}

function crearFormularioDespacho(pedido) {
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
    actualizarEstadoPedido(pedido.idPedido, "despachar", boton, {
      transportista: campoTransportista.value.trim(),
      codigoSeguimiento: campoSeguimiento.value.trim(),
    });
  });
  return formularioDespacho;
}

async function actualizarEstadoPedido(
  pedidoId,
  accion,
  boton,
  datos = undefined,
) {
  boton.disabled = true;
  estadoPedidos.className = "text-secondary";
  estadoPedidos.textContent = `Actualizando el pedido #${pedidoId}...`;
  try {
    const respuesta = await apiRequest(`/api/pedidos/${pedidoId}/${accion}`, {
      method: "PUT",
      ...(datos ? { json: datos } : {}),
    });
    await cargarPedidos();
    estadoPedidos.className = "text-success";
    const mensajes = {
      preparar: "en preparación",
      despachar: "despachado",
      entregar: "entrega registrada",
      cancelar: "cancelado; el stock fue repuesto",
    };
    const textoExito = `Pedido #${pedidoId}: ${mensajes[accion]}.`;
    estadoPedidos.textContent = textoExito;
    mostrarToast(textoExito, "exito");
  } catch (error) {
    const textoError = `No se pudo actualizar el pedido. ${error.message}`;
    estadoPedidos.className = "text-danger";
    estadoPedidos.textContent = textoError;
    mostrarToast(textoError, "error");
    boton.disabled = false;
  }
}

function abrirModalStock(producto) {
  productoActivoStock = producto;
  modalStockTitulo.textContent = `Ajustar stock: ${producto.nombre}`;
  modalStockActual.textContent = `Stock disponible actual: ${producto.stock} unidades`;
  modalStockInput.value = producto.stock;
  modalStockMotivo.value = "";
  modalStockMensaje.textContent = "";
  modalStockMensaje.className = "small mb-0";
  Modal.getOrCreateInstance(modalStockElemento).show();
}

formModalStock.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!productoActivoStock) return;

  const boton = formModalStock.querySelector('button[type="submit"]');
  const nuevoStock = Number(modalStockInput.value);
  const motivo = modalStockMotivo.value.trim();

  boton.disabled = true;
  modalStockMensaje.className = "small mt-2 mb-0 text-secondary";
  modalStockMensaje.textContent = "Guardando ajuste...";

  try {
    const respuesta = await apiRequest(
      `/api/productos/${productoActivoStock.id}/stock`,
      {
        method: "PUT",
        json: { nuevoStock, motivo },
      },
    );
    const productoActualizado = await respuesta.json();

    await cargarProductos();
    if (contenedorHistorial.children.length > 0) {
      await cargarMovimientos(productoActualizado);
    }
    Modal.getOrCreateInstance(modalStockElemento).hide();
    mostrarToast(
      `Stock de "${productoActivoStock.nombre}" ajustado a ${nuevoStock} unidades.`,
      "exito",
    );
  } catch (error) {
    modalStockMensaje.className = "small mt-2 mb-0 text-danger";
    modalStockMensaje.textContent = `No se pudo actualizar el stock. ${error.message}`;
    mostrarToast(`No se pudo actualizar el stock: ${error.message}`, "error");
  } finally {
    boton.disabled = false;
  }
});

function abrirModalPrecio(producto) {
  productoActivoPrecio = producto;
  modalPrecioTitulo.textContent = `Editar precio: ${producto.nombre}`;
  modalPrecioActual.textContent = `Precio actual: ${formatoPrecio(producto.precio)}`;
  modalPrecioInput.value = Number(producto.precio).toFixed(2);
  modalPrecioMensaje.textContent = "";
  modalPrecioMensaje.className = "small mb-0";
  Modal.getOrCreateInstance(modalPrecioElemento).show();
}

formModalPrecio.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  if (!productoActivoPrecio) return;

  const boton = formModalPrecio.querySelector('button[type="submit"]');
  const precio = Number(modalPrecioInput.value);

  boton.disabled = true;
  modalPrecioMensaje.className = "small mt-2 mb-0 text-secondary";
  modalPrecioMensaje.textContent = "Actualizando precio...";

  try {
    await apiRequest(`/api/productos/${productoActivoPrecio.id}/precio`, {
      method: "PUT",
      json: { precio },
    });

    await cargarProductos();
    Modal.getOrCreateInstance(modalPrecioElemento).hide();
    mostrarToast(
      `Precio de "${productoActivoPrecio.nombre}" actualizado a ${formatoPrecio(precio)}.`,
      "exito",
    );
  } catch (error) {
    modalPrecioMensaje.className = "small mt-2 mb-0 text-danger";
    modalPrecioMensaje.textContent = `No se pudo actualizar el precio. ${error.message}`;
    mostrarToast(`No se pudo actualizar el precio: ${error.message}`, "error");
  } finally {
    boton.disabled = false;
  }
});
function sincronizarCategoriaDestacada() {
  document.querySelectorAll(".category-pill").forEach((boton) => {
    const activo = boton.dataset.category === filtroCategoria.value;
    boton.classList.toggle("is-active", activo);
    boton.setAttribute("aria-pressed", String(activo));
  });
}
function mostrarCategoriasDestacadas(categorias) {
  const contenedor = document.querySelector("#categorias-destacadas");
  contenedor.replaceChildren();

  const crearBoton = (nombre, valor) => {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "category-pill";
    const icono = document.createElement("span");
    icono.className = "category-icon";
    icono.setAttribute("aria-hidden", "true");
    icono.innerHTML = !valor
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`
      : valor.toLowerCase().includes("perif")
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 16h8"></path></svg>`
        : valor.toLowerCase().includes("acces")
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
    const etiqueta = document.createElement("span");
    etiqueta.textContent = nombre;
    boton.append(icono, etiqueta);

    boton.dataset.category = valor;
    const activo = filtroCategoria.value === valor;
    boton.classList.toggle("is-active", activo);
    boton.setAttribute("aria-pressed", String(activo));
    boton.addEventListener("click", () => {
      filtroCategoria.value = valor;
      contenedor.querySelectorAll(".category-pill").forEach((elemento) => {
        const seleccionado = elemento === boton;
        elemento.classList.toggle("is-active", seleccionado);
        elemento.setAttribute("aria-pressed", String(seleccionado));
      });
      cargarProductos();
    });
    return boton;
  };

  contenedor.append(crearBoton("Todas", ""));
  // Mostrar únicamente categorías principales en las pastillas de la vitrina (Composite)
  const categoriasPrincipales = categorias.filter(
    (c) => !c.categoriaPadreId,
  );
  const listaMostrar =
    categoriasPrincipales.length > 0 ? categoriasPrincipales : categorias;
  for (const categoria of listaMostrar) {
    contenedor.append(crearBoton(categoria.nombre, categoria.nombre));
  }
}
async function cargarCategorias() {
  const respuesta = await apiRequest("/api/categorias");
  const categorias = await respuesta.json();
  mostrarCategoriasDestacadas(categorias);
  filtroCategoria.replaceChildren(new Option("Todas las categorías", ""));
  categoriaProducto.replaceChildren(new Option("Selecciona una categoría", ""));
  for (const categoria of categorias) {
    const opcionFiltro = document.createElement("option");
    opcionFiltro.value = categoria.nombre;
    opcionFiltro.textContent = categoria.nombre;
    filtroCategoria.append(opcionFiltro);

    const opcionProducto = document.createElement("option");
    opcionProducto.value = categoria.nombre;
    opcionProducto.textContent = categoria.nombre;
    categoriaProducto.append(opcionProducto);
  }
}

async function cargarProductos() {
  const solicitudActual = ++solicitudCatalogo;
  const min = precioMinimo.value === "" ? null : Number(precioMinimo.value);
  const max = precioMaximo.value === "" ? null : Number(precioMaximo.value);

  if (min !== null && max !== null && min > max) {
    estado.className = "text-danger";
    estado.textContent = "El precio mínimo no puede superar al precio máximo.";
    contenedor.replaceChildren();
    return;
  }

  const parametros = new URLSearchParams();
  if (campoBusqueda.value.trim())
    parametros.set("nombre", campoBusqueda.value.trim());
  if (filtroCategoria.value) parametros.set("categoria", filtroCategoria.value);
  if (min !== null) parametros.set("precioMin", String(min));
  if (max !== null) parametros.set("precioMax", String(max));

  const consulta = parametros.size > 0 ? `?${parametros.toString()}` : "";
  estado.className = "text-secondary catalog-status";
  estado.textContent = "Actualizando catálogo…";

  contenedor.setAttribute("aria-busy", "true");
  contenedor.innerHTML = generarSkeletonCards(8);

  const trackNuevos = document.querySelector("#carrusel-nuevos-track");
  const trackOfertas = document.querySelector("#carrusel-ofertas-track");
  if (gridDestacados && gridDestacados.children.length === 0) {
    gridDestacados.innerHTML = generarSkeletonCards(4);
  }
  if (trackNuevos && trackNuevos.children.length === 0) {
    trackNuevos.innerHTML = generarSkeletonCards(4);
  }
  if (trackOfertas && trackOfertas.children.length === 0) {
    trackOfertas.innerHTML = generarSkeletonCards(4);
  }
  if (gridComponentes && gridComponentes.children.length === 0) {
    gridComponentes.innerHTML = generarSkeletonCards(4);
  }

  try {
    const respuesta = await apiRequest(`/api/productos${consulta}`);
    const productos = await respuesta.json();
    if (solicitudActual !== solicitudCatalogo) return;

    productosDisponibles = productos;
    actualizarVistaCatalogo({ resetearPagina: true });
    poblarVitrinaInicio(productos);
  } catch {
    if (solicitudActual !== solicitudCatalogo) return;
    contenedor.removeAttribute("aria-busy");
    estado.className = "alert alert-danger my-3 py-2 px-3 small";
    estado.innerHTML = `
      <div class="d-flex align-items-center justify-content-between gap-2">
        <span>No se pudo conectar con el catálogo. Comprueba que el backend de Spring Boot esté activo en el puerto 8081.</span>
        <button id="btn-reintentar-catalogo" class="btn btn-sm btn-outline-danger" type="button">Reintentar</button>
      </div>
    `;
    document
      .querySelector("#btn-reintentar-catalogo")
      ?.addEventListener("click", () => cargarProductos());
  }
}
async function mostrarSesionActiva(usuario) {
  usuarioSesion = usuario;
  establecerUsuarioSesion(usuario);
  enlaceLogin.hidden = true;
  enlaceRegistro.hidden = true;
  usuarioActivo.hidden = false;
  usuarioActivo.textContent = `Sesión: ${usuario.nombre} (${usuario.rol})`;
  botonCerrarSesion.hidden = false;
  enlacePedidosNav.hidden = false;
  enlaceCarritoNav.hidden = usuario.rol !== "CLIENTE";
  seccionGestionProductos.hidden = !["ADMIN", "VENDEDOR"].includes(usuario.rol);
  panelAdministracion.element.hidden = false;
  seccionPreguntasVendedor.hidden = false;
  seccionInventario.hidden = false;
  seccionEntradaInventario.hidden = !["ADMIN", "ALMACEN"].includes(usuario.rol);
  actualizarPestañasPorRol(usuario.rol);
  actualizarVistaCatalogo();
  if (usuario.rol === "CLIENTE") {
    if (hayCarritoInvitado()) {
      mostrarToast("Sincronizando productos de tu carrito...", "info");
      await sincronizarCarritoInvitadoConBackend(apiRequest);
    }
    cargarPreguntasCliente();
    cargarCarrito();
    cargarNotificacionesCliente();
    iniciarPollingNotificaciones();
  } else {
    detenerPollingNotificaciones();
    preguntasCliente = [];
    ocultarCarrito();
    if (contenedorNotificaciones) {
      contenedorNotificaciones.hidden = true;
      contenedorNotificaciones.style.display = "none";
    }
    if (menuNotificaciones) {
      menuNotificaciones.classList.remove("show");
    }
    if (btnNotificaciones) {
      btnNotificaciones.setAttribute("aria-expanded", "false");
    }
    badgeContadorNotificaciones.hidden = true;
    listaPreguntasVendedor.replaceChildren();
  }
}

function mostrarSesionCerrada() {
  detenerPollingNotificaciones();
  usuarioSesion = null;
  establecerUsuarioSesion(null);
  preguntasCliente = [];
  if (contenedorNotificaciones) {
    contenedorNotificaciones.hidden = true;
    contenedorNotificaciones.style.display = "none";
  }
  if (menuNotificaciones) {
    menuNotificaciones.classList.remove("show");
  }
  if (btnNotificaciones) {
    btnNotificaciones.setAttribute("aria-expanded", "false");
  }
  badgeContadorNotificaciones.hidden = true;
  listaNotificaciones.replaceChildren();
  seccionGestionProductos.hidden = true;
  panelAdministracion.element.hidden = true;
  seccionPreguntasVendedor.hidden = true;
  estadoPreguntasVendedor.textContent = "";
  listaPreguntasVendedor.replaceChildren();
  seccionPedidos.hidden = true;
  seccionInventario.hidden = true;
  listaMovimientos.replaceChildren();
  listaPedidos.replaceChildren();
  enlaceLogin.hidden = false;
  enlaceRegistro.hidden = false;
  usuarioActivo.hidden = true;
  usuarioActivo.textContent = "";
  botonCerrarSesion.hidden = true;
  enlacePedidosNav.hidden = true;
  enlaceCarritoNav.hidden = false; // Siempre visible para invitados
  cargarCarrito(); // Muestra carrito de invitado
  actualizarPestañasPorRol(null);
  actualizarVistaCatalogo();
}

let notificacionesCliente = [];
let timerPollingNotificaciones = null;

function iniciarPollingNotificaciones() {
  detenerPollingNotificaciones();
  timerPollingNotificaciones = setInterval(() => {
    if (usuarioSesion?.rol === "CLIENTE") {
      cargarNotificacionesCliente();
    }
  }, 25000);
}

function detenerPollingNotificaciones() {
  if (timerPollingNotificaciones) {
    clearInterval(timerPollingNotificaciones);
    timerPollingNotificaciones = null;
  }
}

async function cargarNotificacionesCliente() {
  if (usuarioSesion?.rol !== "CLIENTE") {
    if (contenedorNotificaciones) {
      contenedorNotificaciones.hidden = true;
      contenedorNotificaciones.style.display = "none";
    }
    return;
  }
  if (contenedorNotificaciones) {
    contenedorNotificaciones.hidden = false;
    contenedorNotificaciones.style.display = "inline-block";
  }
  try {
    const datos = await consultarMisNotificaciones(apiRequest, 50);
    notificacionesCliente = Array.isArray(datos) ? datos : [];
    renderizarBandejaNotificaciones(notificacionesCliente);
  } catch {
    listaNotificaciones.replaceChildren();
    const errorMsg = document.createElement("div");
    errorMsg.className = "text-center text-danger p-3 small";
    errorMsg.textContent = "No se pudieron cargar las notificaciones.";
    listaNotificaciones.appendChild(errorMsg);
  }
}

function renderizarBandejaNotificaciones(notificaciones) {
  const pendientes = contarNotificacionesNoLeidas(notificaciones);
  if (pendientes > 0) {
    badgeContadorNotificaciones.textContent =
      pendientes > 99 ? "99+" : String(pendientes);
    badgeContadorNotificaciones.hidden = false;
  } else {
    badgeContadorNotificaciones.hidden = true;
  }

  listaNotificaciones.replaceChildren();

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
    subtexto.textContent =
      "Te avisaremos cuando tus pedidos cambien de estado.";
    vacio.append(icono, texto, subtexto);
    listaNotificaciones.appendChild(vacio);
    return;
  }

  notificaciones.forEach((notif) => {
    const item = document.createElement("div");
    item.className =
      "notification-item p-2 mb-1 rounded text-decoration-none d-block";
    if (!notif.leida) {
      item.classList.add("is-unread");
    }
    item.style.cursor = "pointer";

    const badgeInfo = obtenerBadgeEstadoNotificacion(notif.estado);
    const fechaTexto = formatearFechaNotificacion(notif.creadaEn);

    const cabecera = document.createElement("div");
    cabecera.className =
      "d-flex justify-content-between align-items-center mb-1";
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

    item.addEventListener("click", () => {
      if (menuNotificaciones) {
        menuNotificaciones.classList.remove("show");
      }
      if (btnNotificaciones) {
        btnNotificaciones.setAttribute("aria-expanded", "false");
      }
      cambiarVista("pedidos");
      setTimeout(() => {
        const elementoPedido = document.querySelector(
          `#pedido-${notif.pedidoId}`,
        );
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
    });

    listaNotificaciones.appendChild(item);
  });
}

let promesaPreguntasVendedorEnCurso = null;
async function cargarPreguntasVendedor() {
  if (usuarioSesion?.rol !== "VENDEDOR") return;
  if (promesaPreguntasVendedorEnCurso) return promesaPreguntasVendedorEnCurso;
  promesaPreguntasVendedorEnCurso = (async () => {
    estadoPreguntasVendedor.className = "text-secondary mt-3 mb-2";
    estadoPreguntasVendedor.textContent = "Cargando preguntas pendientes...";
    try {
      const preguntas = await listarPreguntasPendientes(apiRequest);
      if (usuarioSesion?.rol !== "VENDEDOR") return;
      if (preguntas.length === 0) {
        listaPreguntasVendedor.replaceChildren();
        estadoPreguntasVendedor.textContent = "No hay preguntas pendientes.";
        return;
      }
      estadoPreguntasVendedor.textContent = `Preguntas pendientes: ${preguntas.length}`;
      const tarjetas = [];
      for (const pregunta of preguntas) {
        const tarjeta = document.createElement("article");
        tarjeta.className = "list-group-item";
        const titulo = document.createElement("h3");
        titulo.className = "h6";
        titulo.textContent = `${pregunta.nombreProducto} · ${pregunta.clienteNombre}`;
        const texto = document.createElement("p");
        texto.className = "mb-2";
        texto.textContent = pregunta.pregunta;
        const fecha = document.createElement("p");
        fecha.className = "small text-secondary mb-2";
        fecha.textContent = `Recibida: ${new Date(pregunta.creadaEn).toLocaleString("es-PE")}`;
        const formularioRespuesta = document.createElement("form");
        formularioRespuesta.className = "row g-2 align-items-end";
        const columnaCampo = document.createElement("div");
        columnaCampo.className = "col-12 col-md-9";
        const etiqueta = document.createElement("label");
        etiqueta.className = "form-label";
        etiqueta.htmlFor = `respuesta-pregunta-${pregunta.idConsulta}`;
        etiqueta.textContent = "Tu respuesta";
        const entrada = document.createElement("textarea");
        entrada.id = etiqueta.htmlFor;
        entrada.className = "form-control";
        entrada.rows = 2;
        entrada.maxLength = 1000;
        entrada.required = true;
        entrada.placeholder = "Escribe una respuesta para el cliente";
        columnaCampo.append(etiqueta, entrada);
        const columnaBoton = document.createElement("div");
        columnaBoton.className = "col-12 col-md-3 d-grid";
        const boton = document.createElement("button");
        boton.type = "submit";
        boton.className = "btn btn-primary";
        boton.textContent = "Responder";
        columnaBoton.append(boton);
        const resultado = document.createElement("p");
        resultado.className = "small mb-0 text-danger";
        resultado.setAttribute("role", "status");
        formularioRespuesta.append(columnaCampo, columnaBoton, resultado);
        formularioRespuesta.addEventListener("submit", async (evento) => {
          evento.preventDefault();
          boton.disabled = true;
          resultado.className = "small mb-0 text-secondary";
          resultado.textContent = "Enviando respuesta...";
          try {
            await enviarRespuestaPregunta(
              apiRequest,
              pregunta.idConsulta,
              entrada.value,
            );
            await cargarPreguntasVendedor();
            estadoPreguntasVendedor.className = "text-success mt-3 mb-2";
            estadoPreguntasVendedor.textContent =
              "Respuesta enviada. La pregunta salió de pendientes.";
            mostrarToast("Respuesta enviada con éxito.", "exito");
          } catch (error) {
            resultado.className = "small mb-0 text-danger";
            resultado.textContent = `No se pudo responder. ${error.message}`;
            mostrarToast(
              `No se pudo responder la pregunta: ${error.message}`,
              "error",
            );
            boton.disabled = false;
          }
        });
        tarjeta.append(titulo, texto, fecha, formularioRespuesta);
        tarjetas.push(tarjeta);
      }
      listaPreguntasVendedor.replaceChildren(...tarjetas);
    } catch (error) {
      estadoPreguntasVendedor.className = "text-danger mt-3 mb-2";
      estadoPreguntasVendedor.textContent = `No se pudieron cargar las preguntas. ${error.message}`;
    } finally {
      promesaPreguntasVendedorEnCurso = null;
    }
  })();
  return promesaPreguntasVendedorEnCurso;
}

document
  .querySelector("#actualizar-preguntas-vendedor")
  .addEventListener("click", cargarPreguntasVendedor);

if (btnNotificaciones && menuNotificaciones) {
  btnNotificaciones.addEventListener("click", (evento) => {
    evento.stopPropagation();
    // Cerrar menú de categorías si estuviese abierto
    if (menuCategoriasDropdown) {
      menuCategoriasDropdown.classList.remove("show");
    }
    if (btnToggleCategoriasMenu) {
      btnToggleCategoriasMenu.setAttribute("aria-expanded", "false");
    }

    const esVisible = menuNotificaciones.classList.toggle("show");
    btnNotificaciones.setAttribute("aria-expanded", String(esVisible));

    if (esVisible) {
      cargarNotificacionesCliente();
    }
  });

  // Evitar que hacer clic dentro de la cabecera o lista del menú lo cierre inesperadamente
  menuNotificaciones.addEventListener("click", (evento) => {
    evento.stopPropagation();
  });

  // Cerrar al hacer clic en cualquier otra parte del documento
  document.addEventListener("click", (evento) => {
    if (!evento.target.closest("#contenedor-notificaciones")) {
      menuNotificaciones.classList.remove("show");
      btnNotificaciones.setAttribute("aria-expanded", "false");
    }
  });

  // Cerrar accesiblemente al presionar Escape
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && menuNotificaciones.classList.contains("show")) {
      menuNotificaciones.classList.remove("show");
      btnNotificaciones.setAttribute("aria-expanded", "false");
      btnNotificaciones.focus();
    }
  });
}

if (btnRefrescarNotificaciones) {
  btnRefrescarNotificaciones.addEventListener("click", (evento) => {
    evento.stopPropagation();
    btnRefrescarNotificaciones.classList.add("opacity-50");
    cargarNotificacionesCliente().finally(() => {
      btnRefrescarNotificaciones.classList.remove("opacity-50");
    });
  });
}

document.addEventListener("retail:pedido-confirmado", () => {
  cargarPedidos();
  cargarNotificacionesCliente();
  cambiarVista("pedidos");
});

enlacePedidosNav.addEventListener("click", (evento) => {
  evento.preventDefault();
  window.location.hash = "#/pedidos";
  cambiarVista("pedidos");
});

const enlaceCategoriasNav = document.querySelector('a[href="#categorias"]');
if (enlaceCategoriasNav) {
  enlaceCategoriasNav.addEventListener("click", (evento) => {
    evento.preventDefault();
    cambiarVista("tienda");
    document
      .querySelector("#categorias")
      ?.scrollIntoView({ behavior: "smooth" });
  });
}

async function consultarSesion() {
  try {
    const respuesta = await apiRequest("/api/auth/sesion", {});
    const usuario = await respuesta.json();
    mostrarSesionActiva(usuario);
  } catch {
    mostrarSesionCerrada();
  }
}

botonCerrarSesion.addEventListener("click", async () => {
  botonCerrarSesion.disabled = true;

  try {
    const respuesta = await apiRequest("/api/auth/logout", {
      method: "POST",
    });
    mostrarSesionCerrada();
  } catch (error) {
    usuarioActivo.textContent = error.message;
  } finally {
    botonCerrarSesion.disabled = false;
  }
});

consultarSesion();

function inicializarTienda() {
  cargarCategorias()
    .then(() => Promise.all([cargarProductos(), cargarArbolCategorias()]))
    .then(() => {
      manejarRutaHash();
    })
    .catch(() => {
      estado.className = "alert alert-danger my-3 py-2 px-3 small";
      estado.innerHTML = `
        <div class="d-flex align-items-center justify-content-between gap-2">
          <span>No se pudieron cargar las categorías de la tienda. Comprueba que el backend de Spring Boot esté activo en el puerto 8081.</span>
          <button id="btn-reintentar-inicio" class="btn btn-sm btn-outline-danger" type="button">Reintentar</button>
        </div>
      `;
      document
        .querySelector("#btn-reintentar-inicio")
        ?.addEventListener("click", () => {
          estado.textContent = "Reconectando con el servidor...";
          estado.className = "text-secondary small";
          inicializarTienda();
        });
    });
}
inicializarTienda();

window.addEventListener("keydown", (evento) => {
  if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
    evento.preventDefault();
    if (campoBusquedaPrincipal) {
      campoBusquedaPrincipal.focus();
      campoBusquedaPrincipal.select();
    }
  }
});

// ==========================================================================
// COMPOSITE CATEGORÍAS, CARRUSELES Y CONTROLES FLOTANTES (FASE 2)
// ==========================================================================
const btnToggleCategoriasMenu = document.querySelector(
  "#btn-toggle-categorias-menu",
);
const menuCategoriasDropdown = document.querySelector(
  "#menu-categorias-dropdown",
);

async function cargarArbolCategorias() {
  if (!menuCategoriasDropdown) return;
  try {
    const respuesta = await apiRequest("/api/categorias/arbol");
    const categoriasArbol = await respuesta.json();
    categoriasArbolGlobal = categoriasArbol;
    menuCategoriasDropdown.replaceChildren();

    categoriasArbol.forEach((cat) => {
      const li = document.createElement("li");
      li.className = "category-dropdown-item";

      const catSlug = generarSlug(cat.nombre);
      const a = document.createElement("a");
      a.className = "category-dropdown-link";
      a.href = `#/categoria/${catSlug}`;

      if (
        cat.compuesta &&
        Array.isArray(cat.subcategorias) &&
        cat.subcategorias.length > 0
      ) {
        a.innerHTML = `<span>${cat.nombre}</span> <span class="arrow-flyout" aria-hidden="true">›</span>`;
        a.addEventListener("click", () => {
          menuCategoriasDropdown.classList.remove("show");
          btnToggleCategoriasMenu?.setAttribute("aria-expanded", "false");
        });

        const subUl = document.createElement("ul");
        subUl.className = "category-submenu";
        cat.subcategorias.forEach((sub) => {
          const subLi = document.createElement("li");
          const subSlug = generarSlug(sub.nombre);
          const subA = document.createElement("a");
          subA.className = "category-dropdown-link";
          subA.href = `#/categoria/${catSlug}/${subSlug}`;
          subA.textContent = sub.nombre;
          subA.addEventListener("click", () => {
            menuCategoriasDropdown.classList.remove("show");
            btnToggleCategoriasMenu?.setAttribute("aria-expanded", "false");
          });
          subLi.append(subA);
          subUl.append(subLi);
        });
        li.append(a, subUl);
      } else {
        a.textContent = cat.nombre;
        a.addEventListener("click", () => {
          menuCategoriasDropdown.classList.remove("show");
          btnToggleCategoriasMenu?.setAttribute("aria-expanded", "false");
        });
        li.append(a);
      }

      menuCategoriasDropdown.append(li);
    });
  } catch (error) {
    console.warn("No se pudo cargar el árbol de categorías:", error);
  }
}

// ==========================================================================
// ENRUTADOR Y NAVEGACIÓN SPA POR HASH (RF-05, RF-06, RF-07)
// ==========================================================================
function renderizarBreadcrumbsEnDOM(crumbs) {
  if (!contenedorBreadcrumbs || !listaBreadcrumbs) return;
  if (!crumbs || crumbs.length <= 1) {
    contenedorBreadcrumbs.hidden = true;
    listaBreadcrumbs.replaceChildren();
    return;
  }
  listaBreadcrumbs.replaceChildren();
  crumbs.forEach((crumb) => {
    const li = document.createElement("li");
    const esActivo = Boolean(crumb.esActivo || crumb.activo);
    li.className = `breadcrumb-item ${esActivo ? "active" : ""}`;
    if (esActivo) {
      li.setAttribute("aria-current", "page");
      li.textContent = crumb.etiqueta;
    } else {
      const a = document.createElement("a");
      a.href = crumb.url;
      a.textContent = crumb.etiqueta;
      li.append(a);
    }
    listaBreadcrumbs.append(li);
  });
  contenedorBreadcrumbs.hidden = false;
}

async function manejarRutaHash() {
  const hash = window.location.hash || "#/";
  const rutaInfo = parsearRuta(hash);

  if (vista404) vista404.hidden = true;
  if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;

  if (rutaInfo.tipo === "inicio") {
    if (vistaTienda) vistaTienda.hidden = false;
    if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = false;
    if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = true;
    if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
    if (filtroCategoria && filtroCategoria.value !== "") {
      filtroCategoria.value = "";
      sincronizarCategoriaDestacada();
      await cargarProductos();
    }
    return;
  }

  if (rutaInfo.tipo === "catalogo") {
    if (vistaTienda) vistaTienda.hidden = false;
    if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
    if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
    const crumbs = construirBreadcrumbs(rutaInfo, categoriasArbolGlobal);
    renderizarBreadcrumbsEnDOM(crumbs);
    if (filtroCategoria && filtroCategoria.value !== "") {
      filtroCategoria.value = "";
      sincronizarCategoriaDestacada();
      await cargarProductos();
    }
    document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (rutaInfo.tipo === "categoria" || rutaInfo.tipo === "subcategoria") {
    const slug = rutaInfo.params.slug;
    let hallazgo = buscarCategoriaPorSlug(categoriasArbolGlobal, slug);
    if (!hallazgo && (!categoriasArbolGlobal || categoriasArbolGlobal.length === 0)) {
      await cargarArbolCategorias();
      hallazgo = buscarCategoriaPorSlug(categoriasArbolGlobal, slug);
    }

    if (hallazgo && hallazgo.categoria) {
      if (vistaTienda) vistaTienda.hidden = false;
      if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
      if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
      const crumbs = construirBreadcrumbs(rutaInfo, categoriasArbolGlobal);
      renderizarBreadcrumbsEnDOM(crumbs);
      if (filtroCategoria) {
        filtroCategoria.value = hallazgo.categoria.nombre;
        sincronizarCategoriaDestacada();
        await cargarProductos();
      }
      document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
    } else {
      if (vistaTienda) vistaTienda.hidden = true;
      if (vista404) vista404.hidden = false;
      if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
    }
    return;
  }

  if (rutaInfo.tipo === "buscar") {
    if (vistaTienda) vistaTienda.hidden = false;
    if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
    if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
    const crumbs = construirBreadcrumbs(rutaInfo, categoriasArbolGlobal);
    renderizarBreadcrumbsEnDOM(crumbs);
    const q = rutaInfo.query?.q || "";
    if (campoBusqueda) {
      campoBusqueda.value = q;
      await cargarProductos();
    }
    document.querySelector("#productos")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (rutaInfo.tipo === "producto") {
    const skuParam = rutaInfo.params.sku;
    if (!productosDisponibles || productosDisponibles.length === 0) {
      await cargarProductos();
    }

    const producto = (productosDisponibles || []).find((p) => {
      const pSku = (p.sku || `PA-${String(p.id).padStart(4, "0")}`).toUpperCase();
      return pSku === skuParam.toUpperCase() || String(p.id) === skuParam;
    });

    if (producto) {
      if (vistaTienda) vistaTienda.hidden = true;
      if (vista404) vista404.hidden = true;

      const crumbs = construirBreadcrumbs(rutaInfo, categoriasArbolGlobal, producto);
      renderizarBreadcrumbsEnDOM(crumbs);

      if (vistaDetalleProducto) {
        vistaDetalleProducto.replaceChildren();
        const detalleDOM = renderizarVistaDetalleProducto(producto, {
          imagenUrl: resolverImagenProducto(producto),
          esFavorito: esFavorito(producto.id),
          onAgregarAlCarrito: (cantidad) => {
            agregarProductoAlCarrito(producto.id, producto, cantidad);
          },
          onAbrirPreguntas: () => {
            abrirModalPreguntas(producto);
          },
          onAlternarFavorito: () => {
            const res = alternarFavorito(producto.id);
            mostrarToast(
              res.activo ? `¡Añadido a favoritos! ${producto.nombre}` : `Removido de favoritos`,
              res.activo ? "exito" : "info",
            );
          },
        });
        vistaDetalleProducto.append(detalleDOM);
        vistaDetalleProducto.hidden = false;
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      if (vistaTienda) vistaTienda.hidden = true;
      if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
      if (vista404) vista404.hidden = false;
      if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
    }
    return;
  }

  if (rutaInfo.tipo === "pedidos") {
    if (vistaTienda) vistaTienda.hidden = true;
    if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
    if (vista404) vista404.hidden = true;
    if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
    cambiarVista("pedidos");
    document.querySelector("#seccion-pedidos")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // Rutas hash fijas o secciones
  if (hash.startsWith("#seccion-") || hash === "#productos") {
    if (vistaTienda) vistaTienda.hidden = false;
    if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
    if (vista404) vista404.hidden = true;
    if (hash === "#productos") {
      if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = true;
      if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = false;
    } else {
      if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = false;
      if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = true;
    }
    window.requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    });
    return;
  }

  if (vistaTienda) vistaTienda.hidden = true;
  if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
  if (vista404) vista404.hidden = false;
  if (contenedorBreadcrumbs) contenedorBreadcrumbs.hidden = true;
}

window.addEventListener("hashchange", () => {
  manejarRutaHash();
});

if (btnToggleCategoriasMenu && menuCategoriasDropdown) {
  btnToggleCategoriasMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuNotificaciones) {
      menuNotificaciones.classList.remove("show");
    }
    if (btnNotificaciones) {
      btnNotificaciones.setAttribute("aria-expanded", "false");
    }
    const esVisible = menuCategoriasDropdown.classList.toggle("show");
    btnToggleCategoriasMenu.setAttribute("aria-expanded", String(esVisible));
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".category-dropdown-wrapper")) {
      menuCategoriasDropdown.classList.remove("show");
      btnToggleCategoriasMenu.setAttribute("aria-expanded", "false");
    }
  });
}

// Enlaces rápidos por categoría en la barra de navegación y banners promocionales.
// Permiten la navegación hash del enrutador SPA (/categoria/:slug).
// Si ya nos encontramos en la misma ruta hash, se ejecuta manejarRutaHash() para enfocar el catálogo.
document.querySelectorAll("[data-categoria-link]").forEach((enlace) => {
  enlace.addEventListener("click", (e) => {
    const href = enlace.getAttribute("href");
    if (href && href.startsWith("#") && window.location.hash === href) {
      e.preventDefault();
      manejarRutaHash();
    }
  });
});

// Controles de Carrusel Horizontal (Nuevos y Ofertas)
const btnNuevosPrev = document.querySelector("#btn-nuevos-prev");
const btnNuevosNext = document.querySelector("#btn-nuevos-next");
const trackNuevos = document.querySelector("#carrusel-nuevos-track");

if (btnNuevosPrev && trackNuevos) {
  btnNuevosPrev.addEventListener("click", () => {
    trackNuevos.scrollBy({ left: -280, behavior: "smooth" });
  });
}
if (btnNuevosNext && trackNuevos) {
  btnNuevosNext.addEventListener("click", () => {
    trackNuevos.scrollBy({ left: 280, behavior: "smooth" });
  });
}

const btnOfertasPrev = document.querySelector("#btn-ofertas-prev");
const btnOfertasNext = document.querySelector("#btn-ofertas-next");
const trackOfertas = document.querySelector("#carrusel-ofertas-track");

if (btnOfertasPrev && trackOfertas) {
  btnOfertasPrev.addEventListener("click", () => {
    trackOfertas.scrollBy({ left: -280, behavior: "smooth" });
  });
}
if (btnOfertasNext && trackOfertas) {
  btnOfertasNext.addEventListener("click", () => {
    trackOfertas.scrollBy({ left: 280, behavior: "smooth" });
  });
}

// Dock Flotante de Utilidades
const dockBtnTop = document.querySelector("#dock-btn-top");
if (dockBtnTop) {
  dockBtnTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

const dockBtnFavoritos = document.querySelector("#dock-btn-favoritos");
if (dockBtnFavoritos) {
  dockBtnFavoritos.addEventListener("click", () => {
    const productosFav = productosDisponibles.filter((p) => esFavorito(p.id));
    if (productosFav.length > 0) {
      mostrarProductos(productosFav);
      estado.textContent = `Mostrando ${productosFav.length} producto(s) en tus favoritos`;
      document
        .querySelector("#productos")
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      mostrarToast(
        "Aún no tienes productos guardados en favoritos. Haz clic en el corazón de cualquier tarjeta.",
        "info",
      );
    }
  });
}

// ==========================================================================
// INTERACCIONES HERO, LIBRO DE RECLAMACIONES Y OFERTAS (BLOQUE 3)
// ==========================================================================
function desplazarHaciaOfertas(evento) {
  if (evento) evento.preventDefault();
  if (vistaTienda) vistaTienda.hidden = false;
  if (bloqueVitrinaInicio) bloqueVitrinaInicio.hidden = false;
  if (bloqueCatalogoCompleto) bloqueCatalogoCompleto.hidden = true;
  if (vistaDetalleProducto) vistaDetalleProducto.hidden = true;
  if (vista404) vista404.hidden = true;
  window.location.hash = "#seccion-ofertas";
  window.requestAnimationFrame(() => {
    document
      .querySelector("#seccion-ofertas")
      ?.scrollIntoView({ behavior: "smooth" });
  });
}

const btnHeroOfertas = document.querySelector("#btn-hero-ofertas");
if (btnHeroOfertas) {
  btnHeroOfertas.addEventListener("click", desplazarHaciaOfertas);
}

const btnPromoOfertas = document.querySelector("#btn-promo-ofertas");
if (btnPromoOfertas) {
  btnPromoOfertas.addEventListener("click", desplazarHaciaOfertas);
}

const btnPromoComponentes = document.querySelector("#btn-promo-componentes");
if (btnPromoComponentes) {
  btnPromoComponentes.addEventListener("click", (evento) => {
    if (window.location.hash === "#/categoria/componentes-para-pc") {
      evento.preventDefault();
      manejarRutaHash();
    }
  });
}

const formLibro = document.querySelector("#form-libro-reclamaciones");
if (formLibro) {
  formLibro.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const modalEl = document.querySelector("#modal-libro-reclamaciones");
    const modalInstancia = Modal.getInstance(modalEl);
    if (modalInstancia) modalInstancia.hide();
    const folio = `LR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    mostrarToast(
      `Hoja de reclamación registrada con éxito. Folio de seguimiento: ${folio}`,
      "exito",
    );
    formLibro.reset();
  });
}


const enlaceSeguimientoFooter = document.querySelector("#enlace-seguimiento-footer");
if (enlaceSeguimientoFooter) {
  enlaceSeguimientoFooter.addEventListener("click", (evento) => {
    evento.preventDefault();
    if (usuarioSesion && usuarioSesion.rol === "CLIENTE") {
      cambiarVista("pedidos");
      document.querySelector("#seccion-pedidos")?.scrollIntoView({ behavior: "smooth" });
    } else if (usuarioSesion) {
      mostrarToast("El seguimiento de compras personales está disponible para cuentas de cliente.", "info");
    } else {
      mostrarToast("Inicia sesión para dar seguimiento a tus compras y pedidos.", "info");
      setTimeout(() => {
        window.location.href = "/login.html";
      }, 700);
    }
  });
}
