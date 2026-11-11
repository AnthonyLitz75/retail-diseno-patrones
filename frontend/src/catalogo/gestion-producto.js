/**
 * @file gestion-producto.js
 * RF16 (spec 007, T014a): edición de la ficha del producto y activación o desactivación,
 * para ADMIN y VENDEDOR. El backend valida todo; aquí se evita enviar lo que ya sabemos
 * que será rechazado y se limpian los textos.
 */

/** Misma regla que el backend: URL http(s) o ruta que empiece con "/", sin espacios ni comillas. */
const PATRON_IMAGEN = /^(https?:\/\/|\/)[^\s"'<>]*$/;

const LIMITES = { nombre: 120, marca: 80, descripcion: 1000, imagen: 255, categoria: 80 };

function idValido(id) {
  const numero = Number(id);
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    throw new TypeError("El producto no es válido.");
  }
  return numero;
}

function opcional(valor) {
  const texto = String(valor ?? "").trim();
  return texto || null;
}

/** Normaliza y valida la ficha; lanza TypeError con un mensaje para el usuario. */
export function prepararFicha({ nombre, marca, descripcion, imagen, categoria } = {}) {
  const ficha = {
    nombre: opcional(nombre),
    marca: opcional(marca),
    descripcion: opcional(descripcion),
    imagen: opcional(imagen),
    categoria: opcional(categoria),
  };
  if (!ficha.nombre) throw new TypeError("El nombre es obligatorio.");
  if (!ficha.categoria) throw new TypeError("Elige una categoría.");
  for (const [campo, maximo] of Object.entries(LIMITES)) {
    if (ficha[campo] && ficha[campo].length > maximo) {
      throw new TypeError(`El campo ${campo} no puede superar ${maximo} caracteres.`);
    }
  }
  if (ficha.imagen && !PATRON_IMAGEN.test(ficha.imagen)) {
    throw new TypeError("La imagen debe ser una URL http(s) o una ruta que empiece con /.");
  }
  return ficha;
}

export async function editarFichaProducto(apiRequest, id, datos) {
  const ficha = prepararFicha(datos);
  const respuesta = await apiRequest(`/api/productos/${idValido(id)}`, { method: "PUT", json: ficha });
  return respuesta.json();
}

export async function cambiarEstadoProducto(apiRequest, id, activo) {
  const respuesta = await apiRequest(`/api/productos/${idValido(id)}/estado`, {
    method: "PATCH",
    json: { activo: Boolean(activo) },
  });
  return respuesta.json();
}

/** Catálogo de gestión (incluye desactivados); solo ADMIN y VENDEDOR. */
export async function listarProductosGestion(apiRequest) {
  return (await apiRequest("/api/productos/gestion")).json();
}

/** Categorías que se pueden asignar a un producto: solo las activas, por nombre. */
export function categoriasAsignables(categorias) {
  return (Array.isArray(categorias) ? categorias : [])
    .filter((c) => c && c.activa !== false)
    .map((c) => c.nombre)
    .sort((a, b) => a.localeCompare(b, "es"));
}
