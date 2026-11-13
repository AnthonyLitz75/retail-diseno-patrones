/**
 * Componente modular para la Vista Detalle de Producto (RF-07)
 * Proporciona el renderizado de la ficha técnica completa, galería,
 * selector de cantidad y acciones de compra con garantías comerciales.
 */

import { generarSlug } from "../../router/parser-rutas.js";
import { obtenerBadgeStock } from "../../utilidades/stock.js";
import { html, seguro } from "../../utilidades/seguridad.js";

/**
 * Calcula el porcentaje y monto de ahorro si el producto tiene descuento.
 *
 * @param {number|string} precioActual
 * @param {number|string|null} precioAnterior
 * @returns {{ tieneDescuento: boolean, porcentaje: number, montoAhorro: number }|null}
 */
export function calcularAhorroProducto(precioActual, precioAnterior) {
  const actual = Number(precioActual);
  const anterior = Number(precioAnterior);
  if (!anterior || Number.isNaN(anterior) || anterior <= actual || Number.isNaN(actual)) {
    return { tieneDescuento: false, porcentaje: 0, montoAhorro: 0 };
  }
  const montoAhorro = Number((anterior - actual).toFixed(2));
  const porcentaje = Math.round((montoAhorro / anterior) * 100);
  return { tieneDescuento: true, porcentaje, montoAhorro };
}

/**
 * Renderiza el DOM completo de la página de detalle de un producto individual.
 *
 * @param {object} producto - Objeto del producto
 * @param {object} opciones
 * @param {string} [opciones.imagenUrl] - URL resuelta de la imagen
 * @param {boolean} [opciones.esFavorito=false] - Estado inicial de favoritos
 * @param {(cantidad: number) => void} [opciones.onAgregarAlCarrito]
 * @param {() => void} [opciones.onAbrirPreguntas]
 * @param {() => void} [opciones.onAlternarFavorito]
 * @returns {HTMLElement}
 */
export function renderizarVistaDetalleProducto(producto, {
  imagenUrl = "/img/productos/placeholder.svg",
  esFavorito = false,
  onAgregarAlCarrito = () => {},
  onAbrirPreguntas = () => {},
  onAlternarFavorito = () => {},
} = {}) {
  const stockInfo = obtenerBadgeStock(producto.stock);
  const ahorro = calcularAhorroProducto(producto.precio, producto.precioAnterior);
  const slugCat = generarSlug(producto.categoria || "catalogo");
  const categoriaVolver = producto.categoria || "Catálogo";
  const categoriaBadge = producto.categoria || "General";
  const skuProducto = producto.sku || `PA-${producto.id}`;
  const descripcionProducto =
    producto.descripcion ||
    "Producto con garantía oficial y especificaciones certificadas por el fabricante para alto rendimiento y durabilidad.";

  const contenedor = document.createElement("section");
  contenedor.className = "product-detail-card card shadow-sm border-0 mb-5";
  contenedor.setAttribute("aria-label", `Detalle de ${producto.nombre}`);

  let cantidadSeleccionada = producto.stock > 0 ? 1 : 0;

  contenedor.innerHTML = html`
    <div class="card-body p-3 p-md-4 p-lg-5">
      <!-- Navegación superior rápida -->
      <nav class="mb-4" aria-label="Navegación de retorno">
        <a href="#/categoria/${slugCat}" class="product-detail-back-link d-inline-flex align-items-center gap-2 text-decoration-none">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          <span>Volver a <strong>${categoriaVolver}</strong></span>
        </a>
      </nav>

      <div class="row g-4 g-lg-5 align-items-start">
        <!-- Columna Izquierda: Galería e Imagen de Gran Formato Limpia -->
        <div class="col-12 col-md-6 col-lg-5">
          <div class="product-detail-gallery position-relative rounded-4 p-4 text-center bg-white border">
            <!-- Botón Favorito Flotante -->
            <button type="button" class="product-detail-fav-btn position-absolute top-0 end-0 m-3 ${esFavorito ? "is-favorite" : ""}" aria-label="Guardar en favoritos" title="Guardar en favoritos">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
              </svg>
            </button>

            <!-- Imagen Principal sin sobreposiciones -->
            <div class="product-detail-image-box">
              <img id="detail-product-img" src="${imagenUrl}" alt="${producto.nombre}" class="img-fluid product-detail-img" loading="eager" />
            </div>
          </div>
        </div>

        <!-- Columna Derecha: Información Técnica, Precios y Acciones -->
        <div class="col-12 col-md-6 col-lg-7">
          <div class="product-detail-content d-flex flex-column gap-3">
            <!-- Badges de Marca, Categoría y Promoción Desacoplados -->
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span class="badge bg-light text-primary border border-primary-subtle px-3 py-1 fw-bold text-uppercase">${categoriaBadge}</span>
              ${producto.marca ? seguro(html`<span class="badge bg-light text-secondary border px-3 py-1 fw-semibold">${producto.marca}</span>`) : ""}
              ${
                ahorro.tieneDescuento
                  ? seguro(html`<span class="badge bg-danger text-white border-0 px-2.5 py-1 fw-bold shadow-sm">-${ahorro.porcentaje}% OFF</span>`)
                  : ""
              }
              ${
                producto.nuevo
                  ? seguro(html`<span class="badge bg-primary text-white border-0 px-2.5 py-1 fw-bold shadow-sm">Nuevo lanzamiento</span>`)
                  : ""
              }
            </div>

            <!-- Título Principal -->
            <h1 class="product-detail-title h3 fw-bold text-dark mb-1">${producto.nombre}</h1>

            <!-- SKU. No se muestra calificación: la tienda aún no tiene reseñas reales. -->
            <div class="d-flex flex-wrap align-items-center gap-3 text-secondary small pb-2 border-bottom">
              <span>Ref / SKU: <strong class="text-dark">${skuProducto}</strong></span>
            </div>

            <!-- Bloque de Precios y Ahorro -->
            <div class="product-detail-price-box p-3 rounded-3 bg-light border">
              <div class="d-flex flex-wrap align-items-baseline gap-3">
                <span class="product-detail-price fs-2 fw-bold text-primary">S/ ${Number(producto.precio).toFixed(2)}</span>
                ${
                  ahorro.tieneDescuento
                    ? seguro(html`<span class="product-detail-price-prev fs-5 text-secondary text-decoration-line-through">S/ ${Number(producto.precioAnterior).toFixed(2)}</span>
                       <span class="badge bg-danger-subtle text-danger border border-danger-subtle fw-bold px-2 py-1 fs-7">-${ahorro.porcentaje}% OFF</span>`)
                    : ""
                }
              </div>
              ${
                ahorro.tieneDescuento
                  ? seguro(html`<div class="mt-1 small text-success fw-bold">
                      Ahorras S/ ${ahorro.montoAhorro.toFixed(2)} (${ahorro.porcentaje}% de descuento)
                    </div>`)
                  : ""
              }
            </div>

            <!-- Estado de Stock -->
            <div class="d-flex align-items-center gap-2">
              <span class="${stockInfo.claseBadge} px-3 py-1 rounded-pill fw-semibold">
                ${stockInfo.texto}
              </span>
              ${
                producto.stock > 0
                  ? seguro(html`<span class="small text-secondary">(${producto.stock} disponibles para entrega inmediata)</span>`)
                  : seguro(html`<span class="small text-danger fw-semibold">Reabastecimiento en camino</span>`)
              }
            </div>

            <!-- Descripción -->
            <div class="product-detail-description my-2">
              <h2 class="h6 fw-bold text-dark mb-2">Descripción del producto</h2>
              <p class="text-secondary mb-0 leading-relaxed">${descripcionProducto}</p>
            </div>

            <!-- Selector de Cantidad y Botones de Compra -->
            <div class="product-detail-actions pt-2 d-flex flex-column gap-3">
              ${
                producto.stock > 0
                  ? seguro(html`
                <div class="d-flex flex-wrap align-items-center gap-3">
                  <div class="quantity-selector-group d-flex align-items-center border rounded-3 bg-white">
                    <button type="button" class="btn btn-sm btn-outline-secondary border-0 px-3 py-2 btn-qty-minus" aria-label="Disminuir cantidad" ${cantidadSeleccionada <= 1 ? "disabled" : ""}>-</button>
                    <span class="px-3 py-2 fw-bold text-dark qty-value" aria-live="polite">${cantidadSeleccionada}</span>
                    <button type="button" class="btn btn-sm btn-outline-secondary border-0 px-3 py-2 btn-qty-plus" aria-label="Aumentar cantidad" ${cantidadSeleccionada >= producto.stock ? "disabled" : ""}>+</button>
                  </div>

                  <button type="button" class="btn btn-primary btn-lg flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2 fw-bold btn-add-cart">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M0 1.5A.5.5 0 0 1 .5 1H2a.5.5 0 0 1 .485.379L2.89 3H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 10H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 4l1.25 5h8.22l1.25-5H3.14zM5 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm-7 1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                    </svg>
                    <span>Agregar al carrito</span>
                  </button>
                </div>
                `)
                  : seguro(html`
                <button type="button" class="btn btn-secondary btn-lg w-100 fw-bold" disabled>
                  Producto actualmente agotado
                </button>
                `)
              }

              <!-- Botón Secundario de Preguntas (B6) -->
              <button type="button" class="btn btn-outline-primary btn-ask-question d-inline-flex align-items-center justify-content-center gap-2">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Hacer una consulta sobre este producto</span>
              </button>
            </div>

            <!-- Beneficios y Garantías Comerciales -->
            <div class="product-detail-trust-grid mt-3 pt-3 border-top d-grid gap-2">
              <div class="d-flex align-items-center gap-2 small text-secondary">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#10b981" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                <span><strong>Garantía oficial:</strong> 12 meses de cobertura contra defectos de fábrica.</span>
              </div>
              <div class="d-flex align-items-center gap-2 small text-secondary">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                <span><strong>Pago seguro:</strong> Transacciones cifradas mediante pasarelas protegidas.</span>
              </div>
              <div class="d-flex align-items-center gap-2 small text-secondary">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f59e0b" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2m-6 0a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"/></svg>
                <span><strong>Envío garantizado:</strong> Despachos a todo el país con código de seguimiento en vivo.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event Listeners interactivos
  const btnMinus = contenedor.querySelector(".btn-qty-minus");
  const btnPlus = contenedor.querySelector(".btn-qty-plus");
  const qtyValue = contenedor.querySelector(".qty-value");
  const btnAddCart = contenedor.querySelector(".btn-add-cart");
  const btnFav = contenedor.querySelector(".product-detail-fav-btn");
  const btnAsk = contenedor.querySelector(".btn-ask-question");

  if (btnMinus && btnPlus && qtyValue) {
    btnMinus.addEventListener("click", () => {
      if (cantidadSeleccionada > 1) {
        cantidadSeleccionada -= 1;
        qtyValue.textContent = cantidadSeleccionada;
        btnMinus.disabled = cantidadSeleccionada <= 1;
        btnPlus.disabled = cantidadSeleccionada >= producto.stock;
      }
    });

    btnPlus.addEventListener("click", () => {
      if (cantidadSeleccionada < producto.stock) {
        cantidadSeleccionada += 1;
        qtyValue.textContent = cantidadSeleccionada;
        btnMinus.disabled = cantidadSeleccionada <= 1;
        btnPlus.disabled = cantidadSeleccionada >= producto.stock;
      }
    });
  }

  if (btnAddCart) {
    btnAddCart.addEventListener("click", () => {
      onAgregarAlCarrito(cantidadSeleccionada);
    });
  }

  if (btnFav) {
    btnFav.addEventListener("click", () => {
      onAlternarFavorito();
      btnFav.classList.toggle("is-favorite");
    });
  }

  if (btnAsk) {
    btnAsk.addEventListener("click", () => {
      onAbrirPreguntas();
    });
  }

  return contenedor;
}
