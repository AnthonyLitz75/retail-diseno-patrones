/**
 * @file productos-desactivados.js
 * RF16 (spec 007, T014a): lista de productos desactivados con el botón "Reactivar", dentro
 * de la gestión de productos (ADMIN y VENDEDOR). Sin esta lista, un producto desactivado ya
 * no aparecería en ninguna pantalla.
 */

import { cambiarEstadoProducto, listarProductosGestion } from "./gestion-producto.js";

function el(etiqueta, clase = "", texto = "") {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== "") nodo.textContent = texto;
  return nodo;
}

export function crearListaDesactivados({ apiRequest, mostrarToast = null, onReactivado = null }) {
  const seccion = el("section", "mt-4");
  seccion.setAttribute("aria-labelledby", "titulo-productos-desactivados");
  const titulo = el("h3", "h6", "Productos desactivados");
  titulo.id = "titulo-productos-desactivados";
  const estado = el("p", "small text-secondary mb-2");
  estado.setAttribute("role", "status");
  estado.setAttribute("aria-live", "polite");
  const lista = el("ul", "list-group list-group-flush");
  seccion.append(titulo, estado, lista);

  async function cargar() {
    estado.textContent = "Cargando...";
    try {
      const desactivados = (await listarProductosGestion(apiRequest)).filter((p) => p.activo === false);
      lista.replaceChildren(...desactivados.map(filaProducto));
      estado.textContent = desactivados.length
        ? `${desactivados.length} producto(s) fuera del catálogo.`
        : "No hay productos desactivados.";
    } catch (error) {
      estado.className = "small text-danger mb-2";
      estado.textContent = `No se pudieron cargar los productos desactivados. ${error.message}`;
    }
  }

  function filaProducto(producto) {
    const item = el("li", "list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2 px-0");
    item.append(el("span", "small", `${producto.sku || "Sin SKU"} · ${producto.nombre} · stock ${producto.stock}`));
    const boton = el("button", "btn btn-outline-success btn-sm", "Reactivar");
    boton.type = "button";
    boton.setAttribute("aria-label", `Reactivar ${producto.nombre}`);
    boton.addEventListener("click", async () => {
      boton.disabled = true;
      try {
        const actualizado = await cambiarEstadoProducto(apiRequest, producto.id, true);
        mostrarToast?.(`"${producto.nombre}" vuelve al catálogo.`, "exito");
        await cargar();
        if (typeof onReactivado === "function") await onReactivado(actualizado);
      } catch (error) {
        mostrarToast?.(`No se pudo reactivar: ${error.message}`, "error");
        boton.disabled = false;
      }
    });
    item.append(boton);
    return item;
  }

  return { element: seccion, cargar };
}
