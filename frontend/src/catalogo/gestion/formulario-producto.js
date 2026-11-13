/**
 * @file formulario-producto.js
 * Formulario "Nuevo producto" del personal (boceto "Panel vendedor - Nuevo producto"):
 * ficha completa, validación igual a la del backend y vista previa de la tarjeta tal como
 * la verá el cliente. La lógica (leer, validar, armar la vista previa) es pura para poder
 * probarla sin DOM; configurarFormularioProducto solo conecta eventos.
 */

import { crearElementoTarjetaProducto } from "../componentes/tarjeta-producto.js";

/** Mismas reglas que NuevoProducto.java. */
export const PATRON_CODIGO = /^[A-Z0-9][A-Z0-9-]{2,29}$/;
export const PATRON_IMAGEN = /^(https?:\/\/|\/)[^\s"'<>]*$/;
const PATRON_IMPORTE = /^\d{1,8}(\.\d{1,2})?$/;
export const CODIGO_PROVISIONAL = "Se genera al guardar";

const texto = (valor) => (typeof valor === "string" ? valor.trim() : "");
const opcional = (valor) => texto(valor) || null;

/**
 * Convierte los valores del formulario (texto) en el cuerpo de POST /api/productos.
 * @param {Record<string, string|boolean>} valores
 */
export function leerNuevoProducto(valores = {}) {
  const precioAnterior = texto(valores.precioAnterior);
  return {
    sku: opcional(valores.sku)?.toUpperCase() ?? null,
    nombre: texto(valores.nombre),
    marca: opcional(valores.marca),
    categoria: texto(valores.categoria),
    descripcion: opcional(valores.descripcion),
    imagen: opcional(valores.imagen),
    precio: texto(valores.precio) === "" ? null : Number(valores.precio),
    precioAnterior: precioAnterior === "" ? null : Number(precioAnterior),
    stock: texto(valores.stock) === "" ? null : Number(valores.stock),
    nuevo: Boolean(valores.nuevo),
  };
}

/**
 * Errores por campo, en el orden del formulario. Vacío si la ficha es válida.
 * @param {ReturnType<typeof leerNuevoProducto>} datos
 * @returns {{campo: string, mensaje: string}[]}
 */
export function validarNuevoProducto(datos) {
  const errores = [];
  const error = (campo, mensaje) => errores.push({ campo, mensaje });

  if (datos.sku && !PATRON_CODIGO.test(datos.sku)) {
    error(
      "sku",
      "El código usa de 3 a 30 letras, números o guiones (ej. PA-0033).",
    );
  }
  if (!datos.nombre) error("nombre", "El nombre es obligatorio.");
  else if (datos.nombre.length > 120)
    error("nombre", "El nombre no puede superar 120 caracteres.");
  if (datos.marca && datos.marca.length > 80)
    error("marca", "La marca no puede superar 80 caracteres.");
  if (!datos.categoria) error("categoria", "Selecciona una categoría.");
  if (datos.descripcion && datos.descripcion.length > 1000) {
    error("descripcion", "La descripción no puede superar 1000 caracteres.");
  }
  if (
    datos.imagen &&
    (datos.imagen.length > 255 || !PATRON_IMAGEN.test(datos.imagen))
  ) {
    error(
      "imagen",
      "La imagen debe ser una URL http(s) o una ruta que empiece con /.",
    );
  }
  if (
    datos.precio == null ||
    !Number.isFinite(datos.precio) ||
    datos.precio <= 0
  ) {
    error("precio", "El precio debe ser mayor que cero.");
  } else if (!PATRON_IMPORTE.test(String(datos.precio))) {
    error("precio", "El precio admite hasta dos decimales.");
  }
  if (datos.precioAnterior != null) {
    if (
      !Number.isFinite(datos.precioAnterior) ||
      !PATRON_IMPORTE.test(String(datos.precioAnterior))
    ) {
      error("precioAnterior", "El precio anterior admite hasta dos decimales.");
    } else if (
      Number.isFinite(datos.precio) &&
      datos.precioAnterior <= datos.precio
    ) {
      error(
        "precioAnterior",
        "El precio anterior debe ser mayor que el precio actual.",
      );
    }
  }
  if (
    datos.stock == null ||
    !Number.isInteger(datos.stock) ||
    datos.stock < 0
  ) {
    error("stock", "El stock de apertura es un número entero, 0 o más.");
  }
  return errores;
}

/** Producto ficticio para la vista previa: lo que haya escrito, o textos de ejemplo. */
export function productoVistaPrevia(datos) {
  const precio =
    Number.isFinite(datos.precio) && datos.precio > 0 ? datos.precio : 0;
  const anterior =
    Number.isFinite(datos.precioAnterior) && datos.precioAnterior > precio
      ? datos.precioAnterior
      : null;
  return {
    id: 0,
    sku: datos.sku || CODIGO_PROVISIONAL,
    nombre: datos.nombre || "Nombre del producto",
    marca: datos.marca,
    categoria: datos.categoria,
    imagen:
      datos.imagen && PATRON_IMAGEN.test(datos.imagen) ? datos.imagen : null,
    precio,
    precioAnterior: anterior,
    stock: Number.isInteger(datos.stock) && datos.stock >= 0 ? datos.stock : 0,
    nuevo: datos.nuevo,
    activo: true,
  };
}

/** Nombres de campo del cuerpo → id del control en el formulario. */
export const CONTROLES = {
  sku: "sku-producto",
  nombre: "nombre-producto",
  marca: "marca-producto",
  categoria: "categoria-producto",
  descripcion: "descripcion-producto",
  imagen: "imagen-producto",
  precio: "precio-producto",
  precioAnterior: "precio-anterior-producto",
  stock: "stock-producto",
  nuevo: "nuevo-producto",
};

/**
 * Conecta el formulario: abrir/cerrar, vista previa en vivo, validación y envío.
 * @param {object} opciones
 * @param {HTMLFormElement} opciones.formulario
 * @param {HTMLElement} [opciones.resultado] mensaje de estado (role=status)
 * @param {Function} opciones.apiRequest
 * @param {(producto: object) => Promise<void>|void} [opciones.alCrear]
 */
export function configurarFormularioProducto({
  formulario,
  resultado,
  apiRequest,
  alCrear = () => {},
}) {
  if (!formulario) return;
  const control = (campo) => formulario.querySelector(`#${CONTROLES[campo]}`);
  const panel = document.querySelector("#panel-nuevo-producto");
  const botonAbrir = document.querySelector("#boton-nuevo-producto");
  const botonCancelar = formulario.querySelector("#cancelar-nuevo-producto");
  const vistaPrevia = formulario.querySelector("#vista-previa-producto");

  const valores = () =>
    Object.fromEntries(
      Object.keys(CONTROLES).map((campo) => {
        const elemento = control(campo);
        if (!elemento) return [campo, ""];
        return [
          campo,
          elemento.type === "checkbox" ? elemento.checked : elemento.value,
        ];
      }),
    );

  function mostrar(texto, tipo = "secondary") {
    if (!resultado) return;
    resultado.className = `mt-3 mb-0 text-${tipo}`;
    resultado.textContent = texto;
  }

  function limpiarErrores() {
    formulario.querySelectorAll(".is-invalid").forEach((elemento) => {
      elemento.classList.remove("is-invalid");
      elemento.removeAttribute("aria-invalid");
    });
    formulario
      .querySelectorAll(".invalid-feedback[data-campo]")
      .forEach((nodo) => {
        nodo.textContent = "";
      });
  }

  function marcarErrores(errores) {
    limpiarErrores();
    for (const { campo, mensaje } of errores) {
      const elemento = control(campo);
      if (!elemento) continue;
      elemento.classList.add("is-invalid");
      elemento.setAttribute("aria-invalid", "true");
      const ayuda = formulario.querySelector(
        `.invalid-feedback[data-campo="${campo}"]`,
      );
      if (ayuda) ayuda.textContent = mensaje;
    }
    control(errores[0]?.campo)?.focus();
  }

  function actualizarVistaPrevia() {
    if (!vistaPrevia) return;
    const tarjeta = crearElementoTarjetaProducto(
      productoVistaPrevia(leerNuevoProducto(valores())),
    );
    vistaPrevia.replaceChildren(tarjeta);
  }

  function abrir(visible) {
    if (!panel) return;
    panel.hidden = !visible;
    botonAbrir?.setAttribute("aria-expanded", String(visible));
    if (visible) {
      actualizarVistaPrevia();
      control("sku")?.focus();
    }
  }

  botonAbrir?.addEventListener("click", () => abrir(panel?.hidden ?? true));
  botonCancelar?.addEventListener("click", () => {
    formulario.reset();
    limpiarErrores();
    mostrar("");
    abrir(false);
    botonAbrir?.focus();
  });
  // Al corregir un campo marcado, su error desaparece sin esperar al siguiente envío.
  function quitarErrorDe(elemento) {
    if (!elemento?.classList?.contains("is-invalid")) return;
    elemento.classList.remove("is-invalid");
    elemento.removeAttribute("aria-invalid");
    const campo = Object.keys(CONTROLES).find(
      (clave) => CONTROLES[clave] === elemento.id,
    );
    const ayuda =
      campo &&
      formulario.querySelector(`.invalid-feedback[data-campo="${campo}"]`);
    if (ayuda) ayuda.textContent = "";
  }
  for (const tipo of ["input", "change"]) {
    formulario.addEventListener(tipo, (evento) => {
      quitarErrorDe(evento.target);
      actualizarVistaPrevia();
    });
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const datos = leerNuevoProducto(valores());
    const errores = validarNuevoProducto(datos);
    if (errores.length > 0) {
      marcarErrores(errores);
      mostrar(
        errores.length === 1
          ? "Revisa el campo marcado."
          : `Revisa los ${errores.length} campos marcados.`,
        "danger",
      );
      return;
    }
    limpiarErrores();
    const boton = formulario.querySelector('button[type="submit"]');
    if (boton) boton.disabled = true;
    mostrar("Publicando producto…");
    try {
      const respuesta = await apiRequest("/api/productos", {
        method: "POST",
        json: datos,
      });
      const creado = await respuesta.json();
      mostrar(
        `Producto «${creado.nombre}» publicado con el código ${creado.sku}.`,
        "success",
      );
      formulario.reset();
      actualizarVistaPrevia();
      await alCrear(creado);
      document.dispatchEvent(
        new CustomEvent("retail:producto-creado", { detail: creado }),
      );
    } catch (error) {
      // El backend responde con el mismo texto que validarNuevoProducto (o "Ya existe… código").
      const campo = /código/i.test(error.message)
        ? "sku"
        : /precio anterior/i.test(error.message)
          ? "precioAnterior"
          : null;
      if (campo) marcarErrores([{ campo, mensaje: error.message }]);
      mostrar(`No se pudo publicar el producto. ${error.message}`, "danger");
    } finally {
      if (boton) boton.disabled = false;
    }
  });
}
