const heroBanner = new URL('../assets/banner-retail.png', import.meta.url).href;
const tecladoImage = new URL('../assets/teclado.png', import.meta.url).href;
const mouseImage = new URL('../assets/mouse.png', import.meta.url).href;
const cargadorImage = new URL('../assets/cargador.png', import.meta.url).href;
const mouseRazerImage = new URL('../assets/mouse-razer.png', import.meta.url).href;
const tarjetaNvidiaImage = new URL('../assets/tarjeta-video-nvidia.png', import.meta.url).href;

/**
 * Renderiza el bloque visual de portada comercial (Hero Bento Grid,
 * banners promocionales y barra de confianza/garantía).
 *
 * @returns {string} Markup HTML del Hero
 */
export function renderizarHero() {
  return `
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
                  <img src="${heroBanner}" alt="Colección de tecnología y periféricos" class="hero-slide-img-banner">
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
                  <img src="${tecladoImage}" alt="Teclado mecánico gamer" class="hero-slide-img-keyboard">
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
                  <img src="${mouseImage}" alt="Mouse de alta precisión" class="hero-slide-img-mouse">
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
          <span class="badge bg-white text-primary fw-bold mb-2 text-uppercase hero-badge-student">Exclusivo Estudiantes</span>
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
          <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </span>
          <div>
            <strong class="d-block small text-dark fw-bold">Envío a todo el país</strong>
            <span class="d-block fw-semibold trust-badge-sub">Rápido y asegurado</span>
          </div>
        </div>
        <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
          <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
          </span>
          <div>
            <strong class="d-block small text-dark fw-bold">Garantía oficial</strong>
            <span class="d-block fw-semibold trust-badge-sub">12 meses de cobertura</span>
          </div>
        </div>
        <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
          <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </span>
          <div>
            <strong class="d-block small text-dark fw-bold">Pago 100% seguro</strong>
            <span class="d-block fw-semibold trust-badge-sub">Transacciones cifradas</span>
          </div>
        </div>
        <div class="col-6 col-lg-3 d-flex align-items-center gap-2">
          <span class="trust-badge-icon bg-primary-subtle text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </span>
          <div>
            <strong class="d-block small text-dark fw-bold">Soporte experto</strong>
            <span class="d-block fw-semibold trust-badge-sub">Consultas en vivo</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  `;
}
