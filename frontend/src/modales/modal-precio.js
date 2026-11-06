/**
 * Módulo del Modal de Edición de Precio para Píxel Andino Tech Store.
 * Encapsula la apertura, validación del precio y actualización vía API.
 */

import { formatoPrecio } from "../utilidades/formato.js";

/**
 * Configura y gestiona el ciclo de vida del modal de edición de precio.
 *
 * @param {object} opciones
 * @param {Function} opciones.apiRequest - Cliente HTTP autenticado
 * @param {object} [opciones.Modal] - Constructor Bootstrap Modal inyectado
 * @param {Function} [opciones.onPrecioActualizado] - Callback invocado tras actualización exitosa
 * @param {Function} [opciones.mostrarToast] - Utilidad de notificaciones toast
 * @param {string} [opciones.modalSelector="#modal-editar-precio"] - Selector del modal en el DOM
 * @returns {{ abrirModalPrecio: Function }} Interfaz de control del modal
 */
export function configurarModalPrecio({
  apiRequest,
  Modal = typeof window !== "undefined" ? window.bootstrap?.Modal : null,
  onPrecioActualizado = null,
  mostrarToast = null,
  modalSelector = "#modal-editar-precio",
} = {}) {
  const modalElemento = document.querySelector(modalSelector);
  if (!modalElemento) {
    return {
      abrirModalPrecio: () => {},
    };
  }

  const tituloEl = modalElemento.querySelector("#modal-editar-precio-titulo");
  const actualEl = modalElemento.querySelector("#modal-precio-actual");
  const formEl = modalElemento.querySelector("#form-modal-precio");
  const inputEl = modalElemento.querySelector("#modal-precio-input");
  const mensajeEl = modalElemento.querySelector("#modal-precio-mensaje");

  let productoActivo = null;

  function abrirModalPrecio(producto) {
    if (!producto) return;
    productoActivo = producto;

    if (tituloEl) tituloEl.textContent = `Editar precio: ${producto.nombre}`;
    if (actualEl) {
      actualEl.textContent = `Precio actual: ${formatoPrecio(producto.precio)}`;
    }
    if (inputEl) inputEl.value = Number(producto.precio).toFixed(2);
    if (mensajeEl) {
      mensajeEl.textContent = "";
      mensajeEl.className = "small mb-0";
    }

    Modal?.getOrCreateInstance(modalElemento)?.show();
  }

  if (formEl) {
    formEl.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (!productoActivo) return;

      const boton = formEl.querySelector('button[type="submit"]');
      const precio = Number(inputEl ? inputEl.value : 0);

      if (boton) boton.disabled = true;
      if (mensajeEl) {
        mensajeEl.className = "small mt-2 mb-0 text-secondary";
        mensajeEl.textContent = "Actualizando precio...";
      }

      try {
        const respuesta = await apiRequest(
          `/api/productos/${productoActivo.id}/precio`,
          {
            method: "PUT",
            json: { precio },
          },
        );

        if (typeof onPrecioActualizado === "function") {
          await onPrecioActualizado(productoActivo, precio, respuesta);
        }

        Modal?.getOrCreateInstance(modalElemento)?.hide();

        if (typeof mostrarToast === "function") {
          mostrarToast(
            `Precio de "${productoActivo.nombre}" actualizado a ${formatoPrecio(precio)}.`,
            "exito",
          );
        }
      } catch (error) {
        if (mensajeEl) {
          mensajeEl.className = "small mt-2 mb-0 text-danger";
          mensajeEl.textContent = `No se pudo actualizar el precio. ${error.message}`;
        }
        if (typeof mostrarToast === "function") {
          mostrarToast(`No se pudo actualizar el precio: ${error.message}`, "error");
        }
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  return {
    abrirModalPrecio,
  };
}
