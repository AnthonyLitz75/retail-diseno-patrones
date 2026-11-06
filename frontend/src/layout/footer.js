import { renderizarLogoSvg } from './componentes/logo.js';

const pagoVisa = new URL('../assets/pago-visa.jpg', import.meta.url).href;
const pagoMastercard = new URL('../assets/pago-mastercard.jpg', import.meta.url).href;
const pagoYape = new URL('../assets/pago-yape.png', import.meta.url).href;
const pagoPlin = new URL('../assets/pago-plin.avif', import.meta.url).href;

/**
 * Renderiza el pie de página principal con datos de contacto, enlaces de soporte,
 * medios de pago aceptados y acceso al Libro de Reclamaciones Virtual.
 *
 * @returns {string} Markup HTML del footer
 */
export function renderizarFooter() {
  const logoSvg = renderizarLogoSvg({ prefijo: 'footer', width: '100%', height: '100%' });

  return `
  <footer class="site-footer" role="contentinfo" aria-label="Pie de página de Píxel Andino">
    <div class="container py-5">
      <div class="row g-4 justify-content-between">
        <!-- Columna 1: Marca & Contacto -->
        <div class="col-12 col-md-6 col-lg-5">
          <div class="footer-brand d-inline-flex align-items-center gap-2 mb-3">
            <span class="site-brand-mark footer-brand-mark" aria-hidden="true">
              ${logoSvg}
            </span>
            <span class="site-brand-copy">
              <span class="site-brand-name text-white">PÍXEL <span class="site-brand-accent">ANDINO</span></span>
              <span class="site-brand-tagline">TECH STORE</span>
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
  `;
}
