/**
 * @file explorar.js
 * Ayudas para seguir explorando la tienda (bocetos del equipo): "Productos relacionados" en
 * el detalle, chips "Compra por categoría" en el inicio y el resumen "32 productos en 7
 * categorías" junto al enlace al catálogo. Todo sale de los datos que ya carga la tienda.
 */

import { generarSlug } from "../../router/parser-rutas.js";
import { formatoPrecio } from "../../utilidades/formato.js";
import { asignarImagenConRespaldo, resolverImagenProducto } from "../componentes/imagen-producto.js";

export const LIMITE_RELACIONADOS = 4;

const codigoDe = (producto) => producto.sku || `PA-${String(producto.id).padStart(4, "0")}`;

/**
 * Productos de la misma categoría, sin el actual: primero los que tienen stock y, entre
 * ellos, los de precio más parecido (alternativas reales a lo que el cliente mira).
 */
export function seleccionarRelacionados(producto, productos, limite = LIMITE_RELACIONADOS) {
  if (!producto || !Array.isArray(productos)) return [];
  const precio = Number(producto.precio) || 0;
  return productos
    .filter((otro) => otro && otro.id !== producto.id && otro.activo !== false
      && Boolean(producto.categoria) && otro.categoria === producto.categoria)
    .sort((a, b) => {
      const conStock = Number(b.stock > 0) - Number(a.stock > 0);
      if (conStock !== 0) return conStock;
      return Math.abs(Number(a.precio) - precio) - Math.abs(Number(b.precio) - precio);
    })
    .slice(0, limite);
}

/** Sección "Productos relacionados"; null si no hay ninguno (no se muestra un título vacío). */
export function crearSeccionRelacionados(relacionados) {
  if (!Array.isArray(relacionados) || relacionados.length === 0) return null;
  const seccion = document.createElement("section");
  seccion.className = "productos-relacionados mb-5";
  seccion.setAttribute("aria-labelledby", "titulo-relacionados");
  const titulo = document.createElement("h2");
  titulo.id = "titulo-relacionados";
  titulo.className = "section-title mb-3";
  titulo.textContent = "PRODUCTOS RELACIONADOS";
  const lista = document.createElement("ul");
  lista.className = "relacionados-grid list-unstyled mb-0";

  for (const producto of relacionados) {
    const item = document.createElement("li");
    const enlace = document.createElement("a");
    enlace.className = "relacionado-card";
    enlace.href = `#/producto/${codigoDe(producto)}`;
    const imagen = document.createElement("img");
    imagen.loading = "lazy";
    imagen.alt = "";
    asignarImagenConRespaldo(imagen, resolverImagenProducto(producto));
    const nombre = document.createElement("span");
    nombre.className = "relacionado-nombre";
    nombre.textContent = producto.nombre;
    const precio = document.createElement("span");
    precio.className = "relacionado-precio";
    precio.textContent = formatoPrecio(producto.precio);
    if (Number(producto.precioAnterior) > Number(producto.precio)) {
      const anterior = document.createElement("s");
      anterior.className = "relacionado-precio-anterior";
      anterior.textContent = formatoPrecio(producto.precioAnterior);
      precio.append(" ", anterior);
    }
    const stock = document.createElement("span");
    stock.className = `relacionado-stock ${producto.stock > 0 ? "" : "text-danger"}`;
    stock.textContent = producto.stock > 0 ? `En stock: ${producto.stock}` : "Agotado";
    enlace.append(imagen, nombre, precio, stock);
    item.append(enlace);
    lista.append(item);
  }
  seccion.append(titulo, lista);
  return seccion;
}

/**
 * Chips "Compra por categoría": las subcategorías (o la categoría si no tiene hijas), con
 * el enlace que entiende el router: #/categoria/padre/hija o #/categoria/raiz.
 * @param {Array<{nombre: string, totalProductos?: number, subcategorias?: Array}>} arbol
 */
export function enlacesCategorias(arbol) {
  if (!Array.isArray(arbol)) return [];
  const enlaces = [];
  for (const raiz of arbol) {
    const slugRaiz = generarSlug(raiz.nombre);
    const hijas = Array.isArray(raiz.subcategorias) ? raiz.subcategorias : [];
    if (hijas.length === 0) {
      enlaces.push({ nombre: raiz.nombre, href: `#/categoria/${slugRaiz}`, total: raiz.totalProductos ?? null });
      continue;
    }
    for (const hija of hijas) {
      enlaces.push({
        nombre: hija.nombre,
        href: `#/categoria/${slugRaiz}/${generarSlug(hija.nombre)}`,
        total: hija.totalProductos ?? null,
      });
    }
  }
  return enlaces.filter((enlace) => enlace.total == null || enlace.total > 0);
}

/** Pinta los chips en el contenedor y muestra la sección solo si hay alguno. */
export function pintarChipsCategorias(contenedor, enlaces) {
  if (!contenedor) return;
  contenedor.replaceChildren(...enlaces.map(({ nombre, href }) => {
    const chip = document.createElement("a");
    chip.className = "chip-categoria";
    chip.href = href;
    chip.textContent = nombre;
    return chip;
  }));
  const seccion = contenedor.closest?.("section");
  if (seccion) seccion.hidden = enlaces.length === 0;
}

/** "32 productos en 7 categorías" (las categorías con al menos un producto a la venta). */
export function resumenCatalogo(productos) {
  if (!Array.isArray(productos) || productos.length === 0) return "";
  const categorias = new Set(productos.map((producto) => producto.categoria).filter(Boolean));
  const p = productos.length;
  const c = categorias.size;
  return `${p} ${p === 1 ? "producto" : "productos"} en ${c} ${c === 1 ? "categoría" : "categorías"}`;
}
