/**
 * Módulo de renderizado de la tarjeta de producto (Product Card) para Píxel Andino.
 * Encapsula la construcción DOM, accesibilidad, estados de stock, acciones por rol
 * y resolución inteligente de imágenes fotográficas.
 */

import { obtenerBadgeStock } from "../utilidades/stock.js";
import { esFavorito, alternarFavorito } from "./favoritos.js";
import { mostrarToast } from "../utilidades/notificaciones.js";
import { formatoPrecio } from "../utilidades/formato.js";
import { asignarImagenConRespaldo, resolverImagenProducto } from "./imagen-producto.js";
import { crearMenuAcciones } from "../utilidades/menu-acciones.js";
import { ROL, ROLES_CATALOGO, ROLES_INVENTARIO } from "../utilidades/constantes.js";

/**
 * Acciones del personal sobre un producto, en el orden en que aparecen en el menú
 * "Gestionar". Inventario (almacén/vendedor): movimientos y stock. Catálogo
 * (vendedor/admin): precio y ficha (RF16, spec 007).
 *
 * @returns {{texto: string, alElegir: Function}[]}
 */
export function accionesPersonalProducto(
  producto,
  { puedeGestionarInventario = false, puedeGestionarCatalogo = false, callbacks = {} } = {},
) {
  const acciones = [];
  if (puedeGestionarCatalogo) {
    acciones.push(
      { texto: "Editar ficha", alElegir: () => callbacks.onAbrirModalEditar?.(producto) },
      { texto: "Editar precio", alElegir: () => callbacks.onAbrirModalPrecio?.(producto) },
    );
  }
  if (puedeGestionarInventario) {
    acciones.push(
      { texto: "Ajustar stock", alElegir: () => callbacks.onAbrirModalStock?.(producto) },
      { texto: "Ver movimientos", alElegir: () => callbacks.onCargarMovimientos?.(producto) },
    );
  }
  return acciones;
}

/**
 * Crea un elemento DOM de tarjeta de producto con enlaces canónicos y acciones según rol.
 *
 * @param {object} producto - Datos del producto
 * @param {object} [opciones] - Opciones de renderizado y eventos
 * @param {boolean} [opciones.esCarousel=false] - Si la tarjeta se ubica dentro de un carrusel
 * @param {object|null} [opciones.usuarioSesion=null] - Información de la sesión activa
 * @param {object} [opciones.callbacks={}] - Manejadores de eventos desacoplados
 * @returns {HTMLElement} Elemento DOM listo para insertar
 */
export function crearElementoTarjetaProducto(
  producto,
  { esCarousel = false, usuarioSesion = null, callbacks = {} } = {},
) {
  const badgeStockInfo = obtenerBadgeStock(producto.stock);

  const wrapper = esCarousel ? document.createElement("div") : null;
  if (wrapper) wrapper.className = "product-card-wrap";

  const tarjeta = document.createElement("article");
  tarjeta.className = "card product-card h-100 shadow-sm";
  if (!badgeStockInfo.disponible) {
    tarjeta.classList.add("is-out-of-stock", "product-card-agotado");
  }

  // 1. Cabecera de la tarjeta: Botón favoritos y Badges
  const tarjetaTop = document.createElement("div");
  tarjetaTop.className = "product-card-top";

  const botonFav = document.createElement("button");
  botonFav.type = "button";
  botonFav.className = "product-fav-btn";
  if (esFavorito(producto.id)) botonFav.classList.add("is-favorite");
  botonFav.setAttribute(
    "aria-label",
    `Guardar ${producto.nombre} en favoritos`,
  );
  botonFav.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
    </svg>
  `;
  botonFav.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof callbacks.onAlternarFavorito === "function") {
      callbacks.onAlternarFavorito(producto, botonFav);
      return;
    }
    const res = alternarFavorito(producto.id);
    botonFav.classList.toggle("is-favorite", res.activo);
    mostrarToast(
      res.activo
        ? `¡Añadido a favoritos! ${producto.nombre}`
        : "Removido de favoritos",
      res.activo ? "exito" : "info",
    );
  });
  tarjetaTop.append(botonFav);

  const tieneDescuento =
    producto.precioAnterior &&
    Number(producto.precioAnterior) > Number(producto.precio);
  if (tieneDescuento) {
    const badgeDesc = document.createElement("span");
    badgeDesc.className = "product-badge-discount";
    const pct = Math.round(
      ((Number(producto.precioAnterior) - Number(producto.precio)) /
        Number(producto.precioAnterior)) *
        100,
    );
    badgeDesc.textContent = `-${pct}% OFF`;
    tarjetaTop.append(badgeDesc);
  } else if (producto.nuevo) {
    const badgeNuevo = document.createElement("span");
    badgeNuevo.className = "product-badge-new";
    badgeNuevo.textContent = "Nuevo";
    tarjetaTop.append(badgeNuevo);
  }

  const skuProducto =
    producto.sku || "PA-" + String(producto.id).padStart(4, "0");
  const urlProducto = `#/producto/${skuProducto}`;

  // 2. Imagen del Producto con Resolución Inteligente de Hardware
  const imageBox = document.createElement("div");
  imageBox.className = "product-image-box";
  const linkImg = document.createElement("a");
  linkImg.href = urlProducto;
  linkImg.className = "product-image-link";
  linkImg.setAttribute("aria-label", `Ver detalle de ${producto.nombre}`);
  const imgEl = document.createElement("img");
  imgEl.loading = "lazy";
  imgEl.decoding = "async";
  imgEl.alt = producto.nombre;
  asignarImagenConRespaldo(imgEl, resolverImagenProducto(producto));
  linkImg.append(imgEl);
  imageBox.append(linkImg);

  // 4. Título del Producto (con enlace a detalle)
  const titleEl = document.createElement("h3");
  titleEl.className = "product-title";
  const linkTitulo = document.createElement("a");
  linkTitulo.href = urlProducto;
  linkTitulo.className = "product-card-link text-decoration-none";
  linkTitulo.textContent = producto.nombre;
  linkTitulo.title = producto.nombre;
  titleEl.append(linkTitulo);

  // 5. Metadatos (SKU y Stock)
  const metaRow = document.createElement("div");
  metaRow.className = "product-meta-row";
  const skuSpan = document.createElement("span");
  skuSpan.className = "product-sku";
  skuSpan.textContent = `Ref: ${skuProducto}`;

  const stockSpan = document.createElement("span");
  stockSpan.className = "product-stock-badge";
  if (!badgeStockInfo.disponible) {
    stockSpan.textContent = "Stock: 0";
    stockSpan.classList.add("text-danger");
  } else if (producto.stock <= 5) {
    stockSpan.textContent = `Stock: Quedan ${producto.stock}`;
    stockSpan.classList.add("text-warning-emphasis");
  } else {
    stockSpan.textContent = `Stock: ${producto.stock}`;
  }
  metaRow.append(skuSpan, stockSpan);

  // 6. Precios
  const pricingBox = document.createElement("div");
  pricingBox.className = "product-pricing-box";
  const curPrice = document.createElement("span");
  curPrice.className = "product-current-price";
  curPrice.textContent = formatoPrecio(producto.precio);
  pricingBox.append(curPrice);

  if (tieneDescuento) {
    const oldPrice = document.createElement("span");
    oldPrice.className = "product-old-price";
    oldPrice.textContent = formatoPrecio(producto.precioAnterior);
    pricingBox.append(oldPrice);
  }

  // 7. Acciones según Rol (Cliente, Invitado o Staff)
  const actionsBox = document.createElement("div");
  actionsBox.className = "mt-auto pt-2";

  const esCliente = usuarioSesion?.rol === ROL.CLIENTE;
  const esInvitado = !usuarioSesion;
  const puedeGestionarInventario = ROLES_INVENTARIO.includes(
    usuarioSesion?.rol,
  );
  const puedeGestionarCatalogo = ROLES_CATALOGO.includes(
    usuarioSesion?.rol,
  );

  if (esCliente || esInvitado) {
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    if (badgeStockInfo.disponible) {
      btnAdd.className = "product-btn-add site-btn-add-cart";
      btnAdd.textContent = "Agregar al carrito";
      btnAdd.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onAgregarCarrito?.(producto.id, producto);
      });
    } else {
      btnAdd.className = "product-btn-agotado";
      btnAdd.textContent = "Agotado";
      btnAdd.disabled = true;
    }
    actionsBox.append(btnAdd);

    if (!esCarousel) {
      const btnPreguntas = document.createElement("button");
      btnPreguntas.type = "button";
      btnPreguntas.className =
        "btn btn-link btn-sm text-secondary text-decoration-none w-100 mt-1 py-0 product-card-question-btn";
      btnPreguntas.textContent = "Consultar dudas";
      btnPreguntas.addEventListener("click", (e) => {
        e.stopPropagation();
        callbacks.onAbrirPreguntas?.(producto);
      });
      actionsBox.append(btnPreguntas);
    }
  }

  if (puedeGestionarInventario || puedeGestionarCatalogo) {
    // Revisión UX (punto 7): las acciones del personal van en un solo menú "Gestionar".
    actionsBox.append(
      crearMenuAcciones({
        nombreAccesible: `Gestionar ${producto.nombre}`,
        acciones: accionesPersonalProducto(producto, {
          puedeGestionarInventario,
          puedeGestionarCatalogo,
          callbacks,
        }),
      }),
    );
  }

  tarjeta.append(
    tarjetaTop,
    imageBox,
    titleEl,
    metaRow,
    pricingBox,
    actionsBox,
  );

  if (wrapper) {
    wrapper.append(tarjeta);
    return wrapper;
  }
  return tarjeta;
}
