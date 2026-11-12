/**
 * @file modal-editar-producto.js
 * RF16 (spec 007, T014a): modal para editar la ficha del producto y desactivarlo
 * (ADMIN y VENDEDOR). Sigue el mismo esquema que modal-precio.js.
 */

import {
  cambiarEstadoProducto,
  categoriasAsignables,
  editarFichaProducto,
} from "../catalogo/gestion-producto.js";
import { mostrarConfirmacion } from "../utilidades/notificaciones.js";

export function configurarModalEditarProducto({
  apiRequest,
  Modal = typeof window !== "undefined" ? window.bootstrap?.Modal : null,
  mostrarToast = null,
  onProductoActualizado = null,
  modalSelector = "#modal-editar-producto",
} = {}) {
  const modalElemento = document.querySelector(modalSelector);
  if (!modalElemento) return { abrirModalEditarProducto: () => {} };

  const titulo = modalElemento.querySelector("#modal-editar-producto-titulo");
  const form = modalElemento.querySelector("#form-modal-editar-producto");
  const campos = {
    nombre: modalElemento.querySelector("#editar-producto-nombre"),
    marca: modalElemento.querySelector("#editar-producto-marca"),
    categoria: modalElemento.querySelector("#editar-producto-categoria"),
    imagen: modalElemento.querySelector("#editar-producto-imagen"),
    descripcion: modalElemento.querySelector("#editar-producto-descripcion"),
  };
  const mensaje = modalElemento.querySelector("#editar-producto-mensaje");
  const botonDesactivar = modalElemento.querySelector("#editar-producto-desactivar");
  let productoActivo = null;

  function avisar(texto, tipo = "secondary") {
    mensaje.className = `small mb-0 text-${tipo}`;
    mensaje.textContent = texto;
  }

  async function cargarCategorias(actual) {
    campos.categoria.replaceChildren(new Option("Cargando categorías...", ""));
    try {
      const nombres = categoriasAsignables(await (await apiRequest("/api/categorias")).json());
      campos.categoria.replaceChildren(new Option("Selecciona una categoría", ""));
      nombres.forEach((nombre) => campos.categoria.append(new Option(nombre, nombre)));
      if (actual && !nombres.includes(actual)) {
        // La categoría actual ya no está activa: se muestra para que se vea, pero hay que cambiarla.
        campos.categoria.append(new Option(`${actual} (inactiva)`, ""));
      }
      campos.categoria.value = nombres.includes(actual) ? actual : "";
    } catch (error) {
      campos.categoria.replaceChildren(new Option("No se pudieron cargar", ""));
      avisar(`No se pudieron cargar las categorías. ${error.message}`, "danger");
    }
  }

  async function abrirModalEditarProducto(producto) {
    if (!producto) return;
    productoActivo = producto;
    titulo.textContent = `Editar ficha: ${producto.nombre}`;
    campos.nombre.value = producto.nombre || "";
    campos.marca.value = producto.marca || "";
    campos.imagen.value = producto.imagen || "";
    campos.descripcion.value = producto.descripcion || "";
    botonDesactivar.hidden = producto.activo === false;
    avisar("");
    Modal?.getOrCreateInstance(modalElemento)?.show();
    await cargarCategorias(producto.categoria);
  }

  async function terminar(texto, actualizado) {
    Modal?.getOrCreateInstance(modalElemento)?.hide();
    mostrarToast?.(texto, "exito");
    if (typeof onProductoActualizado === "function") await onProductoActualizado(actualizado);
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (!productoActivo) return;
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    avisar("Guardando ficha...");
    try {
      const actualizado = await editarFichaProducto(apiRequest, productoActivo.id, {
        nombre: campos.nombre.value,
        marca: campos.marca.value,
        categoria: campos.categoria.value,
        imagen: campos.imagen.value,
        descripcion: campos.descripcion.value,
      });
      await terminar(`Ficha de "${actualizado.nombre}" actualizada.`, actualizado);
    } catch (error) {
      avisar(`No se pudo guardar la ficha. ${error.message}`, "danger");
    } finally {
      boton.disabled = false;
    }
  });

  botonDesactivar.addEventListener("click", async () => {
    if (!productoActivo) return;
    const producto = productoActivo;
    Modal?.getOrCreateInstance(modalElemento)?.hide();
    const confirmado = await mostrarConfirmacion({
      titulo: "Desactivar producto",
      mensaje: `"${producto.nombre}" dejará de mostrarse en el catálogo. No se borra: podrás reactivarlo desde "Productos desactivados".`,
      textoBoton: "Sí, desactivar",
      claseBoton: "btn-danger",
    });
    if (!confirmado) return;
    try {
      const actualizado = await cambiarEstadoProducto(apiRequest, producto.id, false);
      mostrarToast?.(`"${producto.nombre}" se desactivó.`, "exito");
      if (typeof onProductoActualizado === "function") await onProductoActualizado(actualizado);
    } catch (error) {
      mostrarToast?.(`No se pudo desactivar el producto: ${error.message}`, "error");
    }
  });

  return { abrirModalEditarProducto };
}
