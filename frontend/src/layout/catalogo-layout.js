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
  <main id="contenido-principal" class="container py-4 storefront" tabindex="-1">
    <nav id="navegacion-modulos" class="nav nav-pills modulo-tabs mb-4 gap-2 flex-wrap" role="tablist" aria-label="Módulos de la tienda" hidden>
      <button class="nav-link active" id="tab-tienda" type="button" role="tab" data-vista="tienda" aria-selected="true">Tienda</button>
      <button class="nav-link" id="tab-productos" type="button" role="tab" data-vista="productos" aria-selected="false" hidden>Productos</button>
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

        <!-- Boceto "Inicio": accesos directos a cada categoría (se muestra al cargar el árbol) -->
        <section id="seccion-compra-categoria" class="mb-5" aria-labelledby="titulo-compra-categoria" hidden>
          <h2 id="titulo-compra-categoria" class="section-title mb-3">COMPRA POR CATEGORÍA</h2>
          <nav id="chips-categorias-inicio" class="chips-categorias" aria-label="Categorías de la tienda"></nav>
        </section>

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
            <p id="resumen-catalogo-inicio" class="text-white-50 small mt-3 mb-0"></p>
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
          <p id="estado-catalogo" class="fw-bold text-dark small mb-0" role="status">Cargando productos...</p>
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
                <thead><tr><th scope="col">Fecha</th><th scope="col">Producto</th><th scope="col">Movimiento</th><th scope="col">Motivo</th><th scope="col">Responsable</th><th scope="col" class="text-end">Cantidad</th></tr></thead>
                <tbody id="lista-movimientos"></tbody>
              </table>
            </div>
            <nav id="paginacion-movimientos" class="d-flex align-items-center justify-content-end gap-2 mt-2" aria-label="Páginas de movimientos" hidden></nav>
          </section>
        </div>
      </section>
    </div>

    <!-- Vista Productos del personal (boceto "Panel de personal - productos"): tabla y alta de productos -->
    <div id="vista-productos" class="modulo-vista" hidden>
    <section id="seccion-gestion-productos" class="card shadow-sm mb-4" aria-labelledby="titulo-formulario">
      <div class="card-body">
        <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div>
            <h2 id="titulo-formulario" class="h4 mb-1">Productos</h2>
            <p id="resumen-gestion-productos" class="small text-secondary mb-0">Publica, edita, ajusta o reactiva los productos del catálogo.</p>
          </div>
          <button id="boton-nuevo-producto" class="btn btn-primary" type="button"
                  aria-expanded="false" aria-controls="panel-nuevo-producto">+ Nuevo producto</button>
        </div>

        <div id="panel-nuevo-producto" class="nuevo-producto mt-3" hidden>
          <h3 class="h5 mb-1">Nuevo producto</h3>
          <p class="small text-secondary">Completa la ficha para publicarlo en la tienda. Los campos con <span class="text-danger">*</span> son obligatorios.</p>

          <form id="form-producto" class="row g-3" novalidate>
            <div class="col-12 col-lg-8 d-grid gap-3">
              <fieldset class="nuevo-producto-grupo">
                <legend>Información básica</legend>
                <p class="nuevo-producto-ayuda">Datos con los que el cliente identificará el producto.</p>
                <div class="row g-3">
                  <div class="col-12 col-md-6">
                    <label for="sku-producto" class="form-label">Código del producto</label>
                    <input id="sku-producto" class="form-control text-uppercase" type="text" maxlength="30"
                           placeholder="PA-0033" autocomplete="off" aria-describedby="ayuda-sku-producto">
                    <div id="ayuda-sku-producto" class="form-text">Opcional y único. Si lo dejas vacío se genera al guardar.</div>
                    <div class="invalid-feedback" data-campo="sku"></div>
                  </div>
                  <div class="col-12 col-md-6">
                    <label for="marca-producto" class="form-label">Marca</label>
                    <input id="marca-producto" class="form-control" type="text" maxlength="80" placeholder="Ej.: Logitech">
                    <div class="invalid-feedback" data-campo="marca"></div>
                  </div>
                  <div class="col-12">
                    <label for="nombre-producto" class="form-label">Nombre <span class="text-danger">*</span></label>
                    <input id="nombre-producto" class="form-control" type="text" required maxlength="120"
                           placeholder="Ej.: Teclado mecánico 60% RGB">
                    <div class="invalid-feedback" data-campo="nombre"></div>
                  </div>
                  <div class="col-12">
                    <label for="categoria-producto" class="form-label">Categoría <span class="text-danger">*</span></label>
                    <select id="categoria-producto" class="form-select" required aria-describedby="ayuda-categoria-producto">
                      <option value="">Selecciona una categoría</option>
                    </select>
                    <div id="ayuda-categoria-producto" class="form-text">Las categorías desactivadas no aparecen en la lista.</div>
                    <div class="invalid-feedback" data-campo="categoria"></div>
                  </div>
                  <div class="col-12">
                    <label for="descripcion-producto" class="form-label">Descripción</label>
                    <textarea id="descripcion-producto" class="form-control" rows="3" maxlength="1000"
                              placeholder="Describe el producto en 2 o 3 frases."></textarea>
                    <div class="invalid-feedback" data-campo="descripcion"></div>
                  </div>
                </div>
              </fieldset>

              <fieldset class="nuevo-producto-grupo">
                <legend>Imagen</legend>
                <p class="nuevo-producto-ayuda">Fondo blanco y encuadre uniforme para que todas las tarjetas se vean iguales.</p>
                <label for="imagen-producto" class="form-label">Dirección (URL) de la imagen</label>
                <input id="imagen-producto" class="form-control" type="url" maxlength="255"
                       placeholder="https://… o /img/productos/…" aria-describedby="ayuda-imagen-producto">
                <div id="ayuda-imagen-producto" class="form-text">Formatos JPG, PNG o WebP. Sin imagen se usa una ilustración de la categoría.</div>
                <div class="invalid-feedback" data-campo="imagen"></div>
              </fieldset>

              <fieldset class="nuevo-producto-grupo">
                <legend>Precio e inventario</legend>
                <p class="nuevo-producto-ayuda">Importes en soles con dos decimales.</p>
                <div class="row g-3">
                  <div class="col-12 col-md-4">
                    <label for="precio-producto" class="form-label">Precio (S/) <span class="text-danger">*</span></label>
                    <input id="precio-producto" class="form-control" type="number" min="0.01" step="0.01" required inputmode="decimal">
                    <div class="invalid-feedback" data-campo="precio"></div>
                  </div>
                  <div class="col-12 col-md-4">
                    <label for="precio-anterior-producto" class="form-label">Precio anterior (S/)</label>
                    <input id="precio-anterior-producto" class="form-control" type="number" min="0.01" step="0.01"
                           inputmode="decimal" aria-describedby="ayuda-precio-anterior-producto">
                    <div id="ayuda-precio-anterior-producto" class="form-text">Opcional. Si es mayor que el precio, se muestra como descuento.</div>
                    <div class="invalid-feedback" data-campo="precioAnterior"></div>
                  </div>
                  <div class="col-12 col-md-4">
                    <label for="stock-producto" class="form-label">Stock de apertura <span class="text-danger">*</span></label>
                    <input id="stock-producto" class="form-control" type="number" min="0" step="1" required inputmode="numeric">
                    <div class="invalid-feedback" data-campo="stock"></div>
                  </div>
                </div>
                <p class="alert alert-info small mt-3 mb-0">
                  El stock de apertura se registra automáticamente como un movimiento de <strong>ENTRADA</strong> en el kardex.
                  Después, cualquier corrección se hace con «Ajustar stock» indicando el motivo.
                </p>
              </fieldset>
            </div>

            <div class="col-12 col-lg-4 d-grid gap-3 align-content-start">
              <section class="nuevo-producto-grupo" aria-labelledby="titulo-publicacion">
                <h4 id="titulo-publicacion" class="nuevo-producto-titulo">Publicación</h4>
                <div class="form-check mb-3">
                  <input id="nuevo-producto" class="form-check-input" type="checkbox">
                  <label for="nuevo-producto" class="form-check-label">
                    Marcar como Nuevo
                    <span class="d-block small text-secondary">Aparece en el carrusel de nuevos productos.</span>
                  </label>
                </div>
                <p class="small text-secondary">El producto se publica activo: los clientes lo ven en la tienda.</p>
                <div class="d-grid gap-2">
                  <button class="btn btn-primary" type="submit">Publicar producto</button>
                  <button id="cancelar-nuevo-producto" class="btn btn-outline-secondary" type="button">Cancelar</button>
                </div>
              </section>

              <section class="nuevo-producto-grupo" aria-labelledby="titulo-vista-previa">
                <h4 id="titulo-vista-previa" class="nuevo-producto-titulo">Vista previa</h4>
                <p class="nuevo-producto-ayuda">Así se verá la tarjeta en la tienda.</p>
                <div id="vista-previa-producto" class="nuevo-producto-vista-previa" inert aria-hidden="true"></div>
              </section>

              <p class="alert alert-warning small mb-0">
                <strong>Recuerda:</strong> si cambias el precio después de una venta, los pedidos anteriores conservan el precio con el que se compraron.
              </p>
            </div>
          </form>
        </div>

        <p id="resultado-formulario" class="mt-3 mb-0" role="status"></p>
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
    <div id="seccion-carrito" class="offcanvas offcanvas-end" tabindex="-1" aria-labelledby="titulo-carrito" data-foco-respaldo="#enlace-carrito-nav">
      <div class="offcanvas-header border-bottom py-3">
        <div class="d-flex align-items-center gap-2">
          <h2 id="titulo-carrito" class="offcanvas-title h5 mb-0 fw-bold">Mi carrito</h2>
          <span id="cart-drawer-count" class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">0 items</span>
        </div>
        <button type="button" class="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Cerrar carrito"></button>
      </div>
      <div class="offcanvas-body d-flex flex-column p-3">
        <!-- Pasos del checkout (boceto "Confirmar compra"): Carrito → Entrega y pago → Confirmación -->
        <ol id="checkout-pasos" class="checkout-pasos" aria-label="Pasos de la compra">
          <li data-paso="carrito" aria-current="step"><span class="checkout-paso-numero">1</span><span class="checkout-paso-texto">Carrito</span></li>
          <li data-paso="entrega"><span class="checkout-paso-numero">2</span><span class="checkout-paso-texto">Entrega y pago</span></li>
          <li data-paso="confirmacion"><span class="checkout-paso-numero">3</span><span class="checkout-paso-texto">Confirmación</span></li>
        </ol>
        <p id="estado-carrito" class="small mb-2" role="status" aria-live="polite"></p>

        <!-- Paso 1: Carrito -->
        <section id="checkout-paso-carrito" class="checkout-paso d-flex flex-column flex-grow-1" aria-label="Paso 1: carrito">
          <ul id="productos-carrito" class="list-group list-group-flush flex-grow-1 overflow-y-auto mb-3"></ul>
          <div class="cart-drawer-footer border-top pt-3 mt-auto">
            <div class="cart-order-summary bg-light rounded-3 p-3 mb-3 border">
              <div class="d-flex justify-content-between align-items-center small text-secondary mb-1">
                <span>Envío nacional:</span>
                <span class="text-success fw-semibold">Gratis</span>
              </div>
              <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                <span class="fw-bold text-dark">Total:</span>
                <span id="total-carrito" class="fs-5 fw-bold text-primary">S/ 0.00</span>
              </div>
            </div>
            <button id="continuar-checkout" class="btn btn-primary w-100 py-2 fw-semibold" type="button" disabled>
              <span id="continuar-checkout-texto">Continuar con la entrega</span>
            </button>
            <p class="small text-secondary text-center mt-2 mb-0">Tu carrito no reserva stock: la disponibilidad se vuelve a validar al confirmar.</p>
          </div>
        </section>

        <!-- Paso 2: Entrega y pago -->
        <section id="checkout-paso-entrega" class="checkout-paso d-flex flex-column flex-grow-1" aria-label="Paso 2: entrega y pago" hidden>
          <div class="flex-grow-1 overflow-y-auto">
            <h3 class="h6 fw-bold mb-2">Dirección de entrega</h3>
            <div class="mb-2">
              <label for="checkout-destinatario" class="form-label small fw-semibold mb-1 text-secondary">Destinatario</label>
              <input id="checkout-destinatario" class="form-control form-control-sm" type="text" maxlength="120" autocomplete="name" placeholder="Nombre de quien recibe (opcional)">
            </div>
            <div class="mb-3">
              <label for="checkout-direccion" class="form-label small fw-semibold mb-1 text-secondary">Dirección</label>
              <input id="checkout-direccion" class="form-control form-control-sm" type="text" maxlength="250" autocomplete="street-address" placeholder="Calle, número y distrito (opcional)">
            </div>

            <fieldset class="mb-3">
              <legend class="h6 fw-bold mb-2">Método de pago</legend>
              <p class="alert alert-warning py-2 small mb-2">Pago simulado de la demo: no se solicitan tarjetas ni se cobra dinero real.</p>
              <label class="checkout-metodo">
                <input class="form-check-input" type="radio" name="checkout-metodo-pago" value="PRUEBA_APROBADA" checked>
                <span><strong class="d-block">Pago de prueba aprobado</strong><span class="small text-secondary">La compra se registra y el pago queda APROBADO.</span></span>
              </label>
              <label class="checkout-metodo">
                <input class="form-check-input" type="radio" name="checkout-metodo-pago" value="PRUEBA_RECHAZADA">
                <span><strong class="d-block">Pago de prueba rechazado</strong><span class="small text-secondary">Para probar qué ocurre cuando el pago falla: no se crea el pedido.</span></span>
              </label>
            </fieldset>

            <h3 class="h6 fw-bold mb-2">Tu pedido</h3>
            <ul id="checkout-resumen" class="list-unstyled small mb-0"></ul>
          </div>
          <div class="cart-drawer-footer border-top pt-3 mt-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="fw-bold text-dark">Total a pagar:</span>
              <span id="checkout-total" class="fs-5 fw-bold text-primary">S/ 0.00</span>
            </div>
            <button id="confirmar-compra" class="btn btn-success w-100 py-2 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-sm" type="button" disabled>
              <span id="confirmar-compra-spinner" class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
              <span id="confirmar-compra-texto">Confirmar y pagar</span>
            </button>
            <p class="small text-secondary text-center mt-2 mb-0">
              Si haces clic dos veces por error, la compra no se duplica.
              <button id="volver-carrito" class="btn btn-link btn-sm p-0 align-baseline" type="button">Volver al carrito</button>
            </p>
          </div>
        </section>

        <!-- Paso 3: Confirmación (boceto "Compra confirmada") -->
        <section id="checkout-paso-confirmacion" class="checkout-paso flex-grow-1" aria-label="Paso 3: confirmación" tabindex="-1" hidden></section>
      </div>
    </div>
  </main>
  `;
}
