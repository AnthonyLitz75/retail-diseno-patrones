/**
 * Módulo de resolución de imágenes oficiales de productos para Píxel Andino.
 * Mapea los 32 productos del catálogo a sus imágenes fotográficas oficiales en /img/productos/.
 */

export const MAPA_IMAGENES_POR_SKU = {
  "PA-0001": "/img/productos/teclado-redragon-k617.webp",
  "PA-0002": "/img/productos/teclado-logitech-g413.webp",
  "PA-0003": "/img/productos/teclado-logitech-k380.webp",
  "PA-0004": "/img/productos/teclado-hyperx-alloy-origins-core-clean.webp",
  "PA-0005": "/img/productos/mouse-logitech-g203.webp",
  "PA-0006": "/img/productos/mouse-logitech-m170.webp",
  "PA-0007": "/img/productos/mouse-logitech-lift.webp",
  "PA-0008": "/img/productos/mouse-razer-deathadder-essential.webp",
  "PA-0009": "/img/productos/auriculares-hyperx-cloud-stinger-core.webp",
  "PA-0010": "/img/productos/auriculares-jbl-tune-520bt.webp",
  "PA-0011": "/img/productos/parlante-jbl-go-4.webp",
  "PA-0012": "/img/productos/webcam-logitech-c920.webp",
  "PA-0013": "/img/productos/webcam-logitech-c270.webp",
  "PA-0014": "/img/productos/webcam-logitech-c922.webp",
  "PA-0015": "/img/productos/cargador-anker-20w.webp",
  "PA-0016": "/img/productos/cargador-anker-65w-gan.webp",
  "PA-0017": "/img/productos/cable-baseus-usbc-18m.webp",
  "PA-0018": "/img/productos/mousepad-redragon-xl.webp",
  "PA-0019": "/img/productos/hub-baseus-7en1.webp",
  "PA-0020": "/img/productos/soporte-ugreen-laptop.webp",
  "PA-0021": "/img/productos/kit-limpieza-pantallas.webp",
  "PA-0022": "/img/productos/procesador-amd-ryzen-5-5600.webp",
  "PA-0023": "/img/productos/procesador-intel-i5-12400f.webp",
  "PA-0024": "/img/productos/procesador-amd-ryzen-7-5700x.webp",
  "PA-0025": "/img/productos/ram-kingston-fury-beast-16gb-ddr4.webp",
  "PA-0026": "/img/productos/ram-corsair-vengeance-lpx-16gb.webp",
  "PA-0027": "/img/productos/ram-kingston-fury-beast-16gb-ddr5.webp",
  "PA-0028": "/img/productos/ssd-kingston-nv2-1tb.webp",
  "PA-0029": "/img/productos/ssd-wd-blue-sa510-500gb.webp",
  "PA-0030": "/img/productos/hdd-seagate-barracuda-2tb.webp",
  "PA-0031": "/img/productos/gpu-asus-rtx-4060-dual.webp",
  "PA-0032": "/img/productos/gpu-sapphire-rx-7600-pulse.webp",
};

/**
 * Normaliza un texto para búsqueda flexible de nombres de producto.
 * @param {string} texto
 * @returns {string}
 */
export function normalizarNombre(texto = "") {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export const MAPA_IMAGENES_POR_NOMBRE_NORM = {
  [normalizarNombre("Teclado mecánico 60% RGB Fizz K617")]: "/img/productos/teclado-redragon-k617.webp",
  [normalizarNombre("Teclado mecánico TKL G413 TKL SE")]: "/img/productos/teclado-logitech-g413.webp",
  [normalizarNombre("Teclado inalámbrico multidispositivo K380")]: "/img/productos/teclado-logitech-k380.webp",
  [normalizarNombre("Teclado mecánico Alloy Origins Core")]: "/img/productos/teclado-hyperx-alloy-origins-core-clean.webp",
  [normalizarNombre("Mouse gamer G203 Lightsync")]: "/img/productos/mouse-logitech-g203.webp",
  [normalizarNombre("Mouse inalámbrico M170")]: "/img/productos/mouse-logitech-m170.webp",
  [normalizarNombre("Mouse ergonómico vertical Lift")]: "/img/productos/mouse-logitech-lift.webp",
  [normalizarNombre("Mouse gamer DeathAdder Essential")]: "/img/productos/mouse-razer-deathadder-essential.webp",
  [normalizarNombre("Auriculares gamer Cloud Stinger Core")]: "/img/productos/auriculares-hyperx-cloud-stinger-core.webp",
  [normalizarNombre("Auriculares inalámbricos Tune 520BT")]: "/img/productos/auriculares-jbl-tune-520bt.webp",
  [normalizarNombre("Parlante Bluetooth portátil Go 4")]: "/img/productos/parlante-jbl-go-4.webp",
  [normalizarNombre("Webcam Full HD C920 HD Pro")]: "/img/productos/webcam-logitech-c920.webp",
  [normalizarNombre("Webcam HD C270")]: "/img/productos/webcam-logitech-c270.webp",
  [normalizarNombre("Webcam Full HD C922 Pro Stream")]: "/img/productos/webcam-logitech-c922.webp",
  [normalizarNombre("Cargador de pared 20 W USB-C")]: "/img/productos/cargador-anker-20w.webp",
  [normalizarNombre("Cargador de pared 20W USB-C")]: "/img/productos/cargador-anker-20w.webp",
  [normalizarNombre("Cargador GaN 65 W de 3 puertos")]: "/img/productos/cargador-anker-65w-gan.webp",
  [normalizarNombre("Cable USB-C a USB-C de 1,8 m")]: "/img/productos/cable-baseus-usbc-18m.webp",
  [normalizarNombre("Mousepad gamer XL 900x400 mm")]: "/img/productos/mousepad-redragon-xl.webp",
  [normalizarNombre("Hub USB-C 7 en 1")]: "/img/productos/hub-baseus-7en1.webp",
  [normalizarNombre("Soporte de aluminio ajustable para laptop")]: "/img/productos/soporte-ugreen-laptop.webp",
  [normalizarNombre("Kit de limpieza para pantallas y teclados")]: "/img/productos/kit-limpieza-pantallas.webp",
  [normalizarNombre("Procesador AMD Ryzen 5 5600")]: "/img/productos/procesador-amd-ryzen-5-5600.webp",
  [normalizarNombre("Procesador Intel Core i5-12400F")]: "/img/productos/procesador-intel-i5-12400f.webp",
  [normalizarNombre("Procesador AMD Ryzen 7 5700X")]: "/img/productos/procesador-amd-ryzen-7-5700x.webp",
  [normalizarNombre("Memoria RAM Fury Beast 16 GB DDR4 3200 MHz")]: "/img/productos/ram-kingston-fury-beast-16gb-ddr4.webp",
  [normalizarNombre("Kit de memoria RAM Vengeance LPX 16 GB (2x8) DDR4 3200 MHz")]: "/img/productos/ram-corsair-vengeance-lpx-16gb.webp",
  [normalizarNombre("Memoria RAM Fury Beast 16 GB DDR5 5200 MHz")]: "/img/productos/ram-kingston-fury-beast-16gb-ddr5.webp",
  [normalizarNombre("SSD NV2 1 TB NVMe M.2")]: "/img/productos/ssd-kingston-nv2-1tb.webp",
  [normalizarNombre("SSD Blue SA510 500 GB SATA")]: "/img/productos/ssd-wd-blue-sa510-500gb.webp",
  [normalizarNombre("Disco duro BarraCuda 2 TB")]: "/img/productos/hdd-seagate-barracuda-2tb.webp",
  [normalizarNombre("Tarjeta de video GeForce RTX 4060 Dual 8 GB")]: "/img/productos/gpu-asus-rtx-4060-dual.webp",
  [normalizarNombre("Tarjeta de video Radeon RX 7600 Pulse 8 GB")]: "/img/productos/gpu-sapphire-rx-7600-pulse.webp",
};

/**
 * Resuelve la ruta canónica de la imagen fotográfica para un producto.
 * @param {object|string} productoOIdentificador - Objeto producto o nombre/SKU
 * @returns {string|null} - Ruta de la imagen fotográfica o null si no se identifica
 */
export function resolverRutaImagenOficial(productoOIdentificador) {
  if (!productoOIdentificador) return null;

  // Si es un objeto producto
  if (typeof productoOIdentificador === "object") {
    if (productoOIdentificador.imagen && typeof productoOIdentificador.imagen === "string" && productoOIdentificador.imagen.trim()) {
      return productoOIdentificador.imagen.trim();
    }
    if (productoOIdentificador.sku && MAPA_IMAGENES_POR_SKU[productoOIdentificador.sku]) {
      return MAPA_IMAGENES_POR_SKU[productoOIdentificador.sku];
    }
    if (productoOIdentificador.nombre) {
      const norm = normalizarNombre(productoOIdentificador.nombre);
      if (MAPA_IMAGENES_POR_NOMBRE_NORM[norm]) {
        return MAPA_IMAGENES_POR_NOMBRE_NORM[norm];
      }
    }
    return null;
  }

  // Si es un string (SKU o Nombre)
  if (typeof productoOIdentificador === "string") {
    const ident = productoOIdentificador.trim();
    if (MAPA_IMAGENES_POR_SKU[ident]) {
      return MAPA_IMAGENES_POR_SKU[ident];
    }
    const norm = normalizarNombre(ident);
    if (MAPA_IMAGENES_POR_NOMBRE_NORM[norm]) {
      return MAPA_IMAGENES_POR_NOMBRE_NORM[norm];
    }
  }

  return null;
}
