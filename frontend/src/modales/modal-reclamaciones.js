/**
 * Módulo del Modal de Libro de Reclamaciones para Píxel Andino Tech Store.
 * Gestiona el registro de la hoja de reclamación y generación de folio oficial.
 */

/**
 * Configura el listener de envío del formulario de libro de reclamaciones.
 *
 * @param {object} opciones
 * @param {object} [opciones.Modal] - Constructor Bootstrap Modal inyectado
 * @param {Function} [opciones.mostrarToast] - Utilidad de notificaciones toast
 * @param {string} [opciones.formSelector="#form-libro-reclamaciones"]
 * @param {string} [opciones.modalSelector="#modal-libro-reclamaciones"]
 */
export function configurarModalReclamaciones({
  Modal = typeof window !== "undefined" ? window.bootstrap?.Modal : null,
  mostrarToast = null,
  formSelector = "#form-libro-reclamaciones",
  modalSelector = "#modal-libro-reclamaciones",
} = {}) {
  const formLibro = document.querySelector(formSelector);
  if (!formLibro) return;

  formLibro.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const modalEl = document.querySelector(modalSelector);
    if (modalEl && Modal) {
      const modalInstancia = Modal.getInstance(modalEl);
      if (modalInstancia) modalInstancia.hide();
    }
    const folio = `LR-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    if (typeof mostrarToast === "function") {
      mostrarToast(
        `Hoja de reclamación registrada con éxito. Folio de seguimiento: ${folio}`,
        "exito",
      );
    }
    formLibro.reset();
  });
}
