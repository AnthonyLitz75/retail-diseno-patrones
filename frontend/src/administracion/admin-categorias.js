/**
 * @file admin-categorias.js
 * Gestión del árbol de categorías del catálogo para el panel de administración.
 */
import {
  actualizarCategoria,
  cambiarEstadoCategoria,
  crearCategoria,
  listarCategoriasAdmin,
} from "./administracion.js";
import {
  ESTADOS_FILTRO_CATEGORIA,
  construirConfirmacionDesactivacion,
  construirJerarquiaCategorias,
  filtrarArbolCategorias,
  formatearContadorProductos,
  formatearContadorSubcategorias,
  principalesDisponiblesPara,
  validarNombreCategoria,
} from "./categorias-logica.js";
import { mostrarConfirmacion, mostrarToast } from "../utilidades/notificaciones.js";
import { crearElemento } from "../utilidades/dom.js";

function poblarSelectPadre(selector, opciones, valorSeleccionado, textoDefecto) {
  if (!selector) return;
  selector.replaceChildren(new Option(textoDefecto, ""));
  for (const op of opciones) {
    selector.append(new Option(op.nombre, String(op.idCategoria)));
  }
  selector.value = valorSeleccionado != null ? String(valorSeleccionado) : "";
}

function leerPadreId(select) {
  const valor = select?.value ?? "";
  return valor === "" ? null : Number(valor);
}

function ordenarPorJerarquia(categorias, activa) {
  const profundidad = new Map(categorias.map((c) => [c.idCategoria, c.categoriaPadreId == null ? 0 : 1]));
  return [...categorias].sort((a, b) => {
    const diferencia = profundidad.get(a.idCategoria) - profundidad.get(b.idCategoria);
    return activa ? diferencia : -diferencia;
  });
}

function crearSkeletonsLista(cantidad = 4) {
  const fragmento = document.createDocumentFragment();
  for (let i = 0; i < cantidad; i++) {
    const item = crearElemento("li", "panel-categorias-grupo");
    item.setAttribute("aria-hidden", "true");
    const fila = crearElemento("div", "panel-categoria-fila panel-categoria-skeleton-fila");
    const check = crearElemento("span", "panel-categoria-esqueleto panel-categoria-esqueleto-check");
    const datos = crearElemento("div", "panel-categoria-datos");
    datos.append(
      crearElemento("span", "panel-categoria-esqueleto panel-categoria-esqueleto-nombre"),
      crearElemento("span", "panel-categoria-esqueleto panel-categoria-esqueleto-estado"),
    );
    const acciones = crearElemento("div", "panel-categoria-acciones");
    acciones.append(
      crearElemento("span", "panel-categoria-esqueleto panel-categoria-esqueleto-boton"),
      crearElemento("span", "panel-categoria-esqueleto panel-categoria-esqueleto-boton"),
    );
    fila.append(check, datos, acciones);
    item.append(fila);
    fragmento.append(item);
  }
  return fragmento;
}

function crearMensajeVacio({ icono, texto, textoBoton, claseExtra = "", alPulsar }) {
  const item = crearElemento("li", "panel-categorias-vacio" + (claseExtra ? " " + claseExtra : ""));
  const insignia = crearElemento("span", "panel-categorias-vacio-icono", icono);
  insignia.setAttribute("aria-hidden", "true");
  const parrafo = crearElemento("p", "mb-0", texto);
  item.append(insignia, parrafo);
  if (textoBoton && typeof alPulsar === "function") {
    const boton = crearElemento("button", "btn btn-outline-primary btn-sm", textoBoton);
    boton.type = "button";
    boton.addEventListener("click", alPulsar);
    item.append(boton);
  }
  return item;
}

/**
 * Inicializa la gestión de categorías en el panel de administración.
 */
export function inicializarAdminCategorias({
  seccion,
  apiRequest,
  alCambiarCategorias,
  mostrarEstado,
  confirmar = mostrarConfirmacion,
  notificar = mostrarToast,
}) {
  const estadoCategoria = seccion.querySelector("#estado-categoria-admin");
  const listaCategorias = seccion.querySelector("#lista-categorias-admin");
  const formularioAlta = seccion.querySelector("#form-categoria-admin");
  const entradaNombreNuevo = seccion.querySelector("#nombre-categoria-admin");
  const errorNombreNuevo = seccion.querySelector("#error-nombre-categoria-admin");
  const selectPadreNuevo = seccion.querySelector("#padre-categoria-admin");
  const grupoFiltroEstado = seccion.querySelector("#filtro-estado-categorias");
  const entradaBusqueda = seccion.querySelector("#buscar-categorias-admin");
  const botonLimpiarBusqueda = seccion.querySelector("#limpiar-busqueda-categorias");
  const botonAlternarTodo = seccion.querySelector("#alternar-todo-categorias");
  const botonReintentar = seccion.querySelector("#reintentar-carga-categorias");
  const botonSeleccionarVisibles = seccion.querySelector("#seleccionar-resultados-categorias");
  const barraLote = seccion.querySelector("#acciones-categorias-lote");
  const resumenSeleccion = seccion.querySelector("#resumen-seleccion-categorias");
  const botonActivarLote = seccion.querySelector("#activar-categorias-seleccionadas");
  const botonDesactivarLote = seccion.querySelector("#desactivar-categorias-seleccionadas");

  if (estadoCategoria) {
    estadoCategoria.setAttribute("role", "status");
    estadoCategoria.setAttribute("aria-live", "polite");
  }

  let promesaCategoriasEnCurso = null;
  let categoriasActuales = [];
  let idsVisibles = [];
  let gruposExpandiblesVisibles = [];
  let estadoFiltro = ESTADOS_FILTRO_CATEGORIA.TODAS;
  let idEnEdicion = null;
  let procesandoAccion = false;
  let procesandoLote = false;
  const gruposPlegados = new Set();
  const categoriasSeleccionadas = new Set();

  function mostrarErrorNombre(mensaje) {
    if (errorNombreNuevo) errorNombreNuevo.textContent = mensaje || "";
    if (!entradaNombreNuevo) return;
    if (mensaje) {
      entradaNombreNuevo.classList.add("is-invalid");
      entradaNombreNuevo.setAttribute("aria-invalid", "true");
    } else {
      entradaNombreNuevo.classList.remove("is-invalid");
      entradaNombreNuevo.removeAttribute("aria-invalid");
    }
  }

  function mostrarError(accion, error) {
    const mensaje = error?.message || "Inténtalo de nuevo.";
    notificar(accion + ": " + mensaje, "error");
    if (estadoCategoria) mostrarEstado(estadoCategoria, accion + ". " + mensaje, "danger");
  }

  function actualizarControlesBarra() {
    const ocupado = procesandoLote || procesandoAccion;
    const bloqueado = ocupado || idEnEdicion != null;
    const hayTexto = (entradaBusqueda?.value || "").length > 0;
    const hayBusquedaTrim = (entradaBusqueda?.value || "").trim().length > 0;

    if (botonLimpiarBusqueda) {
      botonLimpiarBusqueda.hidden = !hayTexto;
      botonLimpiarBusqueda.disabled = bloqueado;
    }
    if (grupoFiltroEstado) {
      for (const btn of grupoFiltroEstado.querySelectorAll("[data-estado]")) {
        btn.disabled = bloqueado;
        btn.setAttribute("aria-pressed", String(btn.dataset.estado === estadoFiltro));
      }
    }
    if (botonAlternarTodo) {
      const todosPlegados = gruposExpandiblesVisibles.length > 0 &&
        gruposExpandiblesVisibles.every((id) => gruposPlegados.has(id));
      botonAlternarTodo.textContent = todosPlegados ? "Expandir todo" : "Colapsar todo";
      botonAlternarTodo.setAttribute("aria-pressed", String(todosPlegados));
      botonAlternarTodo.disabled = bloqueado || gruposExpandiblesVisibles.length === 0 || hayBusquedaTrim;
    }
    if (entradaBusqueda) entradaBusqueda.disabled = bloqueado;
    if (botonSeleccionarVisibles) {
      botonSeleccionarVisibles.disabled = bloqueado || idsVisibles.length === 0;
      const todoSeleccionado = idsVisibles.length > 0 && idsVisibles.every((id) => categoriasSeleccionadas.has(id));
      botonSeleccionarVisibles.textContent = todoSeleccionado ? "Quitar selección visible" : "Seleccionar visibles";
    }
  }

  function actualizarBarraLote() {
    const ocupado = procesandoLote || procesandoAccion;
    const bloqueado = ocupado || idEnEdicion != null;
    if (listaCategorias) {
      listaCategorias.inert = ocupado;
      listaCategorias.setAttribute("aria-busy", String(ocupado));
    }
    if (formularioAlta) {
      for (const control of formularioAlta.querySelectorAll("input, select, button")) {
        control.disabled = bloqueado;
      }
    }
    actualizarControlesBarra();
    if (!barraLote) return;

    const elegidas = categoriasActuales.filter((c) => categoriasSeleccionadas.has(c.idCategoria));
    const idsVisiblesSet = new Set(idsVisibles);
    const fueraDeBusqueda = elegidas.filter((c) => !idsVisiblesSet.has(c.idCategoria)).length;

    barraLote.hidden = elegidas.length === 0;
    if (resumenSeleccion) {
      resumenSeleccion.textContent = elegidas.length + " seleccionadas" +
        (fueraDeBusqueda ? " · " + fueraDeBusqueda + " fuera de los resultados" : "");
    }
    if (botonActivarLote) {
      botonActivarLote.disabled = bloqueado || !elegidas.some((c) => !c.activa);
    }
    if (botonDesactivarLote) {
      botonDesactivarLote.disabled = bloqueado || !elegidas.some((c) => c.activa);
    }
  }

  function limpiarFiltros() {
    estadoFiltro = ESTADOS_FILTRO_CATEGORIA.TODAS;
    if (entradaBusqueda) entradaBusqueda.value = "";
    renderizarLista();
    entradaBusqueda?.focus();
  }

  function crearCasillaSeleccion(categoria) {
    const etiqueta = crearElemento("label", "panel-categoria-seleccion");
    const casilla = document.createElement("input");
    casilla.type = "checkbox";
    casilla.className = "form-check-input";
    casilla.checked = categoriasSeleccionadas.has(categoria.idCategoria);
    casilla.disabled = procesandoLote || procesandoAccion || idEnEdicion != null;
    casilla.setAttribute("aria-label", "Seleccionar " + categoria.nombre);
    casilla.addEventListener("change", () => {
      if (casilla.checked) categoriasSeleccionadas.add(categoria.idCategoria);
      else categoriasSeleccionadas.delete(categoria.idCategoria);
      actualizarBarraLote();
    });
    etiqueta.append(casilla);
    return etiqueta;
  }

  function crearBotonPlegado(categoria, idListaHijas, expandido) {
    const boton = crearElemento("button", "panel-categoria-plegar");
    boton.type = "button";
    boton.disabled = procesandoLote || procesandoAccion || idEnEdicion != null;
    boton.setAttribute("aria-expanded", String(expandido));
    boton.setAttribute("aria-controls", idListaHijas);
    boton.setAttribute("aria-label", (expandido ? "Plegar" : "Desplegar") + " subcategorías de " + categoria.nombre);
    boton.addEventListener("click", () => {
      if (gruposPlegados.has(categoria.idCategoria)) gruposPlegados.delete(categoria.idCategoria);
      else gruposPlegados.add(categoria.idCategoria);
      renderizarLista();
      listaCategorias?.querySelector('[aria-controls="' + idListaHijas + '"]')?.focus();
    });
    return boton;
  }

  function crearFormularioEdicion(categoria, raices, totalSubcategorias) {
    const formulario = document.createElement("form");
    formulario.className = "panel-categoria-edicion";
    const entrada = crearElemento("input", "form-control form-control-sm");
    entrada.value = categoria.nombre;
    entrada.maxLength = 80;
    entrada.required = true;
    entrada.setAttribute("aria-label", "Nombre de categoría " + categoria.nombre);
    entrada.dataset.entradaCategoria = String(categoria.idCategoria);

    const selectorPadre = crearElemento("select", "form-select form-select-sm");
    selectorPadre.setAttribute("aria-label", "Categoría padre de " + categoria.nombre);
    poblarSelectPadre(selectorPadre, principalesDisponiblesPara(raices, categoria.idCategoria),
      categoria.categoriaPadreId, "Principal (sin padre)");
    if (totalSubcategorias > 0) {
      selectorPadre.disabled = true;
      selectorPadre.setAttribute("aria-describedby", "ayuda-padre-categoria-" + categoria.idCategoria);
    }

    const guardar = crearElemento("button", "btn btn-outline-primary btn-sm", "Guardar");
    guardar.type = "submit";
    guardar.setAttribute("aria-label", "Guardar cambios de " + categoria.nombre);
    const cancelar = crearElemento("button", "btn btn-outline-secondary btn-sm", "Cancelar");
    cancelar.type = "button";
    cancelar.setAttribute("aria-label", "Cancelar edición de " + categoria.nombre);

    if (totalSubcategorias > 0) {
      const ayuda = crearElemento("p", "panel-categoria-ayuda-edicion",
        "Esta categoría tiene subcategorías y debe permanecer como principal.");
      ayuda.id = "ayuda-padre-categoria-" + categoria.idCategoria;
      formulario.append(entrada, selectorPadre, guardar, cancelar, ayuda);
    } else {
      formulario.append(entrada, selectorPadre, guardar, cancelar);
    }

    cancelar.addEventListener("click", () => {
      idEnEdicion = null;
      renderizarLista();
      listaCategorias?.querySelector('[data-editar-categoria="' + categoria.idCategoria + '"]')?.focus();
    });

    formulario.addEventListener("submit", async (evento) => {
      evento.preventDefault();
      const nuevoNombre = entrada.value.trim();
      if (validarNombreCategoria(nuevoNombre)) {
        entrada.focus();
        return;
      }
      procesandoAccion = true;
      actualizarBarraLote();
      guardar.disabled = true;
      cancelar.disabled = true;
      let actualizado = false;
      try {
        await actualizarCategoria(apiRequest, categoria.idCategoria, nuevoNombre, leerPadreId(selectorPadre));
        actualizado = true;
        idEnEdicion = null;
        categoriasSeleccionadas.delete(categoria.idCategoria);
        notificar('Categoría actualizada: "' + nuevoNombre + '".', "exito");
        await notificarCambio();
      } catch (error) {
        mostrarError("No se pudo guardar la categoría", error);
        guardar.disabled = false;
        cancelar.disabled = false;
        entrada.focus();
      } finally {
        procesandoAccion = false;
        actualizarBarraLote();
        if (actualizado) {
          listaCategorias?.querySelector('[data-editar-categoria="' + categoria.idCategoria + '"]')?.focus();
        }
      }
    });
    return formulario;
  }

  function crearFilaCategoria(categoria, opciones) {
    const { esSubcategoria, totalSubcategorias, totalProductosRama, raices } = opciones;
    const idListaHijas = "panel-categoria-hijos-" + categoria.idCategoria;
    const fila = crearElemento(
      esSubcategoria ? "li" : "div",
      "panel-categoria-fila " + (esSubcategoria ? "panel-categoria-hija" : "panel-categoria-raiz"),
    );

    fila.append(crearCasillaSeleccion(categoria));
    if (!esSubcategoria && opciones.hijasVisiblesCount > 0) {
      const expandido = (entradaBusqueda?.value || "").trim() ? true : !gruposPlegados.has(categoria.idCategoria);
      fila.append(crearBotonPlegado(categoria, idListaHijas, expandido));
    } else {
      fila.append(crearElemento("span", "panel-categoria-espaciador"));
    }

    const contenido = crearElemento("div", "panel-categoria-contenido");
    const datos = crearElemento("div", "panel-categoria-datos");
    const nombre = crearElemento(esSubcategoria ? "span" : "h4", "panel-categoria-nombre", categoria.nombre);
    const estado = crearElemento(
      "span",
      "panel-categoria-estado " + (categoria.activa ? "panel-categoria-estado-activa" : "panel-categoria-estado-inactiva"),
      categoria.activa ? "Activa" : "Inactiva",
    );
    const contadores = crearElemento("div", "panel-categoria-contadores");
    if (!esSubcategoria && totalSubcategorias > 0) {
      contadores.append(crearElemento("span", "panel-categoria-contador", formatearContadorSubcategorias(totalSubcategorias)));
    }
    const totalProductos = esSubcategoria
      ? Number(categoria.totalProductos ?? 0)
      : Number(totalProductosRama ?? categoria.totalProductos ?? 0);
    contadores.append(crearElemento("span", "panel-categoria-contador", formatearContadorProductos(totalProductos)));

    datos.append(nombre, estado, contadores);
    contenido.append(datos);
    fila.append(contenido);

    if (idEnEdicion === categoria.idCategoria) {
      fila.append(crearFormularioEdicion(categoria, raices, totalSubcategorias));
      return fila;
    }

    const bloqueado = procesandoLote || procesandoAccion || idEnEdicion != null;
    const acciones = crearElemento("div", "panel-categoria-acciones");
    if (!esSubcategoria) {
      const agregarSub = crearElemento("button", "btn btn-outline-secondary btn-sm", "+ Subcategoría");
      agregarSub.type = "button";
      agregarSub.disabled = bloqueado;
      agregarSub.setAttribute("aria-label", "Agregar subcategoría en " + categoria.nombre);
      agregarSub.dataset.agregarSubcategoria = String(categoria.idCategoria);
      agregarSub.addEventListener("click", () => {
        if (selectPadreNuevo) selectPadreNuevo.value = String(categoria.idCategoria);
        mostrarErrorNombre("");
        formularioAlta?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
        entradaNombreNuevo?.focus();
      });
      acciones.append(agregarSub);
    }

    const editar = crearElemento("button", "btn btn-outline-primary btn-sm", "Editar");
    editar.type = "button";
    editar.disabled = bloqueado;
    editar.setAttribute("aria-label", "Editar " + categoria.nombre);
    editar.dataset.editarCategoria = String(categoria.idCategoria);
    editar.addEventListener("click", () => {
      if (procesandoLote || procesandoAccion || idEnEdicion != null) return;
      categoriasSeleccionadas.delete(categoria.idCategoria);
      idEnEdicion = categoria.idCategoria;
      renderizarLista();
      listaCategorias?.querySelector('[data-entrada-categoria="' + categoria.idCategoria + '"]')?.focus();
    });

    const cambiarEstado = crearElemento(
      "button",
      "btn btn-sm " + (categoria.activa ? "btn-outline-danger" : "btn-outline-success"),
      categoria.activa ? "Desactivar" : "Activar",
    );
    cambiarEstado.type = "button";
    cambiarEstado.disabled = bloqueado;
    cambiarEstado.setAttribute("aria-label", (categoria.activa ? "Desactivar " : "Activar ") + categoria.nombre);
    cambiarEstado.addEventListener("click", async () => {
      if (procesandoLote || procesandoAccion || idEnEdicion != null) return;
      if (categoria.activa) {
        const opcionesConfirmacion = construirConfirmacionDesactivacion([categoria], categoriasActuales);
        if (opcionesConfirmacion && !(await confirmar(opcionesConfirmacion))) return;
      }
      procesandoAccion = true;
      actualizarBarraLote();
      cambiarEstado.disabled = true;
      let cambiado = false;
      try {
        await cambiarEstadoCategoria(apiRequest, categoria.idCategoria, !categoria.activa);
        cambiado = true;
        notificar('Categoría "' + categoria.nombre + '" ' + (categoria.activa ? "desactivada" : "activada") + ".", "exito");
        await notificarCambio();
      } catch (error) {
        mostrarError("No se pudo cambiar el estado", error);
      } finally {
        procesandoAccion = false;
        actualizarBarraLote();
        if (!cambiado) cambiarEstado.disabled = false;
      }
    });
    acciones.append(editar, cambiarEstado);
    fila.append(acciones);
    return fila;
  }

  function renderizarLista() {
    if (!listaCategorias) return;
    const texto = entradaBusqueda?.value || "";
    const termino = texto.trim();
    const { raices } = construirJerarquiaCategorias(categoriasActuales);
    const resultado = filtrarArbolCategorias(categoriasActuales, { estado: estadoFiltro, texto });
    const fragmento = document.createDocumentFragment();

    idsVisibles = resultado.idsVisibles;
    gruposExpandiblesVisibles = resultado.grupos.filter((g) => g.hijas.length > 0).map((g) => g.raiz.idCategoria);
    if (estadoCategoria) estadoCategoria.className = "panel-categoria-ayuda mb-0";

    if (categoriasActuales.length === 0) {
      fragmento.append(crearMensajeVacio({
        icono: "📂",
        texto: "Aún no hay categorías. Crea la primera para organizar el catálogo.",
        textoBoton: "Crear primera categoría",
        alPulsar: () => entradaNombreNuevo?.focus(),
      }));
      if (estadoCategoria) estadoCategoria.textContent = "No hay categorías registradas.";
    } else if (resultado.grupos.length === 0) {
      fragmento.append(crearMensajeVacio({
        icono: "🔍",
        texto: "No hay categorías que coincidan con los filtros actuales.",
        textoBoton: "Limpiar filtros",
        alPulsar: limpiarFiltros,
      }));
      if (estadoCategoria) {
        estadoCategoria.textContent = categoriasActuales.length + " categorías registradas · 0 coincidencias";
      }
    } else {
      for (const grupoDatos of resultado.grupos) {
        const { raiz, hijas, totalSubcategorias, totalProductosRama } = grupoDatos;
        const grupo = crearElemento("li", "panel-categorias-grupo");
        grupo.append(crearFilaCategoria(raiz, {
          esSubcategoria: false,
          totalSubcategorias,
          totalProductosRama,
          hijasVisiblesCount: hijas.length,
          raices,
        }));

        if (hijas.length > 0) {
          const idListaHijas = "panel-categoria-hijos-" + raiz.idCategoria;
          const expandido = termino ? true : !gruposPlegados.has(raiz.idCategoria);
          const listaHijas = crearElemento("ul", "panel-categorias-hijas");
          listaHijas.id = idListaHijas;
          listaHijas.hidden = !expandido;
          listaHijas.setAttribute("aria-label", "Subcategorías de " + raiz.nombre);
          for (const hija of hijas) {
            listaHijas.append(crearFilaCategoria(hija, {
              esSubcategoria: true,
              totalSubcategorias: 0,
              hijasVisiblesCount: 0,
              raices,
            }));
          }
          grupo.append(listaHijas);
        }
        fragmento.append(grupo);
      }
      if (estadoCategoria) {
        const resumen = categoriasActuales.length + " categorías · " + resultado.totalPrincipales +
          " principales · " + resultado.totalSubcategorias + " subcategorías";
        estadoCategoria.textContent = resultado.hayFiltrosActivos
          ? resumen + " · " + resultado.filasVisibles + " visibles"
          : resumen;
      }
    }

    listaCategorias.replaceChildren(fragmento);
    actualizarBarraLote();
  }

  async function cargarCategorias() {
    if (promesaCategoriasEnCurso) return promesaCategoriasEnCurso;
    promesaCategoriasEnCurso = (async () => {
      if (estadoCategoria) estadoCategoria.textContent = "Cargando categorías...";
      if (botonReintentar) botonReintentar.disabled = true;
      if (categoriasActuales.length === 0 && listaCategorias) {
        listaCategorias.setAttribute("aria-busy", "true");
        listaCategorias.replaceChildren(crearSkeletonsLista(4));
      }
      try {
        const categorias = await listarCategoriasAdmin(apiRequest);
        categoriasActuales = categorias;
        const idsExistentes = new Set(categorias.map((c) => c.idCategoria));
        for (const id of categoriasSeleccionadas) {
          if (!idsExistentes.has(id)) categoriasSeleccionadas.delete(id);
        }
        const { raices } = construirJerarquiaCategorias(categorias);
        const padreActual = selectPadreNuevo?.value || "";
        poblarSelectPadre(selectPadreNuevo, raices, padreActual || null, "Ninguna (categoría principal)");
        if (botonReintentar) botonReintentar.hidden = true;
        renderizarLista();
      } catch {
        if (estadoCategoria) {
          mostrarEstado(estadoCategoria, "No se pudo cargar la lista. Comprueba la conexión y vuelve a intentarlo.", "danger");
        }
        if (botonReintentar) botonReintentar.hidden = false;
        if (categoriasActuales.length === 0 && listaCategorias) {
          listaCategorias.replaceChildren(crearMensajeVacio({
            icono: "⚠",
            texto: "No se pudieron cargar las categorías. Comprueba la conexión e inténtalo de nuevo.",
            textoBoton: "Reintentar",
            claseExtra: "panel-categorias-error",
            alPulsar: () => { void cargarCategorias(); },
          }));
        }
      } finally {
        if (listaCategorias) listaCategorias.setAttribute("aria-busy", "false");
        if (botonReintentar) botonReintentar.disabled = false;
        promesaCategoriasEnCurso = null;
      }
    })();
    return promesaCategoriasEnCurso;
  }

  async function notificarCambio() {
    await cargarCategorias();
    if (typeof alCambiarCategorias === "function") {
      try {
        await alCambiarCategorias();
      } catch (error) {
        console.error("No se pudo actualizar el resto del panel tras cambiar categorías.", error);
      }
    }
  }

  async function aplicarEstadoLote(activa) {
    if (procesandoLote || procesandoAccion || idEnEdicion != null) return;
    const elegidas = categoriasActuales.filter((c) => categoriasSeleccionadas.has(c.idCategoria));
    const pendientes = ordenarPorJerarquia(elegidas.filter((c) => Boolean(c.activa) !== activa), activa);
    if (pendientes.length === 0) {
      notificar("Las categorías seleccionadas ya tienen ese estado.", "info");
      return;
    }
    if (!activa) {
      const opcionesConfirmacion = construirConfirmacionDesactivacion(pendientes, categoriasActuales);
      if (opcionesConfirmacion && !(await confirmar(opcionesConfirmacion))) return;
    }

    procesandoLote = true;
    actualizarBarraLote();
    const exitosas = [];
    const fallidas = [];
    try {
      for (const categoria of pendientes) {
        try {
          await cambiarEstadoCategoria(apiRequest, categoria.idCategoria, activa);
          exitosas.push(categoria);
          categoriasSeleccionadas.delete(categoria.idCategoria);
        } catch (error) {
          fallidas.push({ categoria, error });
        }
      }
      if (exitosas.length > 0) await notificarCambio();
    } finally {
      procesandoLote = false;
      renderizarLista();
    }

    if (fallidas.length > 0) {
      const nombresFallidos = fallidas.slice(0, 3)
        .map((r) => r.categoria.nombre + ": " + (r.error?.message || "vuelve a intentarlo"))
        .join(" · ");
      const mensaje = "Se actualizaron " + exitosas.length + " de " + pendientes.length + " categorías. " +
        nombresFallidos + (fallidas.length > 3 ? " · y " + (fallidas.length - 3) + " más." : ".");
      notificar(mensaje, "error");
      if (estadoCategoria) mostrarEstado(estadoCategoria, mensaje, "warning");
    } else {
      notificar((activa ? "Se activaron " : "Se desactivaron ") + exitosas.length + " categorías.", "exito");
    }
  }

  grupoFiltroEstado?.addEventListener("click", (evento) => {
    const boton = evento.target.closest?.("[data-estado]");
    if (!boton || procesandoLote || procesandoAccion || idEnEdicion != null) return;
    estadoFiltro = boton.dataset.estado || ESTADOS_FILTRO_CATEGORIA.TODAS;
    renderizarLista();
  });

  entradaBusqueda?.addEventListener("input", renderizarLista);
  botonLimpiarBusqueda?.addEventListener("click", () => {
    if (!entradaBusqueda) return;
    entradaBusqueda.value = "";
    renderizarLista();
    entradaBusqueda.focus();
  });

  botonAlternarTodo?.addEventListener("click", () => {
    if (gruposExpandiblesVisibles.length === 0) return;
    const todosPlegados = gruposExpandiblesVisibles.every((id) => gruposPlegados.has(id));
    for (const id of gruposExpandiblesVisibles) {
      if (todosPlegados) gruposPlegados.delete(id);
      else gruposPlegados.add(id);
    }
    renderizarLista();
  });

  botonReintentar?.addEventListener("click", () => { void cargarCategorias(); });
  botonSeleccionarVisibles?.addEventListener("click", () => {
    const todasSeleccionadas = idsVisibles.length > 0 && idsVisibles.every((id) => categoriasSeleccionadas.has(id));
    for (const id of idsVisibles) {
      if (todasSeleccionadas) categoriasSeleccionadas.delete(id);
      else categoriasSeleccionadas.add(id);
    }
    renderizarLista();
  });
  botonActivarLote?.addEventListener("click", () => { void aplicarEstadoLote(true); });
  botonDesactivarLote?.addEventListener("click", () => { void aplicarEstadoLote(false); });

  entradaNombreNuevo?.addEventListener("input", () => mostrarErrorNombre(""));
  formularioAlta?.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    if (procesandoLote || procesandoAccion || idEnEdicion != null) return;

    const nombreCat = entradaNombreNuevo?.value?.trim() || "";
    const errorValidacion = validarNombreCategoria(nombreCat);
    if (errorValidacion) {
      mostrarErrorNombre(errorValidacion);
      entradaNombreNuevo?.focus();
      return;
    }
    mostrarErrorNombre("");

    const boton = formularioAlta.querySelector('button[type="submit"]');
    const textoOriginal = boton?.textContent || "Crear categoría";
    procesandoAccion = true;
    actualizarBarraLote();
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Creando...";
    }
    formularioAlta.setAttribute("aria-busy", "true");
    try {
      const padreId = leerPadreId(selectPadreNuevo);
      await crearCategoria(apiRequest, nombreCat, padreId);
      formularioAlta.reset();
      notificar(padreId != null
        ? 'Subcategoría "' + nombreCat + '" creada con éxito.'
        : 'Categoría "' + nombreCat + '" creada con éxito.', "exito");
      await notificarCambio();
    } catch (error) {
      mostrarError("No se pudo crear la categoría", error);
      mostrarErrorNombre(error?.message || "No se pudo crear la categoría.");
    } finally {
      procesandoAccion = false;
      formularioAlta.removeAttribute("aria-busy");
      actualizarBarraLote();
      if (boton) {
        boton.disabled = false;
        boton.textContent = textoOriginal;
      }
      entradaNombreNuevo?.focus();
    }
  });

  return { cargarCategorias };
}
