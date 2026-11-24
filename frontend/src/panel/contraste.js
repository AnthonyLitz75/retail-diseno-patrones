/**
 * @file contraste.js
 * Panel del personal (T12): relación de contraste WCAG 2.x a partir de la luminancia relativa.
 * Funciones puras; las usa la prueba que recorre los tokens de color del panel.
 */

const MAX_CANAL = 255;
const UMBRAL_LINEAL = 0.03928;

/**
 * Convierte un color CSS en { r, g, b, a }. Admite #rgb, #rrggbb, rgb() y rgba().
 * @param {string} color
 */
export function parsearColor(color) {
  const texto = String(color).trim().toLowerCase();
  const hex = texto.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (hex) {
    const digitos = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    return {
      r: parseInt(digitos.slice(0, 2), 16),
      g: parseInt(digitos.slice(2, 4), 16),
      b: parseInt(digitos.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = texto.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (rgb) return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]), a: rgb[4] === undefined ? 1 : Number(rgb[4]) };
  throw new TypeError(`Color no válido: ${color}`);
}

const aHex = ({ r, g, b }) => `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/** Color resultante de pintar un color (posiblemente translúcido) sobre un fondo opaco. */
export function colorSobreFondo(color, fondo) {
  const arriba = parsearColor(color);
  const abajo = parsearColor(fondo);
  const mezcla = (canal) => arriba[canal] * arriba.a + abajo[canal] * (1 - arriba.a);
  return aHex({ r: mezcla("r"), g: mezcla("g"), b: mezcla("b") });
}

function canalLineal(valor) {
  const c = valor / MAX_CANAL;
  return c <= UMBRAL_LINEAL ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminancia relativa WCAG de un color opaco (0 = negro, 1 = blanco). */
export function luminanciaRelativa(color) {
  const { r, g, b } = parsearColor(color);
  return 0.2126 * canalLineal(r) + 0.7152 * canalLineal(g) + 0.0722 * canalLineal(b);
}

/** Relación de contraste WCAG entre dos colores opacos (de 1 a 21). */
export function relacionContraste(colorA, colorB) {
  const a = luminanciaRelativa(colorA);
  const b = luminanciaRelativa(colorB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
