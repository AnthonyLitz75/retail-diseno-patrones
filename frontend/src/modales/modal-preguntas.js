/**
 * Módulo del Modal de Consultas y Preguntas sobre Productos para Píxel Andino Tech Store.
 * Encapsula la apertura, renderizado de respuestas del vendedor y envío de nuevas dudas.
 */

/**
 * Renderiza el listado de preguntas del cliente para el producto activo.
 *
 * @param {object} producto
 * @param {Array<object>} preguntas - Lista de preguntas del cliente
 * @param {HTMLElement} contenedorLista - Elemento contenedor
 */
export function renderizarPreguntasModal(
  producto,
  preguntas = [],
  contenedorLista = document.querySelector("#modal-preguntas-lista"),
) {
  if (!contenedorLista) return;
  contenedorLista.replaceChildren();

  const preguntasProducto = preguntas.filter(
    (pregunta) => pregunta.productoId === producto?.id,
  );

  if (preguntasProducto.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "text-secondary mb-2 small";
    vacio.textContent = "Aún no has consultado sobre este producto.";
    contenedorLista.append(vacio);
    return;
  }

  for (const pregunta of preguntasProducto) {
    const item = document.createElement("article");
    item.className = "product-question-item mb-2";

    const textoPregunta = document.createElement("p");
    textoPregunta.className = "mb-1 small";
    const etiquetaPregunta = document.createElement("strong");
    etiquetaPregunta.textContent = "Tu pregunta: ";
    textoPregunta.append(
      etiquetaPregunta,
      document.createTextNode(pregunta.pregunta),
    );
    item.append(textoPregunta);

    const respuesta = document.createElement("p");
    respuesta.className = pregunta.respuesta
      ? "mb-0 small text-success"
      : "mb-0 small text-secondary";
    respuesta.textContent = pregunta.respuesta
      ? `Respuesta de la tienda: ${pregunta.respuesta}`
      : "Pendiente de respuesta de la tienda.";
    item.append(respuesta);

    contenedorLista.append(item);
  }
}

/**
 * Configura y gestiona el ciclo de vida del modal de preguntas de producto.
 *
 * @param {object} opciones
 * @param {Function} opciones.apiRequest - Cliente HTTP autenticado
 * @param {object} [opciones.Modal] - Constructor Bootstrap Modal inyectado
 * @param {Function} opciones.obtenerPreguntasCliente - Función que retorna las preguntas actuales
 * @param {Function} [opciones.onPreguntaEnviada] - Callback invocado tras enviar una pregunta
 * @param {Function} [opciones.mostrarToast] - Utilidad de notificaciones toast
 * @param {string} [opciones.modalSelector="#modal-preguntas-producto"] - Selector del modal en el DOM
 * @returns {{ abrirModalPreguntas: Function, actualizarPreguntas: Function }} Interfaz de control
 */
export function configurarModalPreguntas({
  apiRequest,
  Modal = typeof window !== "undefined" ? window.bootstrap?.Modal : null,
  obtenerPreguntasCliente = () => [],
  onPreguntaEnviada = null,
  mostrarToast = null,
  modalSelector = "#modal-preguntas-producto",
} = {}) {
  const modalElemento = document.querySelector(modalSelector);
  if (!modalElemento) {
    return {
      abrirModalPreguntas: () => {},
      actualizarPreguntas: () => {},
    };
  }

  const tituloEl = modalElemento.querySelector("#modal-preguntas-titulo");
  const listaEl = modalElemento.querySelector("#modal-preguntas-lista");
  const formEl = modalElemento.querySelector("#form-modal-pregunta");
  const inputEl = modalElemento.querySelector("#modal-pregunta-input");
  const mensajeEl = modalElemento.querySelector("#modal-pregunta-mensaje");

  let productoActivo = null;

  function actualizarPreguntas() {
    if (productoActivo) {
      renderizarPreguntasModal(
        productoActivo,
        obtenerPreguntasCliente(),
        listaEl,
      );
    }
  }

  function abrirModalPreguntas(producto) {
    if (!producto) return;
    productoActivo = producto;

    if (tituloEl) tituloEl.textContent = `Preguntas sobre ${producto.nombre}`;
    if (inputEl) inputEl.value = "";
    if (mensajeEl) {
      mensajeEl.textContent = "";
      mensajeEl.className = "small mb-2";
    }

    renderizarPreguntasModal(
      productoActivo,
      obtenerPreguntasCliente(),
      listaEl,
    );

    Modal?.getOrCreateInstance(modalElemento)?.show();
  }

  if (formEl) {
    formEl.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      if (!productoActivo) return;

      const boton = formEl.querySelector('button[type="submit"]');
      const pregunta = inputEl ? inputEl.value.trim() : "";
      if (!pregunta) return;

      if (boton) boton.disabled = true;
      if (mensajeEl) {
        mensajeEl.className = "small mb-2 text-secondary";
        mensajeEl.textContent = "Enviando pregunta…";
      }

      try {
        await apiRequest(`/api/productos/${productoActivo.id}/preguntas`, {
          method: "POST",
          json: { pregunta },
        });

        if (inputEl) inputEl.value = "";
        if (mensajeEl) {
          mensajeEl.className = "small mb-2 text-success";
          mensajeEl.textContent =
            "Pregunta enviada. La respuesta aparecerá aquí.";
        }

        if (typeof mostrarToast === "function") {
          mostrarToast("Tu pregunta ha sido enviada.", "exito");
        }

        if (typeof onPreguntaEnviada === "function") {
          await onPreguntaEnviada(productoActivo);
        }

        actualizarPreguntas();
      } catch (error) {
        if (mensajeEl) {
          mensajeEl.className = "small mb-2 text-danger";
          mensajeEl.textContent = `No se pudo enviar la pregunta. ${error.message}`;
        }
        if (typeof mostrarToast === "function") {
          mostrarToast(`No se pudo enviar la pregunta: ${error.message}`, "error");
        }
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  return {
    abrirModalPreguntas,
    actualizarPreguntas,
  };
}
