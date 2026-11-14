/**
 * @file admin-categorias.js
 * Submódulo de administración de categorías del catálogo (creación, edición y estado).
 */

import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  crearCategoria,
  listarCategoriasAdmin,
} from "./administracion.js";
import { mostrarToast } from "../utilidades/notificaciones.js";
import { crearElemento } from "../utilidades/dom.js";

/**
 * Inicializa la gestión de categorías en el panel de administración.
 * @param {Object} params
 * @param {HTMLElement} params.seccion
 * @param {Function} params.apiRequest
 * @param {Function} params.alCambiarCategorias
 * @param {Function} params.mostrarEstado
 * @returns {{ cargarCategorias: () => Promise<void> }}
 */
export function inicializarAdminCategorias({
  seccion,
  apiRequest,
  alCambiarCategorias,
  mostrarEstado,
}) {
  const estadoCategoria = seccion.querySelector("#estado-categoria-admin");
  if (estadoCategoria) {
    estadoCategoria.setAttribute?.("role", "status");
    estadoCategoria.setAttribute?.("aria-live", "polite");
  }
  const listaCategorias = seccion.querySelector("#lista-categorias-admin");
  let promesaCategoriasEnCurso = null;

  async function cargarCategorias() {
    if (promesaCategoriasEnCurso) return promesaCategoriasEnCurso;
    promesaCategoriasEnCurso = (async () => {
      if (estadoCategoria) estadoCategoria.textContent = "Cargando categorías...";
      try {
        const categorias = await listarCategoriasAdmin(apiRequest);
        if (estadoCategoria) {
          if (categorias.length === 0) {
            estadoCategoria.textContent = "No hay categorías registradas.";
          } else {
            estadoCategoria.textContent = `Categorías registradas: ${categorias.length}`;
          }
        }
        if (!listaCategorias) return;

        const filas = [];
        for (const categoria of categorias) {
          const fila = crearElemento(
            "div",
            "list-group-item d-flex flex-wrap align-items-center gap-2",
          );
          const formularioEdicion = document.createElement("form");
          formularioEdicion.className = "d-flex flex-grow-1 gap-2";
          const entrada = crearElemento("input", "form-control form-control-sm");
          entrada.value = categoria.nombre;
          entrada.maxLength = 80;
          entrada.required = true;
          entrada.setAttribute(
            "aria-label",
            `Nombre de categoría ${categoria.nombre}`,
          );
          const guardar = crearElemento(
            "button",
            "btn btn-outline-primary btn-sm",
            "Guardar",
          );
          guardar.type = "submit";
          formularioEdicion.append(entrada, guardar);
          formularioEdicion.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            guardar.disabled = true;
            try {
              await actualizarCategoria(
                apiRequest,
                categoria.idCategoria,
                entrada.value.trim(),
              );
              mostrarToast(
                `Categoría renombrada a "${entrada.value.trim()}".`,
                "exito",
              );
              await cargarCategorias();
              if (typeof alCambiarCategorias === "function") {
                await alCambiarCategorias();
              }
            } catch (error) {
              mostrarToast(
                `No se pudo guardar la categoría: ${error.message}`,
                "error",
              );
              if (estadoCategoria) {
                mostrarEstado(
                  estadoCategoria,
                  `No se pudo guardar la categoría. ${error.message}`,
                  "danger",
                );
              }
              guardar.disabled = false;
            }
          });

          const estado = crearElemento(
            "span",
            `badge ${categoria.activa ? "text-bg-success" : "text-bg-secondary"}`,
            categoria.activa ? "Activa" : "Inactiva",
          );
          const cambiarEstado = crearElemento(
            "button",
            `btn btn-sm ${categoria.activa ? "btn-outline-danger" : "btn-outline-success"}`,
            categoria.activa ? "Desactivar" : "Activar",
          );
          cambiarEstado.type = "button";
          cambiarEstado.addEventListener("click", async () => {
            cambiarEstado.disabled = true;
            try {
              await cambiarEstadoCategoria(
                apiRequest,
                categoria.idCategoria,
                !categoria.activa,
              );
              mostrarToast(
                `Categoría "${categoria.nombre}" ${categoria.activa ? "desactivada" : "activada"}.`,
                "exito",
              );
              await cargarCategorias();
              if (typeof alCambiarCategorias === "function") {
                await alCambiarCategorias();
              }
            } catch (error) {
              mostrarToast(
                `No se pudo cambiar el estado: ${error.message}`,
                "error",
              );
              if (estadoCategoria) {
                mostrarEstado(
                  estadoCategoria,
                  `No se pudo cambiar el estado. ${error.message}`,
                  "danger",
                );
              }
              cambiarEstado.disabled = false;
            }
          });

          fila.append(formularioEdicion, estado, cambiarEstado);
          filas.push(fila);
        }
        listaCategorias.replaceChildren(...filas);
      } catch (error) {
        if (estadoCategoria) {
          mostrarEstado(
            estadoCategoria,
            `No se pudieron cargar las categorías. ${error.message}`,
            "danger",
          );
        }
      } finally {
        promesaCategoriasEnCurso = null;
      }
    })();
    return promesaCategoriasEnCurso;
  }

  // Formulario de creación de categoría
  seccion.querySelector("#form-categoria-admin")?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const boton = formulario.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;
    try {
      const nombreCat = seccion
        .querySelector("#nombre-categoria-admin")
        .value.trim();
      await crearCategoria(apiRequest, nombreCat);
      formulario.reset();
      mostrarToast(`Categoría "${nombreCat}" creada con éxito.`, "exito");
      await cargarCategorias();
      if (typeof alCambiarCategorias === "function") {
        await alCambiarCategorias();
      }
    } catch (error) {
      mostrarToast(`No se pudo crear la categoría: ${error.message}`, "error");
      if (estadoCategoria) {
        mostrarEstado(
          estadoCategoria,
          `No se pudo crear la categoría. ${error.message}`,
          "danger",
        );
      }
    } finally {
      if (boton) boton.disabled = false;
    }
  });

  return {
    cargarCategorias,
  };
}
