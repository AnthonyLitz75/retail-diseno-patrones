import { renderizarLogoSvg } from './componentes/logo.js';

/**
 * Renderiza el encabezado principal de Píxel Andino en 2 niveles:
 * - Nivel 1: Barra blanca con branding, buscador central (Ctrl+K), estado de sesión, notificaciones y acceso a carrito.
 * - Nivel 2: Barra azul marino con menú desplegable de categorías (Composite) y accesos directos.
 *
 * @returns {string} Markup HTML del encabezado
 */
export function renderizarHeader() {
  const logoSvg = renderizarLogoSvg({ prefijo: 'nav', width: 40, height: 40 });

  return `
  <header class="header-wrapper">
    <!-- Nivel 1: Barra Principal Superior Blanca -->
    <div class="header-level-1">
      <div class="container header-level-1-container">
        <a class="header-brand" href="/" aria-label="Píxel Andino, inicio">
          <span class="header-brand-mark" aria-hidden="true">
            ${logoSvg}
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
          <button id="cerrar-sesion" class="btn btn-outline-secondary btn-sm header-btn-salir" type="button" hidden>
            <svg class="header-btn-salir-icono" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>
            </svg>
            <span class="header-btn-texto">Cerrar sesión</span>
          </button>

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
            <div id="menu-notificaciones" class="dropdown-menu dropdown-menu-end shadow p-0 notification-dropdown">
              <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-light rounded-top">
                <h6 class="mb-0 fw-semibold text-dark">Notificaciones de Pedidos</h6>
                <button id="btn-refrescar-notificaciones" class="btn btn-sm btn-link text-decoration-none p-0 text-muted" type="button" title="Actualizar">
                  <small>Actualizar</small>
                </button>
              </div>
              <div id="lista-notificaciones" class="notification-list p-2">
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
  `;
}
