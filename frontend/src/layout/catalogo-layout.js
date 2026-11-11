/**
 * Renderiza el cuerpo principal de la aplicación con sus vistas intercambiables:
 * - Vistas modulares: Tienda, Pedidos, Inventario, Administración y Consultas.
 * - Vista Detalle de Producto y Vista 404.
 * - Bloque de Vitrina Comercial de Inicio (#/) y Bloque de Catálogo Completo (#/catalogo).
 * - Offcanvas lateral del carrito de compras.
 *
 * @param {object} [opciones={}]
 * @param {string} [opciones.heroHtml=''] - HTML del hero renderizado
 * @returns {string} Markup HTML del contenedor principal
 */
export function renderizarCatalogoLayout({ heroHtml = '' } = {}) {
  return `
  <main class="container py-4 storefront">
    <nav id="navegacion-modulos" class="nav nav-pills modulo-tabs mb-4 gap-2 flex-wrap" role="tablist" aria-label="Módulos de la tienda" hidden>
      <button class="nav-link active" id="tab-tienda" type="button" role="tab" data-vista="tienda" aria-selected="true">Tienda</button>
      <button class="nav-link" id="tab-pedidos" type="button" role="tab" data-vista="pedidos" aria-selected="false" hidden>Pedidos</button>
      <button class="nav-link" id="tab-inventario" type="button" role="tab" data-vista="inventario" aria-selected="false" hidden>Inventario</button>
      <button class="nav-link" id="tab-administracion" type="button" role="tab" data-vista="administracion" aria-selected="false" hidden>Administración</button>
      <button class="nav-link" id="tab-consultas" type="button" role="tab" data-vista="consultas" aria-selected="false" hidden>Consultas</button>
      <button class="nav-link" id="tab-soporte" type="button" role="tab" data-vista="soporte" aria-selected="false" hidden>Atención</button>
      <button class="nav-link" id="tab-atencion" type="button" role="tab" data-vista="atencion" aria-selected="false" hidden>Mi atención</button>
    </nav>

    <!-- Migas de Pan (Breadcrumbs) SPA (RF-02, RF-07) -->
    <nav id="contenedor-breadcrumbs" class="store-breadcrumbs mb-3" aria-label="Migas de pan" hidden>
      <ol class="breadcrumb mb-0" id="lista-breadcrumbs"></ol>
    </nav>

    <!-- Vista Detalle de Producto Individual (RF-07) -->
    <div id="vista-detalle-producto" class="modulo-vista" hidden></div>

    <!-- Vista 404 (Página o Producto No Encontrado) -->
    <div id="vista-404" class="modulo-vista text-center py-5" hidden>
      <div class="view-404-card card p-5 mx-auto shadow-sm card-404-max">
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
        ${heroHtml}

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
        <section class="home-cta-banner card border-0 p-4 p-md-5 text-center text-white mb-4 shadow-sm">
          <div class="mx-auto home-cta-wrap">
            <span class="badge mb-2 text-uppercase fw-bold home-cta-badge">Todo nuestro inventario</span>
            <h3 class="h2 fw-bold mb-2">¿Buscas algo específico?</h3>
            <p class="text-white-50 mb-4 fs-6">Explora nuestro catálogo completo de periféricos, componentes de hardware y accesorios con filtros por categoría, precio y stock en tiempo real.</p>
            <a href="#/catalogo" class="btn btn-light btn-lg px-4 py-2 fw-bold text-primary shadow-sm d-inline-flex align-items-center gap-2 rounded-pill">
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
                <input id="nombre-producto" class="form-control" type="text" required maxlength="120">
              </div>

              <div class="col-12 col-md-3">
                <label for="categoria-producto" class="form-label">Categoría</label>
                <select id="categoria-producto" class="form-select" required>
                  <option value="">Selecciona una categoría</option>
                </select>
              </div>

              <div class="col-12 col-md-2">
                <label for="precio-producto" class="form-label">Precio (S/)</label>
                <input id="precio-producto" class="form-control" type="number" min="0.01" step="0.01" required>
              </div>

              <div class="col-12 col-md-2">
                <label for="stock-producto" class="form-label">Stock inicial</label>
                <input id="stock-producto" class="form-control" type="number" min="0" step="1" required>
              </div>

              <div class="col-12 col-md-2 d-flex align-items-end">
                <button class="btn btn-primary w-100" type="submit">Agregar</button>
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
                <div class="input-group input-group-sm catalog-price-input-group">
                  <span class="input-group-text py-1 px-2 text-muted">S/</span>
                  <input id="precio-min" class="form-control form-control-sm" type="number" min="0" step="0.01" placeholder="Mín" aria-label="Precio mínimo en soles">
                </div>
                <span class="text-muted small">&ndash;</span>
                <div class="input-group input-group-sm catalog-price-input-group">
                  <span class="input-group-text py-1 px-2 text-muted">S/</span>
                  <input id="precio-max" class="form-control form-control-sm" type="number" min="0" step="0.01" placeholder="Máx" aria-label="Precio máximo en soles">
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

    <!-- Vista Soporte (spec 006): bandejas de reclamos y devoluciones -->
    <div id="vista-soporte" class="modulo-vista" hidden></div>

    <!-- Vista Mi atención del cliente (spec 007, T012) -->
    <div id="vista-atencion" class="modulo-vista" hidden></div>

    <!-- Offcanvas Lateral: Carrito de Compras -->
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
  `;
}
