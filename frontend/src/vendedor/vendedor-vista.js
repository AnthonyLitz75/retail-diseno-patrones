/**
 * @file vendedor-vista.js
 * Módulo de interfaz para la gestión y respuesta de preguntas de clientes asignadas al vendedor.
 */

import {
  listarPreguntasPendientes,
  enviarRespuestaPregunta,
} from "./vendedor.js";
import { ROL } from "../utilidades/constantes.js";
import { esperaDe } from "../panel/inicio/soporte-logica.js";
import { icono } from "../panel/iconos.js";

const MAX_CARACTERES_RESPUESTA = 1000;

function crearSkeletonsConsultas(cantidad = 3) {
  return Array.from({ length: cantidad }, () => {
    const tarjeta = document.createElement("article");
    tarjeta.className = "panel-tarjeta panel-consulta-tarjeta";
    tarjeta.setAttribute("aria-hidden", "true");
    tarjeta.innerHTML = `<span class="panel-esqueleto panel-esqueleto-titulo"></span>
<span class="panel-esqueleto panel-esqueleto-detalle"></span>
<span class="panel-esqueleto panel-esqueleto-accion"></span>`;
    return tarjeta;
  });
}

function crearTarjetaVaciaConsultas() {
  const recuadro = document.createElement("div");
  recuadro.className = "panel-recuadro-vacio";
  const titulo = document.createElement("p");
  titulo.className = "panel-recuadro-titulo";
  titulo.textContent = "No hay preguntas pendientes";
  const ayuda = document.createElement("p");
  ayuda.className = "mb-0";
  ayuda.textContent = "Cuando un cliente pregunte por un producto, aparecerá aquí para que lo respondas.";
  recuadro.append(titulo, ayuda);
  return recuadro;
}

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
    if (estado.usuarioSesion?.rol !== ROL.VENDEDOR) return null;
    if (promesaEnCurso) return promesaEnCurso;

    promesaEnCurso = (async () => {
      if (estadoPreguntasVendedor) {
        estadoPreguntasVendedor.className = "text-secondary mt-3 mb-2";
        estadoPreguntasVendedor.textContent = "Cargando preguntas pendientes...";
      }
      if (listaPreguntasVendedor) {
        listaPreguntasVendedor.className = "panel-consultas-lista";
        listaPreguntasVendedor.setAttribute("aria-busy", "true");
        if (listaPreguntasVendedor.children.length === 0) {
          listaPreguntasVendedor.replaceChildren(...crearSkeletonsConsultas(3));
        }
      }
      if (btnActualizarPreguntas) btnActualizarPreguntas.disabled = true;

      try {
        const preguntas = await listarPreguntasPendientes(apiRequest);
        if (estado.usuarioSesion?.rol !== ROL.VENDEDOR) return [];

        if (!Array.isArray(preguntas) || preguntas.length === 0) {
          if (listaPreguntasVendedor) listaPreguntasVendedor.replaceChildren(crearTarjetaVaciaConsultas());
          if (estadoPreguntasVendedor) estadoPreguntasVendedor.textContent = "No hay preguntas pendientes.";
          return [];
        }

        if (estadoPreguntasVendedor) {
          estadoPreguntasVendedor.textContent = `Preguntas pendientes: ${preguntas.length}`;
        }

        const tarjetas = [];
        for (const pregunta of preguntas) {
          const tarjeta = document.createElement("article");
          tarjeta.className = "panel-tarjeta panel-consulta-tarjeta";
          tarjeta.dataset.consultaId = String(pregunta.idConsulta);

          const meta = document.createElement("div");
          meta.className = "panel-consulta-meta";

          const titulo = document.createElement("h3");
          titulo.className = "panel-consulta-titulo";
          titulo.textContent = `${pregunta.nombreProducto} · ${pregunta.clienteNombre}`;
          meta.append(titulo);

          const espera = esperaDe(pregunta.creadaEn);
          if (espera.horas != null) {
            const insignia = document.createElement("span");
            insignia.className = `panel-espera panel-espera-${espera.nivel}`;
            insignia.innerHTML = `${icono("reloj")}`;
            insignia.append(document.createTextNode(espera.texto));
            meta.append(insignia);
          }

          const texto = document.createElement("p");
          texto.className = "panel-consulta-cuerpo";
          texto.textContent = pregunta.pregunta;

          const fecha = document.createElement("p");
          fecha.className = "small text-secondary mb-0";
          const fechaObj = pregunta.creadaEn ? new Date(pregunta.creadaEn) : new Date();
          fecha.textContent = `Recibida: ${Number.isNaN(fechaObj.getTime()) ? String(pregunta.creadaEn || "") : fechaObj.toLocaleString("es-PE")}`;

          const formularioRespuesta = document.createElement("form");
          formularioRespuesta.className = "row g-2 align-items-end";
          formularioRespuesta.noValidate = true;

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
          entrada.maxLength = MAX_CARACTERES_RESPUESTA;
          entrada.required = true;
          entrada.placeholder = "Escribe una respuesta para el cliente";

          const pieCampo = document.createElement("div");
          pieCampo.className = "panel-consulta-pie";
          const resultado = document.createElement("p");
          resultado.id = `error-respuesta-${pregunta.idConsulta}`;
          resultado.className = "small mb-0 text-danger";
          resultado.setAttribute("role", "alert");
          const contador = document.createElement("span");
          contador.className = "panel-consulta-contador";
          contador.textContent = `0 / ${MAX_CARACTERES_RESPUESTA}`;
          pieCampo.append(resultado, contador);
          entrada.setAttribute("aria-describedby", resultado.id);

          entrada.addEventListener("input", () => {
            contador.textContent = `${entrada.value.length} / ${MAX_CARACTERES_RESPUESTA}`;
            entrada.removeAttribute("aria-invalid");
            resultado.textContent = "";
          });

          columnaCampo.append(etiqueta, entrada, pieCampo);

          const columnaBoton = document.createElement("div");
          columnaBoton.className = "col-12 col-md-3 d-grid";

          const boton = document.createElement("button");
          boton.type = "submit";
          boton.className = "panel-boton panel-boton-principal";
          boton.textContent = "Responder";

          columnaBoton.append(boton);
          formularioRespuesta.append(columnaCampo, columnaBoton);

          formularioRespuesta.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            const respuestaLimpia = entrada.value.trim();
            if (!respuestaLimpia) {
              entrada.setAttribute("aria-invalid", "true");
              resultado.className = "small mb-0 text-danger";
              resultado.textContent = "Escribe una respuesta antes de enviar.";
              entrada.focus();
              return;
            }
            boton.disabled = true;
            boton.textContent = "Enviando...";
            resultado.className = "small mb-0 text-secondary";
            resultado.textContent = "";

            try {
              await enviarRespuestaPregunta(apiRequest, pregunta.idConsulta, respuestaLimpia);
              await cargarPreguntasVendedor();
              if (estadoPreguntasVendedor) {
                estadoPreguntasVendedor.className = "text-success mt-3 mb-2";
                estadoPreguntasVendedor.textContent = "Respuesta enviada. La pregunta salió de pendientes.";
              }
              if (typeof mostrarToast === "function") {
                mostrarToast("Respuesta enviada con éxito.", "exito");
              }
            } catch (error) {
              resultado.className = "small mb-0 text-danger";
              resultado.textContent = `No se pudo responder. ${error.message}`;
              if (typeof mostrarToast === "function") {
                mostrarToast(`No se pudo responder la pregunta: ${error.message}`, "error");
              }
              boton.disabled = false;
              boton.textContent = "Responder";
            }
          });

          tarjeta.append(meta, texto, fecha, formularioRespuesta);
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
        if (listaPreguntasVendedor) {
          const cajaError = document.createElement("div");
          cajaError.className = "panel-recuadro-vacio panel-error";
          const msg = document.createElement("p");
          msg.className = "mb-0";
          msg.textContent = "No se pudieron cargar las preguntas pendientes.";
          const reintentar = document.createElement("button");
          reintentar.type = "button";
          reintentar.className = "panel-boton panel-boton-secundario";
          reintentar.textContent = "Reintentar";
          reintentar.addEventListener("click", () => { void cargarPreguntasVendedor(); });
          cajaError.append(msg, reintentar);
          listaPreguntasVendedor.replaceChildren(cajaError);
        }
        return [];
      } finally {
        if (listaPreguntasVendedor) listaPreguntasVendedor.removeAttribute("aria-busy");
        if (btnActualizarPreguntas) btnActualizarPreguntas.disabled = false;
        promesaEnCurso = null;
      }
    })();

    return promesaEnCurso;
  }

  if (btnActualizarPreguntas) {
    btnActualizarPreguntas.addEventListener("click", () => {
      void cargarPreguntasVendedor();
    });
  }

  function enfocarConsulta(idConsulta) {
    if (idConsulta == null || !listaPreguntasVendedor) return false;
    const tarjetas = Array.from(listaPreguntasVendedor.querySelectorAll?.("[data-consulta-id]") ?? []);
    for (const item of tarjetas) item.classList?.remove?.("panel-consulta-enfocada");
    const objetivo = tarjetas.find((t) => String(t.dataset?.consultaId) === String(idConsulta));
    if (!objetivo) return false;
    objetivo.classList?.add?.("panel-consulta-enfocada");
    objetivo.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    objetivo.querySelector?.("textarea")?.focus?.();
    return true;
  }

  return {
    cargarPreguntasVendedor,
    enfocarConsulta,
  };
}
