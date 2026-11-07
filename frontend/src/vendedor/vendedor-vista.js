/**
 * @file vendedor-vista.js
 * Módulo de interfaz para la gestión y respuesta de preguntas de clientes asignadas al vendedor.
 */

import {
  listarPreguntasPendientes,
  enviarRespuestaPregunta,
} from "./vendedor.js";

/**
 * Configura la bandeja y el ciclo de vida de preguntas para el vendedor.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarBandejaVendedor({
  apiRequest,
  obtenerEstado,
  elementos = {},
  acciones = {},
}) {
  const {
    estadoPreguntasVendedor,
    listaPreguntasVendedor,
    btnActualizarPreguntas,
  } = elementos;

  const {
    mostrarToast,
  } = acciones;

  let promesaEnCurso = null;

  async function cargarPreguntasVendedor() {
    const estado = obtenerEstado ? obtenerEstado() : {};
    if (estado.usuarioSesion?.rol !== "VENDEDOR") return null;
    if (promesaEnCurso) return promesaEnCurso;

    promesaEnCurso = (async () => {
      if (estadoPreguntasVendedor) {
        estadoPreguntasVendedor.className = "text-secondary mt-3 mb-2";
        estadoPreguntasVendedor.textContent = "Cargando preguntas pendientes...";
      }

      try {
        const preguntas = await listarPreguntasPendientes(apiRequest);
        if (estado.usuarioSesion?.rol !== "VENDEDOR") return [];

        if (!Array.isArray(preguntas) || preguntas.length === 0) {
          if (listaPreguntasVendedor) listaPreguntasVendedor.replaceChildren();
          if (estadoPreguntasVendedor) {
            estadoPreguntasVendedor.textContent = "No hay preguntas pendientes.";
          }
          return [];
        }

        if (estadoPreguntasVendedor) {
          estadoPreguntasVendedor.textContent = `Preguntas pendientes: ${preguntas.length}`;
        }

        const tarjetas = [];
        for (const pregunta of preguntas) {
          const tarjeta = document.createElement("article");
          tarjeta.className = "list-group-item";

          const titulo = document.createElement("h3");
          titulo.className = "h6";
          titulo.textContent = `${pregunta.nombreProducto} · ${pregunta.clienteNombre}`;

          const texto = document.createElement("p");
          texto.className = "mb-2";
          texto.textContent = pregunta.pregunta;

          const fecha = document.createElement("p");
          fecha.className = "small text-secondary mb-2";
          const fechaObj = pregunta.creadaEn ? new Date(pregunta.creadaEn) : new Date();
          fecha.textContent = `Recibida: ${Number.isNaN(fechaObj.getTime()) ? String(pregunta.creadaEn || "") : fechaObj.toLocaleString("es-PE")}`;

          const formularioRespuesta = document.createElement("form");
          formularioRespuesta.className = "row g-2 align-items-end";

          const columnaCampo = document.createElement("div");
          columnaCampo.className = "col-12 col-md-9";

          const etiqueta = document.createElement("label");
          etiqueta.className = "form-label";
          etiqueta.htmlFor = `respuesta-pregunta-${pregunta.idConsulta}`;
          etiqueta.textContent = "Tu respuesta";

          const entrada = document.createElement("textarea");
          entrada.id = etiqueta.htmlFor;
          entrada.className = "form-control";
          entrada.rows = 2;
          entrada.maxLength = 1000;
          entrada.required = true;
          entrada.placeholder = "Escribe una respuesta para el cliente";

          columnaCampo.append(etiqueta, entrada);

          const columnaBoton = document.createElement("div");
          columnaBoton.className = "col-12 col-md-3 d-grid";

          const boton = document.createElement("button");
          boton.type = "submit";
          boton.className = "btn btn-primary";
          boton.textContent = "Responder";

          columnaBoton.append(boton);

          const resultado = document.createElement("p");
          resultado.className = "small mb-0 text-danger";
          resultado.setAttribute("role", "status");

          formularioRespuesta.append(columnaCampo, columnaBoton, resultado);

          formularioRespuesta.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            boton.disabled = true;
            resultado.className = "small mb-0 text-secondary";
            resultado.textContent = "Enviando respuesta...";

            try {
              await enviarRespuestaPregunta(
                apiRequest,
                pregunta.idConsulta,
                entrada.value,
              );
              await cargarPreguntasVendedor();
              if (estadoPreguntasVendedor) {
                estadoPreguntasVendedor.className = "text-success mt-3 mb-2";
                estadoPreguntasVendedor.textContent =
                  "Respuesta enviada. La pregunta salió de pendientes.";
              }
              if (typeof mostrarToast === "function") {
                mostrarToast("Respuesta enviada con éxito.", "exito");
              }
            } catch (error) {
              resultado.className = "small mb-0 text-danger";
              resultado.textContent = `No se pudo responder. ${error.message}`;
              if (typeof mostrarToast === "function") {
                mostrarToast(
                  `No se pudo responder la pregunta: ${error.message}`,
                  "error",
                );
              }
              boton.disabled = false;
            }
          });

          tarjeta.append(titulo, texto, fecha, formularioRespuesta);
          tarjetas.push(tarjeta);
        }

        if (listaPreguntasVendedor) {
          listaPreguntasVendedor.replaceChildren(...tarjetas);
        }
        return preguntas;
      } catch (error) {
        if (estadoPreguntasVendedor) {
          estadoPreguntasVendedor.className = "text-danger mt-3 mb-2";
          estadoPreguntasVendedor.textContent = `No se pudieron cargar las preguntas. ${error.message}`;
        }
        return [];
      } finally {
        promesaEnCurso = null;
      }
    })();

    return promesaEnCurso;
  }

  if (btnActualizarPreguntas) {
    btnActualizarPreguntas.addEventListener("click", () => {
      cargarPreguntasVendedor();
    });
  }

  return {
    cargarPreguntasVendedor,
  };
}
