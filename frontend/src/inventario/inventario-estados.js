/**
 * @file inventario-estados.js
 * Estados visuales (skeletons, vacío con limpiar filtros y error con reintentar)
 * y validación inline accesible para el panel de inventario y kardex.
 */

import { validarEntrada } from "../panel/inicio/almacen-logica.js";

/** Genera filas skeleton compatibles con la tabla de 6 columnas del kardex. */
export function crearSkeletonsMovimientos(cantidad = 3) {
  const anchos = ["6.5rem", "11rem", "5.5rem", "12rem", "7rem", "3.5rem"];
  return Array.from({ length: cantidad }, () => {
    const fila = document.createElement("tr");
    fila.setAttribute?.("aria-hidden", "true");
    for (const ancho of anchos) {
      const celda = document.createElement("td");
      const barra = document.createElement("span");
      barra.className = "panel-esqueleto d-block";
      barra.style.width = ancho;
      celda.append(barra);
      fila.append(celda);
    }
    return fila;
  });
}

function envolverMensajeKardex(contenido) {
  const fila = document.createElement("tr");
  fila.className = "panel-fila-estado-kardex";
  const celda = document.createElement("td");
  celda.colSpan = 6;
  celda.append(contenido);
  fila.append(celda);
  return fila;
}

/** Estado vacío amigable para el kardex; agrega «Limpiar filtros» si hay filtros activos. */
export function crearEstadoVacioMovimientos({ conFiltros = false, onLimpiar = null } = {}) {
  const caja = document.createElement("div");
  caja.className = "panel-recuadro-vacio w-100";

  const titulo = document.createElement("p");
  titulo.className = "panel-recuadro-titulo mb-1";
  titulo.textContent = conFiltros
    ? "No hay movimientos con esos filtros"
    : "Todavía no hay movimientos de inventario";

  const detalle = document.createElement("p");
  detalle.className = conFiltros ? "mb-3" : "mb-0";
  detalle.textContent = conFiltros
    ? "Prueba ampliando el rango de fechas o quitando el filtro de producto."
    : "Las entradas y salidas de mercadería aparecerán aquí automáticamente.";

  caja.append(titulo, detalle);
  if (conFiltros && typeof onLimpiar === "function") {
    const botonLimpiar = document.createElement("button");
    botonLimpiar.id = "limpiar-filtros-movimientos";
    botonLimpiar.type = "button";
    botonLimpiar.className = "panel-boton panel-boton-secundario";
    botonLimpiar.textContent = "Limpiar filtros";
    botonLimpiar.addEventListener("click", onLimpiar);
    caja.append(botonLimpiar);
  }
  return envolverMensajeKardex(caja);
}

/** Fila de error del kardex con botón explícito «Reintentar». */
export function crearErrorMovimientos(mensaje, alReintentar) {
  const caja = document.createElement("div");
  caja.className = "panel-error w-100";

  const texto = document.createElement("p");
  texto.className = "mb-0";
  texto.textContent = mensaje;

  const botonReintentar = document.createElement("button");
  botonReintentar.type = "button";
  botonReintentar.className = "panel-boton panel-boton-secundario";
  botonReintentar.textContent = "Reintentar";
  botonReintentar.addEventListener("click", () => {
    void alReintentar();
  });

  caja.append(texto, botonReintentar);
  return envolverMensajeKardex(caja);
}

/**
 * Conecta validación inline accesible sobre `#form-entrada-inventario` reutilizando `validarEntrada`.
 * @returns {{ validar: () => object, limpiarTodos: () => void }}
 */
export function configurarValidacionEntrada({
  formulario,
  campos,
  estadoEntrada,
}) {
  formulario?.setAttribute?.("novalidate", "");
  if (campos.cantidad) {
    if (!campos.cantidad.placeholder) campos.cantidad.placeholder = "Ej.: 10";
    campos.cantidad.setAttribute?.("inputmode", "numeric");
  }

  const feedbacks = new Map();
  for (const [clave, campo] of Object.entries(campos)) {
    if (!campo) continue;
    let feedback = formulario?.querySelector?.(`[data-campo-entrada="${clave}"]`) ?? null;
    if (!feedback && typeof campo.after === "function" && typeof document !== "undefined") {
      feedback = document.createElement("div");
      feedback.id = `error-${clave}-entrada`;
      feedback.className = "invalid-feedback";
      feedback.dataset.campoEntrada = clave;
      campo.after(feedback);
      campo.setAttribute?.("aria-describedby", feedback.id);
    }
    if (feedback) feedbacks.set(clave, feedback);
  }

  function actualizarCampo(clave, campo, mensaje) {
    const feedback = feedbacks.get(clave) ?? formulario?.querySelector?.(`[data-campo-entrada="${clave}"]`);
    if (mensaje) {
      campo.classList?.add("is-invalid");
      campo.setAttribute?.("aria-invalid", "true");
      if (feedback) feedback.textContent = mensaje;
      return;
    }
    campo.classList?.remove("is-invalid");
    campo.removeAttribute?.("aria-invalid");
    if (feedback) feedback.textContent = "";
  }

  for (const [clave, campo] of Object.entries(campos)) {
    if (!campo) continue;
    const evento = clave === "producto" ? "change" : "input";
    campo.addEventListener(evento, () => {
      actualizarCampo(clave, campo, "");
      if (estadoEntrada?.className?.includes("text-danger")) {
        estadoEntrada.textContent = "";
      }
    });
  }

  function limpiarTodos() {
    for (const [clave, campo] of Object.entries(campos)) {
      if (campo) actualizarCampo(clave, campo, "");
    }
  }

  function validar() {
    const resultado = validarEntrada({
      productoId: campos.producto ? campos.producto.value : "",
      cantidad: campos.cantidad ? campos.cantidad.value : "",
      motivo: campos.motivo ? campos.motivo.value : "",
    });
    if (resultado.valido) {
      limpiarTodos();
      return resultado;
    }

    let primero = null;
    for (const [clave, campo] of Object.entries(campos)) {
      if (!campo) continue;
      const mensaje = resultado.errores[clave] || "";
      actualizarCampo(clave, campo, mensaje);
      if (mensaje && !primero) primero = campo;
    }
    if (estadoEntrada) {
      estadoEntrada.className = "small mt-2 mb-0 text-danger";
      estadoEntrada.textContent = "Revisa los campos marcados antes de registrar.";
    }
    primero?.focus?.();
    return resultado;
  }

  return { validar, limpiarTodos };
}
