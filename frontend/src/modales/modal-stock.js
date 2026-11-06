/**
 * Módulo del Modal de Ajuste de Stock para Píxel Andino Tech Store.
 * Encapsula la apertura, validación de stock, registro del motivo y llamada API.
 */

/**
 * Configura y gestiona el ciclo de vida del modal de ajuste de stock.
 *
 * @param {object} opciones
 * @param {Function} opciones.apiRequest - Cliente HTTP autenticado
 * @param {object} [opciones.Modal] - Constructor Bootstrap Modal inyectado
 * @param {Function} [opciones.onStockActualizado] - Callback invocado tras ajuste exitoso
 * @param {Function} [opciones.mostrarToast] - Utilidad de notificaciones toast
 * @param {string} [opciones.modalSelector="#modal-ajuste-stock"] - Selector del modal en el DOM
 * @returns {{ abrirModalStock: Function }} Interfaz de control del modal
 */
export function configurarModalStock({
  apiRequest,
  Modal = typeof window !== "undefined" ? window.bootstrap?.Modal : null,
  onStockActualizado = null,
  mostrarToast = null,
  modalSelector = "#modal-ajuste-stock",
} = {}) {
  const modalElemento = document.querySelector(modalSelector);
  if (!modalElemento) {
    return {
      abrirModalStock: () => {},
    };
  }

  const tituloEl = modalElemento.querySelector("#modal-ajuste-stock-titulo");
  const actualEl = modalElemento.querySelector("#modal-stock-actual");
  const formEl = modalElemento.querySelector("#form-modal-stock");
  const inputEl = modalElemento.querySelector("#modal-stock-input");
  const motivoEl = modalElemento.querySelector("#modal-stock-motivo");
  const mensajeEl = modalElemento.querySelector("#modal-stock-mensaje");

  let productoActivo = null;

  function abrirModalStock(producto) {
    if (!producto) return;
    productoActivo = producto;

    if (tituloEl) tituloEl.textContent = `Ajustar stock: ${producto.nombre}`;
    if (actualEl) {
      actualEl.textContent = `Stock disponible actual: ${producto.stock} unidades`;
    }
    if (inputEl) inputEl.value = producto.stock;
    if (motivoEl) motivoEl.value = "";
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
      const nuevoStock = Number(inputEl ? inputEl.value : 0);
      const motivo = motivoEl ? motivoEl.value.trim() : "";

      if (boton) boton.disabled = true;
      if (mensajeEl) {
        mensajeEl.className = "small mt-2 mb-0 text-secondary";
        mensajeEl.textContent = "Guardando ajuste...";
      }

      try {
        const respuesta = await apiRequest(
          `/api/productos/${productoActivo.id}/stock`,
          {
            method: "PUT",
            json: { nuevoStock, motivo },
          },
        );
        const productoActualizado = await respuesta.json();

        if (typeof onStockActualizado === "function") {
          await onStockActualizado(productoActualizado, nuevoStock);
        }

        Modal?.getOrCreateInstance(modalElemento)?.hide();

        if (typeof mostrarToast === "function") {
          mostrarToast(
            `Stock de "${productoActivo.nombre}" ajustado a ${nuevoStock} unidades.`,
            "exito",
          );
        }
      } catch (error) {
        if (mensajeEl) {
          mensajeEl.className = "small mt-2 mb-0 text-danger";
          mensajeEl.textContent = `No se pudo actualizar el stock. ${error.message}`;
        }
        if (typeof mostrarToast === "function") {
          mostrarToast(`No se pudo actualizar el stock: ${error.message}`, "error");
        }
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  return {
    abrirModalStock,
  };
}
