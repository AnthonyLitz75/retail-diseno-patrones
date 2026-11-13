/**
 * Generador de siluetas de carga (Skeleton Loaders) para el catálogo de productos.
 * Proporciona una experiencia de carga suave y accesible con efecto shimmer animado.
 */

/**
 * Genera el marcado HTML para una cantidad dada de tarjetas esqueleto.
 * @param {number} cantidad Número de tarjetas a renderizar (por defecto 8).
 * @returns {string} Marcado HTML con las tarjetas de esqueleto.
 */
export function generarSkeletonCards(cantidad = 8) {
  const tarjetas = [];
  for (let i = 0; i < cantidad; i++) {
    tarjetas.push(`
      <article class="skeleton-card card border-0 shadow-sm" aria-hidden="true">
        <div class="skeleton-shimmer skeleton-visual"></div>
        <div class="card-body p-3 d-flex flex-column gap-2">
          <div class="d-flex justify-content-between align-items-center">
            <div class="skeleton-shimmer skeleton-badge" style="width: 38%; height: 1.25rem;"></div>
            <div class="skeleton-shimmer skeleton-badge" style="width: 28%; height: 1.25rem;"></div>
          </div>
          <div class="skeleton-shimmer skeleton-title mt-1" style="width: 85%; height: 1.2rem;"></div>
          <div class="skeleton-shimmer skeleton-subtitle" style="width: 55%; height: 0.9rem;"></div>
          <div class="d-flex justify-content-between align-items-baseline mt-2">
            <div class="skeleton-shimmer skeleton-price" style="width: 42%; height: 1.6rem;"></div>
            <div class="skeleton-shimmer skeleton-stock" style="width: 32%; height: 1rem;"></div>
          </div>
          <div class="skeleton-shimmer skeleton-btn w-100 mt-2" style="height: 2.35rem; border-radius: 0.7rem;"></div>
        </div>
      </article>
    `);
  }
  return tarjetas.join("");
}
