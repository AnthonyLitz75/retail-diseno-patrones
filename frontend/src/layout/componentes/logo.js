/**
 * Componente SVG para el logotipo oficial de Píxel Andino.
 * Genera el isotipo con IDs parametrizados para evitar duplicidad de identificadores
 * en el DOM entre la cabecera, pie de página o modales.
 */

/**
 * Genera el SVG del isotipo oficial con gradientes e IDs únicos.
 *
 * @param {object} [opciones={}]
 * @param {string} [opciones.prefijo='nav'] - Prefijo único para los IDs de gradientes
 * @param {number|string} [opciones.width=40] - Ancho del SVG
 * @param {number|string} [opciones.height=40] - Alto del SVG
 * @param {string} [opciones.className=''] - Clases CSS adicionales
 * @returns {string} Markup SVG
 */
export function renderizarLogoSvg({
  prefijo = 'nav',
  width = 40,
  height = 40,
  className = ''
} = {}) {
  const classAttr = className ? ` class="${className}"` : '';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${width}" height="${height}" fill="none"${classAttr} aria-hidden="true">
      <defs>
        <linearGradient id="${prefijo}-squircle-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0b132b" />
          <stop offset="50%" stop-color="#0f1d3f" />
          <stop offset="100%" stop-color="#080d1e" />
        </linearGradient>
        <linearGradient id="${prefijo}-squircle-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.6" />
          <stop offset="45%" stop-color="#007bff" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#0d47a1" stop-opacity="0.1" />
        </linearGradient>
        <linearGradient id="${prefijo}-p-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0052cc" />
          <stop offset="40%" stop-color="#0080ff" />
          <stop offset="100%" stop-color="#00f0ff" />
        </linearGradient>
        <linearGradient id="${prefijo}-peak-grad" x1="0%" y1="100%" x2="100%" y2="20%">
          <stop offset="0%" stop-color="#002255" />
          <stop offset="50%" stop-color="#0066cc" />
          <stop offset="100%" stop-color="#00e5ff" />
        </linearGradient>
        <linearGradient id="${prefijo}-pix-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00f0ff" />
          <stop offset="100%" stop-color="#00a8ff" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="94" height="94" rx="22" fill="url(#${prefijo}-squircle-bg)" stroke="url(#${prefijo}-squircle-border)" stroke-width="1.5" />
      <rect x="21" y="21" width="8" height="8" rx="2" fill="url(#${prefijo}-pix-cyan)" />
      <rect x="31" y="21" width="8" height="8" rx="2" fill="#00f0ff" />
      <rect x="21" y="31" width="8" height="8" rx="2" fill="#0066ff" />
      <path d="M 31 31 L 55 31 C 69 31 79 39 79 49 C 79 59 69 67 55 67 L 45 67 L 45 75.5 C 45 77.5 43.5 79 41.5 79 L 34.5 79 C 32.5 79 31 77.5 31 75.5 Z" fill="url(#${prefijo}-p-grad)" />
      <path d="M 45 42 L 54 42 C 61 42 66 45 66 49 C 66 53 61 56 54 56 L 45 56 Z" fill="#080d1e" />
      <path d="M 45 56 L 51 48 L 54 51 L 60 44 L 66 50 C 65 53 60 56 54 56 L 45 56 Z" fill="url(#${prefijo}-peak-grad)" />
      <path d="M 45 56 L 51 48 L 54 51 L 60 44 L 66 50" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="0.95" />
      <path d="M 60 44 L 62 56" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" stroke-opacity="0.4" />
    </svg>
  `.trim();
}
