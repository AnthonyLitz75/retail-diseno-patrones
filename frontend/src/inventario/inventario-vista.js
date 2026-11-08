/**
 * @file inventario-vista.js
 * Módulo de interfaz y gestión del panel de inventario (Kardex, entradas y movimientos).
 */

import {
  crearParametrosMovimientos,
  crearSolicitudEntrada,
} from "./almacen.js";

/**
 * Genera una fila <tr> para la tabla de movimientos de Kardex.
 * @param {Object} movimiento
 * @param {Array<Object>} [productosInventario=[]]
 * @returns {HTMLTableRowElement}
 */
export function crearFilaMovimientoKardex(movimiento, productosInventario = []) {
  const fila = document.createElement("tr");

  const fecha = document.createElement("td");
  const fechaObj = movimiento.fecha ? new Date(movimiento.fecha) : new Date();
  fecha.textContent = Number.isNaN(fechaObj.getTime())
    ? String(movimiento.fecha || "")
    : fechaObj.toLocaleString("es-PE");

  const producto = document.createElement("td");
  const productoEncontrado = productosInventario.find(
    (item) => item.id === movimiento.productoId,
  );
  producto.textContent = productoEncontrado
    ? productoEncontrado.nombre
    : `Producto #${movimiento.productoId}`;

  const tipo = document.createElement("td");
  tipo.textContent = movimiento.tipo || "";

  const motivo = document.createElement("td");
  motivo.textContent = movimiento.motivo || "";

  const responsable = document.createElement("td");
  responsable.textContent =
    movimiento.responsableId == null
      ? "No registrado"
      : String(movimiento.responsableId);

  const cantidad = document.createElement("td");
  cantidad.className = "text-end fw-semibold";
  const cantidadFirmada = Number(movimiento.cantidadFirmada || 0);
  const signo = cantidadFirmada > 0 ? "+" : "";
  cantidad.textContent = `${signo}${cantidadFirmada}`;

  fila.append(fecha, producto, tipo, motivo, responsable, cantidad);
  return fila;
}

/**
 * Puebla elementos <select> con la lista de productos de inventario.
 * @param {Array<Object>} productos
 * @param {Array<HTMLSelectElement>} selectores
 * @param {HTMLSelectElement} [selectorEntrada]
 */
export function poblarSelectoresInventario(productos, selectores, selectorEntrada) {
  if (!Array.isArray(productos)) return;

  for (const selector of selectores) {
    if (!selector) continue;
    const valorActual = selector.value;
    selector.replaceChildren();

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent =
      selector === selectorEntrada ? "Selecciona un producto" : "Todos";
    selector.append(inicial);

    for (const prod of productos) {
      const opcion = document.createElement("option");
      opcion.value = String(prod.id);
      opcion.textContent = prod.nombre;
      selector.append(opcion);
    }

    if (productos.some((prod) => String(prod.id) === valorActual)) {
      selector.value = valorActual;
    }
  }
}

/**
 * Carga y renderiza el historial de movimientos de un producto individual en el contenedor especificado.
 * @param {Object} producto
 * @param {HTMLElement} contenedorHistorial
 * @param {Function} apiRequest
 * @returns {Promise<void>}
 */
export async function cargarMovimientosProducto(producto, contenedorHistorial, apiRequest) {
  if (!contenedorHistorial || !producto) return;

  contenedorHistorial.replaceChildren();

  const titulo = document.createElement("h2");
  titulo.className = "h4";
  titulo.textContent = `Historial de stock: ${producto.nombre}`;

  const mensaje = document.createElement("p");
  mensaje.className = "text-secondary";
  mensaje.textContent = "Cargando movimientos...";

  contenedorHistorial.append(titulo, mensaje);

  try {
    const respuesta = await apiRequest(`/api/productos/${producto.id}/movimientos`);
    const movimientos = await respuesta.json();

    if (!Array.isArray(movimientos) || movimientos.length === 0) {
      mensaje.textContent = "Este producto todavía no tiene movimientos.";
      return;
    }

    const lista = document.createElement("ul");
    lista.className = "list-group";

    movimientos.forEach((movimiento) => {
      const elemento = document.createElement("li");
      elemento.className = "list-group-item";

      const cantidadFirmada = Number(movimiento.cantidadFirmada || 0);
      const signo = cantidadFirmada > 0 ? "+" : "";
      const fechaObj = movimiento.fecha ? new Date(movimiento.fecha) : new Date();
      const fecha = Number.isNaN(fechaObj.getTime())
        ? String(movimiento.fecha || "")
        : fechaObj.toLocaleString("es-PE");

      elemento.textContent =
        `${movimiento.tipo || "MOVIMIENTO"}: ${signo}${cantidadFirmada} unidades — ` +
        `${movimiento.motivo || ""} (${fecha})`;

      lista.append(elemento);
    });

    mensaje.remove();
    contenedorHistorial.append(lista);
  } catch (error) {
    mensaje.className = "alert alert-danger";
    mensaje.textContent = `No se pudo cargar el historial. ${error.message}`;
  }
}

/**
 * Configura y orquesta el panel de inventario y Kardex.
 * @param {Object} opciones
 * @returns {Object}
 */
export function configurarPanelInventario({
  apiRequest,
  obtenerEstado,
  mostrarToast,
  cargarProductosCatalogo,
  elementos = {},
}) {
  const {
    seccionInventario,
    seccionEntradaInventario,
    formularioEntradaInventario,
    selectorProductoEntrada,
    cantidadEntrada,
    motivoEntrada,
    estadoEntradaInventario,
    formularioFiltrosMovimientos,
    selectorProductoMovimientos,
    movimientosDesde,
    movimientosHasta,
    estadoMovimientos,
    listaMovimientos,
    contenedorHistorial,
  } = elementos;

  function poblarSelectores() {
    const estado = obtenerEstado();
    poblarSelectoresInventario(
      estado.productosInventario || [],
      [selectorProductoEntrada, selectorProductoMovimientos],
      selectorProductoEntrada,
    );
  }

  async function cargarMovimientosInventario() {
    if (!estadoMovimientos || !listaMovimientos) return;

    estadoMovimientos.className = "small text-secondary mt-2 mb-2";
    estadoMovimientos.textContent = "Consultando movimientos…";
    listaMovimientos.replaceChildren();

    const estado = obtenerEstado();
    if (!estado.productosInventario || estado.productosInventario.length === 0) {
      try {
        const respuestaProductos = await apiRequest("/api/productos");
        estado.productosInventario = await respuestaProductos.json();
        poblarSelectores();
      } catch {
        // En caso de falla, continúa con IDs
      }
    }

    const parametros = crearParametrosMovimientos({
      productoId: selectorProductoMovimientos ? selectorProductoMovimientos.value : "",
      desde: movimientosDesde ? movimientosDesde.value : "",
      hasta: movimientosHasta ? movimientosHasta.value : "",
    });

    try {
      const sufijo = parametros.size ? `?${parametros.toString()}` : "";
      const respuesta = await apiRequest(`/api/inventario/movimientos${sufijo}`);
      const movimientos = await respuesta.json();

      estadoMovimientos.className = "small text-secondary mt-2 mb-2";
      estadoMovimientos.textContent = movimientos.length
        ? `Movimientos encontrados: ${movimientos.length}`
        : "No hay movimientos para esos filtros.";

      for (const movimiento of movimientos) {
        const fila = crearFilaMovimientoKardex(
          movimiento,
          estado.productosInventario || [],
        );
        listaMovimientos.append(fila);
      }
    } catch (error) {
      estadoMovimientos.className = "small text-danger mt-2 mb-2";
      estadoMovimientos.textContent = `No se pudieron cargar los movimientos. ${error.message}`;
    }
  }

  async function iniciarPanelInventario() {
    const estado = obtenerEstado();
    const rol = estado.usuarioSesion?.rol;
    if (!["ADMIN", "VENDEDOR", "ALMACEN"].includes(rol)) {
      if (seccionInventario) seccionInventario.hidden = true;
      return;
    }

    if (seccionInventario) seccionInventario.hidden = false;
    if (seccionEntradaInventario) {
      seccionEntradaInventario.hidden = !["ADMIN", "ALMACEN"].includes(rol);
    }
    if (estadoMovimientos) {
      estadoMovimientos.textContent = "Cargando productos y movimientos…";
    }

    try {
      const respuesta = await apiRequest("/api/productos");
      estado.productosInventario = await respuesta.json();
      poblarSelectores();
      await cargarMovimientosInventario();
    } catch (error) {
      if (estadoMovimientos) {
        estadoMovimientos.className = "small text-danger mt-2 mb-2";
        estadoMovimientos.textContent = `No se pudo cargar el inventario. ${error.message}`;
      }
    }
  }

  // Listener para registro de entrada de inventario
  if (formularioEntradaInventario) {
    formularioEntradaInventario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const boton = formularioEntradaInventario.querySelector('button[type="submit"]');
      if (boton) boton.disabled = true;

      if (estadoEntradaInventario) {
        estadoEntradaInventario.className = "small mt-2 mb-0 text-secondary";
        estadoEntradaInventario.textContent = "Registrando entrada…";
      }

      try {
        await apiRequest("/api/inventario/entradas", {
          method: "POST",
          json: crearSolicitudEntrada(
            selectorProductoEntrada ? selectorProductoEntrada.value : "",
            cantidadEntrada ? cantidadEntrada.value : 0,
            motivoEntrada ? motivoEntrada.value : "",
          ),
        });

        if (estadoEntradaInventario) {
          estadoEntradaInventario.className = "small mt-2 mb-0 text-success";
          estadoEntradaInventario.textContent = "Entrada registrada y stock actualizado.";
        }
        if (typeof mostrarToast === "function") {
          mostrarToast("Entrada de inventario registrada correctamente.", "exito");
        }
        formularioEntradaInventario.reset();
        await cargarMovimientosInventario();
        if (typeof cargarProductosCatalogo === "function") {
          await cargarProductosCatalogo();
        }
      } catch (error) {
        if (estadoEntradaInventario) {
          estadoEntradaInventario.className = "small mt-2 mb-0 text-danger";
          estadoEntradaInventario.textContent = `No se pudo registrar la entrada. ${error.message}`;
        }
        if (typeof mostrarToast === "function") {
          mostrarToast(`No se pudo registrar la entrada: ${error.message}`, "error");
        }
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  }

  // Listener para filtros de movimientos
  if (formularioFiltrosMovimientos) {
    formularioFiltrosMovimientos.addEventListener("submit", (evento) => {
      evento.preventDefault();
      void cargarMovimientosInventario();
    });
  }

  return {
    iniciarPanelInventario,
    cargarMovimientosInventario,
    poblarSelectores,
    cargarMovimientos: (producto) =>
      cargarMovimientosProducto(producto, contenedorHistorial, apiRequest),
  };
}
