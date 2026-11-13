/**
 * Módulo de resolución inteligente y declarativa de imágenes de productos.
 * Reemplaza cadenas anidadas de if/else por una tabla declarativa de reglas
 * con priorización: imagen oficial -> URL directa -> reglas temáticas -> placeholder.
 */

import { resolverRutaImagenOficial } from "./imagenes-productos.js";

/**
 * Tabla declarativa de reglas para asignación de imágenes temáticas de hardware.
 */
export const REGLAS_FALLBACK_IMAGEN = [
  {
    palabras: ["mouse", "ratón"],
    categorias: ["mouse"],
    obtenerImagen: () => new URL("../assets/mouse.webp", import.meta.url).href,
  },
  {
    palabras: ["teclado"],
    categorias: ["teclados", "teclado"],
    obtenerImagen: () => new URL("../assets/teclado.webp", import.meta.url).href,
  },
  {
    palabras: ["cargador", "cable", "adaptador"],
    categorias: ["cargador", "accesorios"],
    obtenerImagen: () => new URL("../assets/cargador.webp", import.meta.url).href,
  },
  {
    palabras: ["webcam", "cámara", "camara"],
    categorias: ["cámaras", "camaras", "cámara", "camara"],
    obtenerImagen: () => new URL("../assets/webcam.webp", import.meta.url).href,
  },
  {
    palabras: ["tarjeta", "video", "radeon", "geforce", "rtx", "rx"],
    categorias: ["tarjeta", "gpu", "video"],
    obtenerImagen: () => "/img/productos/gpu-default.svg",
  },
  {
    palabras: ["procesador", "ryzen", "intel", "core i"],
    categorias: ["procesador", "cpu"],
    obtenerImagen: () => "/img/productos/cpu-default.svg",
  },
  {
    palabras: ["ram", "fury", "memoria"],
    categorias: ["ram", "memoria"],
    obtenerImagen: () => "/img/productos/ram-default.svg",
  },
  {
    palabras: ["ssd", "nvme", "almacenamiento", "disco"],
    categorias: ["almacenamiento", "ssd", "disco"],
    obtenerImagen: () => "/img/productos/ssd-default.svg",
  },
  {
    palabras: ["auricular", "audífono", "audifono", "headset", "tune"],
    categorias: ["audio", "auriculares"],
    obtenerImagen: () => "/img/productos/audio-default.svg",
  },
];

export const IMAGEN_PLACEHOLDER_DEFECTO = "/img/productos/placeholder.svg";

/**
 * Resuelve la mejor imagen para un producto de acuerdo a su metadato, SKU, nombre o categoría.
 *
 * @param {object} producto - Objeto del producto
 * @returns {string} Ruta o URL de la imagen resuelta
 */
export function resolverImagenProducto(producto) {
  if (!producto) {
    return IMAGEN_PLACEHOLDER_DEFECTO;
  }

  // 1. Imagen fotográfica oficial resuelta por catálogo canónico (SKU o nombre exacto)
  const imagenOficial = resolverRutaImagenOficial(producto);
  if (imagenOficial) {
    return imagenOficial;
  }

  // 2. Si producto.imagen es URL absoluta o relativa válida
  if (
    typeof producto.imagen === "string" &&
    (producto.imagen.startsWith("http://") ||
      producto.imagen.startsWith("https://") ||
      producto.imagen.startsWith("/img/"))
  ) {
    return producto.imagen.trim();
  }

  // 3. Fallbacks temáticos evaluados mediante la tabla declarativa
  const nombreNorm = (producto.nombre || "").toLowerCase();
  const categoriaNorm = (producto.categoria || "").toLowerCase();

  const reglaCoincidente = REGLAS_FALLBACK_IMAGEN.find((regla) => {
    const coincideCategoria =
      Boolean(categoriaNorm) &&
      regla.categorias.some(
        (cat) => Boolean(cat) && (categoriaNorm.includes(cat) || cat.includes(categoriaNorm)),
      );
    const coincidePalabra = regla.palabras.some((palabra) =>
      nombreNorm.includes(palabra),
    );
    return coincideCategoria || coincidePalabra;
  });

  if (reglaCoincidente) {
    return reglaCoincidente.obtenerImagen();
  }

  return IMAGEN_PLACEHOLDER_DEFECTO;
}

/**
 * Asigna la imagen a un <img> y, si no carga, la reemplaza una sola vez por el
 * placeholder. Así nunca se muestra el texto alternativo partido en lugar de la foto.
 *
 * @param {HTMLImageElement} img - Elemento imagen
 * @param {string} url - Ruta resuelta de la imagen
 */
export function asignarImagenConRespaldo(img, url) {
  img.onerror = () => {
    img.onerror = null;
    img.src = IMAGEN_PLACEHOLDER_DEFECTO;
  };
  img.src = url || IMAGEN_PLACEHOLDER_DEFECTO;
}
