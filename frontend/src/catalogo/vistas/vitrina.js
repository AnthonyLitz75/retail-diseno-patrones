/**
 * Módulo puro de distribución de productos para la Vitrina Comercial de Inicio (RF-04).
 *
 * Aplica reglas estrictas de negocio:
 * 1. Cero productos con stock <= 0 en los escaparates de vitrina.
 * 2. Cero productos repetidos entre secciones (prioridad: Destacados -> Nuevos -> Ofertas -> Componentes).
 * 3. Límites definidos: hasta 8 destacados, hasta 8 nuevos, hasta 8 ofertas, hasta 4 componentes.
 */

export const LIMITES_VITRINA = {
  MAX_DESTACADOS: 8,
  MAX_NUEVOS: 8,
  MAX_OFERTAS: 8,
  MAX_COMPONENTES: 4,
};

/**
 * Normaliza y distribuye los productos para las secciones del inicio sin duplicados.
 *
 * @param {Array<object>} productos - Catálogo completo de productos
 * @returns {{
 *   destacados: Array<object>,
 *   nuevos: Array<object>,
 *   ofertas: Array<object>,
 *   componentes: Array<object>,
 *   totalEnVitrina: number
 * }}
 */
export function distribuirProductosVitrina(productos) {
  if (!Array.isArray(productos) || productos.length === 0) {
    return {
      destacados: [],
      nuevos: [],
      ofertas: [],
      componentes: [],
      totalEnVitrina: 0,
    };
  }

  // 1. Filtrar únicamente productos disponibles con stock positivo
  const disponibles = productos.filter((p) => Number(p?.stock) > 0);
  const idsAsignados = new Set();

  // 2. Sección Destacados: hasta 8 productos (prioriza flag destacado o mejor ranking/precio)
  const destacados = [];
  for (const prod of disponibles) {
    if (destacados.length >= LIMITES_VITRINA.MAX_DESTACADOS) break;
    if (prod.destacado) {
      destacados.push(prod);
      idsAsignados.add(prod.id);
    }
  }

  // Si hay pocos destacados explícitos, completar con productos clave
  if (destacados.length < 4) {
    for (const prod of disponibles) {
      if (destacados.length >= LIMITES_VITRINA.MAX_DESTACADOS) break;
      if (!idsAsignados.has(prod.id) && !prod.nuevo) {
        destacados.push(prod);
        idsAsignados.add(prod.id);
      }
    }
  }

  // 3. Sección Nuevos Productos: hasta 8 productos con flag nuevo = true (sin repetir)
  const nuevos = [];
  for (const prod of disponibles) {
    if (nuevos.length >= LIMITES_VITRINA.MAX_NUEVOS) break;
    if (prod.nuevo && !idsAsignados.has(prod.id)) {
      nuevos.push(prod);
      idsAsignados.add(prod.id);
    }
  }

  // 4. Sección Ofertas Destacadas: hasta 8 productos con precioAnterior > precio (sin repetir)
  const ofertas = [];
  for (const prod of disponibles) {
    if (ofertas.length >= LIMITES_VITRINA.MAX_OFERTAS) break;
    const tieneDescuento =
      prod.precioAnterior && Number(prod.precioAnterior) > Number(prod.precio);
    if (tieneDescuento && !idsAsignados.has(prod.id)) {
      ofertas.push(prod);
      idsAsignados.add(prod.id);
    }
  }

  // 5. Sección Componentes para PC: fila de hasta 4 productos del rubro de hardware (sin repetir)
  const componentes = [];
  for (const prod of disponibles) {
    if (componentes.length >= LIMITES_VITRINA.MAX_COMPONENTES) break;
    const cat = String(prod.categoria || "").toLowerCase();
    const esHardware =
      cat.includes("componente") ||
      cat.includes("procesador") ||
      cat.includes("tarjeta") ||
      cat.includes("ram") ||
      cat.includes("almacenamiento") ||
      cat.includes("video");

    if (esHardware && !idsAsignados.has(prod.id)) {
      componentes.push(prod);
      idsAsignados.add(prod.id);
    }
  }

  const totalEnVitrina =
    destacados.length + nuevos.length + ofertas.length + componentes.length;

  return {
    destacados,
    nuevos,
    ofertas,
    componentes,
    totalEnVitrina,
  };
}
